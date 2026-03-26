/**
 * npm run test:vl
 *
 * Smoke-tests the HF router VL model with a public image URL and prints
 * the full response structure so we can verify the model supports vision
 * and understand the shape of choices[0].message before the pipeline relies on it.
 */

import "dotenv/config";
import fs from "fs";
import { OpenAI } from "openai";
import path from "path";

const FEATURE_NOTE_STYLE_EXAMPLES = [
  "Otter provides structured notes automatically, but structure alone is insufficient for durable learning. This slide frames the three evidence-based principles — active recall, spaced retrieval, and conceptual depth — that the rest of the session's workflows are designed to layer on top of what Otter already produces.",
  "The direction of the arrow matters. PDF starts from a visual intention and optionally layers meaning on top — remediation as an afterthought. ePub inverts this: semantic structure comes first and display is derived from it. This distinction shapes every workflow decision that follows.",
  "The trend across every modality — language, vision, audio — is that the smallest model capable of a given task keeps shrinking in size and associated resource demand. That compression suggests offline assistive technology uses will continue to emerge and promote new forms of access outside of established patterns of the past and present.",
];

const STYLE_BANNED_PHRASES = [
  "this slide shows",
  "this slide defines",
  "here, the presenter",
  "the presenter compares",
  "the final content slide",
];

const ROOT = path.resolve(import.meta.dirname, "..");
const GROUNDED_TEST_CASE = {
  title: "Otter Power-Ups: Discover Workflows for Effective Study Notes",
  event: "DRC Student Workshop",
  imagePath: path.join(ROOT, "2025/Fall/DRC/assets/evidence_based.png"),
  expectedKeywords: ["otter", "notes", "recall", "retrieval", "learning", "conceptual"],
  minKeywordMatches: 2,
};

function buildFeaturedSlidesPrompt(maxFeatured) {
  return `You are helping build a professional portfolio for an accessibility educator.
You will be shown all slides from a presentation deck. Your task:
1. Choose ${maxFeatured} slide${maxFeatured === 1 ? "" : "s"} that best illustrate the talk's key ideas for a portfolio reader.
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
}

function countSentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) ?? []).length;
}

function toDataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
  const mime = ext === "jpg" ? "jpeg" : ext;
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/${mime};base64,${b64}`;
}

function analyzeFeaturedNote(note, expectations = {}) {
  const lowered = note.toLowerCase();
  const bannedMatches = STYLE_BANNED_PHRASES.filter((phrase) => lowered.includes(phrase));
  const sentenceCount = countSentences(note);
  const keywordMatches = (expectations.expectedKeywords ?? []).filter((keyword) => lowered.includes(keyword));

  return {
    sentenceCount,
    bannedMatches,
    keywordMatches,
  };
}

if (!process.env.HF_TOKEN) {
  console.error("❌  HF_TOKEN is not set. Add it to .env and try again.");
  process.exit(1);
}

const MODEL = process.argv[2] ?? "Qwen/Qwen3.5-35B-A3B";
const IMAGE_URL =
  "https://cdn.britannica.com/61/93061-050-99147DCE/Statue-of-Liberty-Island-New-York-Bay.jpg";

console.log(`Model : ${MODEL}`);
console.log(`Image : ${IMAGE_URL}`);
console.log("─".repeat(60));

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

async function call(label, messages, systemPrompt, expectations) {
  console.log(`\n${"─".repeat(60)}\nTest: ${label}\n${"─".repeat(60)}`);
  try {
    const msgs = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      top_p: 0.8,
      presence_penalty: 1.5,
      max_tokens: 32768,
      extra_body: {
        top_k: 20,
        chat_template_kwargs: { enable_thinking: false },
      },
      messages: msgs,
    });
    const msg = response.choices?.[0]?.message;
    console.log("content:", msg?.content ?? "(empty)");

    // If we asked for JSON, try parsing it
    if (systemPrompt?.includes("JSON")) {
      const raw = msg?.content?.trim() ?? "";
      const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(json);
        console.log("✅  parsed JSON:", JSON.stringify(parsed, null, 2));

        if (Array.isArray(parsed) && parsed[0]?.note) {
          const analysis = analyzeFeaturedNote(parsed[0].note, expectations);
          console.log(`style check: ${analysis.sentenceCount} sentence(s)`);

          if (analysis.sentenceCount !== 2) {
            console.log("⚠️  expected 2 sentences for house style");
          }

          if (analysis.bannedMatches.length) {
            console.log("⚠️  banned scaffolding phrase(s):", analysis.bannedMatches.join(", "));
          } else {
            console.log("✅  no banned scaffolding phrases detected");
          }

          if (expectations?.expectedKeywords?.length) {
            console.log(`grounding check: ${analysis.keywordMatches.length} keyword match(es)`);

            if (analysis.keywordMatches.length < (expectations.minKeywordMatches ?? 1)) {
              console.log("⚠️  note may not be grounded in the slide content");
              console.log("    expected some of:", expectations.expectedKeywords.join(", "));
            } else {
              console.log("✅  topical keyword overlap detected:", analysis.keywordMatches.join(", "));
            }
          }
        }
      } catch {
        console.log("❌  not valid JSON — raw content above");
      }
    }
    return msg;
  } catch (err) {
    console.error("❌  API call failed:", err.message);
    if (err.response) console.error("HTTP", err.response.status, JSON.stringify(err.response.data));
    return null;
  }
}

// Test 1: plain text (sanity check that vision works)
await call(
  "Plain text — sanity check",
  [{
    role: "user",
    content: [
      { type: "text", text: "Describe this image in one sentence." },
      { type: "image_url", image_url: { url: IMAGE_URL } },
    ],
  }]
);

// Test 2: JSON response — grounded portfolio example from the repo
await call(
  "JSON response — grounded portfolio example",
  [{
    role: "user",
    content: [
      { type: "text", text: `Talk: "${GROUNDED_TEST_CASE.title}" — ${GROUNDED_TEST_CASE.event}\n\nHere is 1 slide:` },
      { type: "text", text: "Slide 1:" },
      { type: "image_url", image_url: { url: toDataUrl(GROUNDED_TEST_CASE.imagePath) } },
    ],
  }],
  buildFeaturedSlidesPrompt(1),
  {
    expectedKeywords: GROUNDED_TEST_CASE.expectedKeywords,
    minKeywordMatches: GROUNDED_TEST_CASE.minKeywordMatches,
  }
);
