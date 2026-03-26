#!/usr/bin/env node
/**
 * npm run generate
 *
 * For every slides.typ that lacks a committed engagement.json:
 *   1. Extract engagement metadata via typst query
 *   2. Compile PDF + rasterise all pages via pdftoppm
 *   3. Send all page PNGs to a VL model (HF router) asking it to pick
 *      2–3 featured slides and write portfolio notes
 *   4. Write engagement.json locally for author review before committing
 *
 * Requires: typst, pdftoppm (poppler), HF_TOKEN in .env
 */

import "dotenv/config";
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

const ROOT = path.resolve(import.meta.dirname, "..");
const VL_MODEL = "Qwen/Qwen3.5-35B-A3B";
const MAX_FEATURED = 3;

// Sampling params: instruct (non-thinking) mode for general tasks
const SAMPLING = {
  temperature: 0.7,
  top_p: 0.8,
  presence_penalty: 1.5,
  max_tokens: 32768,
  extra_body: {
    top_k: 20,
    chat_template_kwargs: { enable_thinking: false },
  },
};

// ── HF client ────────────────────────────────────────────────────────────────
if (!process.env.HF_TOKEN) {
  console.error("❌  HF_TOKEN is not set. Add it to .env and try again.");
  process.exit(1);
}
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(cmd, cwd = ROOT) {
  return spawnSync(cmd, { shell: true, cwd, encoding: "utf8" });
}

function toDataUrl(filePath) {
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${b64}`;
}

/** Find every slides.typ that is missing a sibling engagement.json */
function findTargets() {
  const targets = [];
  function walk(dir, depth = 0) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") || ["node_modules", "_site", "src"].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
      } else if (e.name === "slides.typ") {
        const engPath = path.join(path.dirname(full), "engagement.json");
        if (!fs.existsSync(engPath)) {
          targets.push(full);
        }
      }
    }
  }
  walk(ROOT);
  return targets;
}

/** Run typst query and return parsed value array */
function typstQuery(typFile, label) {
  const r = run(`typst query "${typFile}" "${label}" --field value`);
  if (r.status !== 0) throw new Error(r.stderr.trim());
  return JSON.parse(r.stdout);
}

/** Compile PDF and rasterise all pages; returns sorted list of PNG paths */
function rasterise(typFile, dir) {
  const pdfPath = path.join(dir, "slides.pdf");
  const slidesDir = path.join(dir, "slides");
  fs.mkdirSync(slidesDir, { recursive: true });

  // compile
  const comp = run(`typst compile "${typFile}" "${pdfPath}"`);
  if (comp.status !== 0) throw new Error(`typst compile failed:\n${comp.stderr}`);

  // get page count from pdfinfo
  const info = run(`pdfinfo "${pdfPath}"`);
  const match = info.stdout.match(/Pages:\s+(\d+)/);
  const pageCount = match ? parseInt(match[1]) : 0;
  if (pageCount === 0) throw new Error("Could not determine page count");

  // rasterise all pages
  const r = run(`pdftoppm -r 100 -png "${pdfPath}" "${path.join(slidesDir, "page")}"`);
  if (r.status !== 0) throw new Error(`pdftoppm failed:\n${r.stderr}`);

  return fs.readdirSync(slidesDir)
    .filter(f => f.endsWith(".png"))
    .sort()
    .map(f => path.join(slidesDir, f));
}

/** Ask VL model to select featured slides and write notes */
async function generateFeaturedSlides(meta, pngPaths) {
  // Build multi-image message: all slides as base64 data URLs
  const imageContent = pngPaths.map((p, i) => ([
    {
      type: "text",
      text: `Slide ${i + 1}:`,
    },
    {
      type: "image_url",
      image_url: { url: toDataUrl(p) },
    },
  ])).flat();

  const systemPrompt = `You are helping build a professional portfolio for an accessibility educator.
You will be shown all slides from a presentation deck. Your task:
1. Choose ${MAX_FEATURED} slides that best illustrate the talk's key ideas for a portfolio reader.
2. For each chosen slide, write a 2–3 sentence note explaining what it shows and why it matters.
Respond ONLY with a valid JSON array, no markdown fences, no explanation. Format:
[{"page": <1-based page number>, "note": "<your note>"}]`;

  const response = await client.chat.completions.create({
    model: VL_MODEL,
    ...SAMPLING,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Talk: "${meta.title}" — ${meta.event}\n\nHere are all ${pngPaths.length} slides:`,
          },
          ...imageContent,
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  // Strip markdown fences if the model added them anyway
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json);
}

