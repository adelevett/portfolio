/**
 * npm run test:vl
 *
 * Smoke-tests the HF router VL model with a public image URL and prints
 * the full response structure so we can verify the model supports vision
 * and understand the shape of choices[0].message before the pipeline relies on it.
 */

import "dotenv/config";
import { OpenAI } from "openai";

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

async function call(label, messages, systemPrompt) {
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

// Test 2: JSON response — mirrors exactly what generate.mjs asks for
await call(
  "JSON response — mirrors generate.mjs prompt",
  [{
    role: "user",
    content: [
      { type: "text", text: `Talk: "Test Talk" — Test Event\n\nHere is 1 slide:` },
      { type: "text", text: "Slide 1:" },
      { type: "image_url", image_url: { url: IMAGE_URL } },
    ],
  }],
  `You are helping build a professional portfolio for an accessibility educator.
You will be shown all slides from a presentation deck. Your task:
1. Choose 1 slide that best illustrates the talk's key ideas for a portfolio reader.
2. For each chosen slide, write a 2–3 sentence note explaining what it shows and why it matters.
Respond ONLY with a valid JSON array, no markdown fences, no explanation. Format:
[{"page": <1-based page number>, "note": "<your note>"}]`
);
