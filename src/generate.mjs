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
 *   5. Backfill missing #feature("...") tags into slides.typ for the selected slides
 *
 * npm run generate:sync-features
 *
 * For every slides.typ with a sibling engagement.json:
 *   1. Read featured_slides from engagement.json
 *   2. Insert missing #feature("...") tags into matching #slide[] blocks
 *   3. Refuse to edit decks that appear to use incremental / multi-page slides
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
const ARGS = new Set(process.argv.slice(2));
const SYNC_FEATURES = ARGS.has("--sync-features");

const FEATURE_NOTE_STYLE_EXAMPLES = [
  "Otter provides structured notes automatically, but structure alone is insufficient for durable learning. This slide frames the three evidence-based principles — active recall, spaced retrieval, and conceptual depth — that the rest of the session's workflows are designed to layer on top of what Otter already produces.",
  "PDF is fundamentally a visual presentation format with reading order and semantic structure as a parallel component managed in the PDF authoring suite. In ePub, reading order and semantic markup directly determine visual display resulting in alt media workflows focused on verifying and manipulating plain text source files rather than GUI elements using point and click.",
  "The trend across every modality — language, vision, audio — is that the smallest model capable of a given task keeps shrinking in size and associated resource demand. That compression suggests offline assistive technology uses will continue to emerge and promote new forms of access.",
];

const RISKY_SYNC_PATTERNS = [
  /#pause\b/,
  /#uncover\b/,
  /#only\(/,
  /#alternatives\b/,
  /#one-by-one\b/,
  /#pdfpc\b/,
  /#next-slide\b/,
];

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
let client = null;

function getClient() {
  if (client) return client;
  if (!process.env.HF_TOKEN) {
    throw new Error("HF_TOKEN is not set. Add it to .env and try again.");
  }

  client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN,
  });
  return client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(cmd, cwd = ROOT) {
  return spawnSync(cmd, { shell: true, cwd, encoding: "utf8" });
}

function toDataUrl(filePath) {
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${b64}`;
}

function walkSlides(dir, visit, depth = 0) {
  if (depth > 4) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const e of entries) {
    if (e.name.startsWith(".") || ["node_modules", "_site", "src"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkSlides(full, visit, depth + 1);
    } else if (e.name === "slides.typ") {
      visit(full);
    }
  }
}

/** Find every slides.typ that is missing a sibling engagement.json */
function findGenerationTargets() {
  const targets = [];
  walkSlides(ROOT, (full) => {
    const engPath = path.join(path.dirname(full), "engagement.json");
    if (!fs.existsSync(engPath)) {
      targets.push(full);
    }
  });
  return targets;
}

/** Find every slides.typ that has a sibling engagement.json */
function findSyncTargets() {
  const targets = [];
  walkSlides(ROOT, (full) => {
    const engPath = path.join(path.dirname(full), "engagement.json");
    if (fs.existsSync(engPath)) {
      targets.push(full);
    }
  });
  return targets;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeTypstString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n");
}

function findMatchingBracket(source, openIndex) {
  let depth = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findSlideBlocks(source) {
  const blocks = [];
  const slidePattern = /^([ \t]*)#slide\[/gm;
  let match;

  while ((match = slidePattern.exec(source)) !== null) {
    const start = match.index + match[1].length;
    const openBracket = source.indexOf("[", start);
    const end = findMatchingBracket(source, openBracket);
    if (end === -1) {
      throw new Error(`Could not find the end of #slide[] block near offset ${start}`);
    }

    blocks.push({
      start,
      end,
      indent: match[1],
      bodyIndent: match[1] + "  ",
    });
  }

  return blocks;
}