/** Match a page number to a rasterised PNG (pdftoppm zero-pads filenames) */
function matchPng(pngPaths, page) {
  const p = String(page);
  return pngPaths.find(f =>
    f.endsWith(`-${p.padStart(6, "0")}.png`) ||
    f.endsWith(`-${p.padStart(2, "0")}.png`) ||
    f.endsWith(`-${p}.png`)
  ) ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targets = findTargets();
if (targets.length === 0) {
  console.log("✅  All engagements already have engagement.json — nothing to do.");
  process.exit(0);
}

console.log(`Found ${targets.length} engagement(s) without engagement.json:\n`);
targets.forEach(t => console.log("  •", path.relative(ROOT, t)));
console.log();

for (const typFile of targets) {
  const dir = path.dirname(typFile);
  const rel = path.relative(ROOT, typFile);
  console.log(`Processing ${rel} …`);

  try {
    // 1. Extract engagement metadata
    const metaArr = typstQuery(typFile, "<engagement>");
    if (!metaArr.length) throw new Error("No <engagement> metadata found in slides.typ");
    const meta = metaArr[0];

    // Derive year/term/venue from path if absent (matches engagements.js logic)
    const parts = path.relative(ROOT, dir).split(path.sep); // [year, Term, VENUE]
    meta.year  = meta.year  || parts[0];
    meta.term  = meta.term  || parts[1];
    meta.venue = meta.venue || parts[2];

    console.log(`  ✓ metadata — ${meta.title}`);

    // 2. Compile + rasterise
    const pngPaths = rasterise(typFile, dir);
    console.log(`  ✓ rasterised ${pngPaths.length} pages`);

    // 3. Call VL model
    console.log(`  … calling ${VL_MODEL} to select featured slides`);
    const featured = await generateFeaturedSlides(meta, pngPaths);
    console.log(`  ✓ model selected ${featured.length} featured slide(s)`);

    // 4. Attach image paths to featured slides
    for (const slide of featured) {
      const png = matchPng(pngPaths, slide.page);
      slide.image = png ? "slides/" + path.basename(png) : null;
    }

    // 5. Also extract any hand-authored #feature() entries and merge
    //    (hand-authored takes precedence over AI for the same page)
    let handFeatured = [];
    try {
      handFeatured = typstQuery(typFile, "<featured-slide>");
    } catch { /* none present */ }

    const handPages = new Set(handFeatured.map(s => s.page));
    const aiOnly = featured.filter(s => !handPages.has(s.page));
    const merged = [
      ...handFeatured.map(s => ({
        page: s.page,
        note: s.note,
        image: matchPng(pngPaths, s.page)
          ? "slides/" + path.basename(matchPng(pngPaths, s.page))
          : null,
      })),
      ...aiOnly,
    ].sort((a, b) => a.page - b.page);

    // 6. Write engagement.json
    meta.featured_slides = merged;
    const outPath = path.join(dir, "engagement.json");
    fs.writeFileSync(outPath, JSON.stringify(meta, null, 2) + "\n");
    console.log(`  ✓ wrote ${path.relative(ROOT, outPath)}\n`);

  } catch (err) {
    console.error(`  ✗ failed: ${err.message}\n`);
  }
}

console.log("Done. Review generated engagement.json files before committing.");