function syncFeaturesFromEngagementJson(typFile) {
  const dir = path.dirname(typFile);
  const engPath = path.join(dir, "engagement.json");
  const source = fs.readFileSync(typFile, "utf8");
  const riskyPattern = RISKY_SYNC_PATTERNS.find((pattern) => pattern.test(source));
  if (riskyPattern) {
    throw new Error(`Refusing sync because deck contains ${riskyPattern}`);
  }

  const engagement = readJson(engPath);
  const featuredSlides = Array.isArray(engagement.featured_slides)
    ? engagement.featured_slides.filter((slide) => Number.isInteger(slide.page) && typeof slide.note === "string" && slide.note.trim())
    : [];

  if (featuredSlides.length === 0) {
    return { inserted: 0, skipped: 0, reason: "no featured_slides" };
  }

  const slides = findSlideBlocks(source);
  const seenPages = new Set();
  const syncableSlides = featuredSlides
    .filter((slide) => {
      if (seenPages.has(slide.page)) return false;
      seenPages.add(slide.page);
      return true;
    })
    .sort((left, right) => right.page - left.page);

  for (const slide of syncableSlides) {
    if (slide.page < 1 || slide.page > slides.length) {
      throw new Error(`Featured slide page ${slide.page} is outside the deck range (${slides.length} slides)`);
    }
  }

  let nextSource = source;
  let inserted = 0;
  let skipped = 0;

  for (const featured of syncableSlides) {
    const block = slides[featured.page - 1];
    const blockText = nextSource.slice(block.start, block.end + 1);
    if (/#feature\(/.test(blockText)) {
      skipped += 1;
      continue;
    }

    const escapedNote = escapeTypstString(featured.note.trim());
    const needsLeadingNewline = !nextSource.slice(0, block.end).endsWith("\n");
    const insertion = `${needsLeadingNewline ? "\n" : ""}${block.bodyIndent}#feature("${escapedNote}")\n`;
    nextSource = nextSource.slice(0, block.end) + insertion + nextSource.slice(block.end);
    inserted += 1;
  }

  if (inserted > 0) {
    fs.writeFileSync(typFile, nextSource);
  }

  return { inserted, skipped, reason: inserted === 0 ? "already synced" : null };
}

function logSyncResult(result) {
  if (result.inserted > 0) {
    console.log(`  ✓ inserted ${result.inserted} #feature tag(s)${result.skipped ? `, skipped ${result.skipped} existing` : ""}`);
  } else {
    console.log(`  ✓ skipped — ${result.reason}${result.skipped ? ` (${result.skipped} already present)` : ""}`);
  }
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
2. For each chosen slide, write a 2-sentence note explaining the core idea and why it matters.

Write in this house style:
- Use a professional, analytical portfolio voice.
- Lead with the concept, tension, or mechanism on the slide, not with scene-setting.
- Be specific about the workflow, accessibility issue, or pedagogical point.
- Prefer concrete domain terms from the slide over generic language.
- The second sentence should extend the interpretation or implication, not repeat the first.
- Avoid boilerplate such as "This slide shows", "Here, the presenter", "the final content slide", or generic praise.
- Do not address the reader directly.
- Do not speculate about intent unless it is strongly supported by the slide.

Voice examples:
${FEATURE_NOTE_STYLE_EXAMPLES.map((example, index) => `${index + 1}. ${example}`).join("\n")}

Respond ONLY with a valid JSON array, no markdown fences, no explanation. Format:
[{"page": <1-based page number>, "note": "<your note>"}]`;

  const response = await getClient().chat.completions.create({
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
if (SYNC_FEATURES) {
  const targets = findSyncTargets();
  if (targets.length === 0) {
    console.log("✅  No engagement.json files found — nothing to sync.");
    process.exit(0);
  }

  console.log(`Found ${targets.length} engagement(s) with engagement.json:\n`);
  targets.forEach(t => console.log("  •", path.relative(ROOT, t)));
  console.log();

  for (const typFile of targets) {
    const rel = path.relative(ROOT, typFile);
    console.log(`Syncing ${rel} …`);

    try {
      const result = syncFeaturesFromEngagementJson(typFile);
      logSyncResult(result);
      console.log();
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}\n`);
    }
  }

  console.log("Done. Review updated slides.typ files before committing.");
  process.exit(0);
}

const targets = findGenerationTargets();
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
    console.log(`  ✓ wrote ${path.relative(ROOT, outPath)}`);

    // 7. Backfill missing #feature() tags into the source deck immediately.
    const syncResult = syncFeaturesFromEngagementJson(typFile);
    logSyncResult(syncResult);
    console.log();

  } catch (err) {
    console.error(`  ✗ failed: ${err.message}\n`);
  }
}

console.log("Done. Review generated engagement.json files before committing.");
