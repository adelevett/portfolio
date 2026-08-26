---
name: anti-slop
description: >-
  Catch AI design and prose tells on this portfolio. Use when editing UI, CSS,
  Nunjucks templates, landing copy, heroes, CTAs, or when asked to lint for
  AI backlash / slop / generic-looking design.
---

# Anti-slop gate for this portfolio

Deterministic tools only. Scores measure style tells, not authorship. Do not claim something "was written by AI."

## When to run

Before finishing any change that touches visual design or public copy:

1. Design / CSS / layout / templates
2. Hero, headline, subhead, CTA, about/work blurbs
3. Explicit user asks to audit for AI look/feel

## Design half — prefer MCP, fall back to CLI

**MCP (`ux-skill`):** call `ux_lint` on changed paths. Optionally `ux_recommend` before greenfield UI.

**CLI fallback** (same engine):

```bash
.tools/venv/bin/uxskill lint src --threshold medium
.tools/venv/bin/uxskill lint src --score-only
```

Target: score ≥ 90, no Critical/High findings left unfixed unless the user accepts them.

Also run Impeccable's detector when available (nested cards, icon-tile-above-heading, purple/violet gradients, Inter-as-display):

```bash
npx -y impeccable@3.6.0 detect src/
```

Impeccable is a CLI/skill pack, not an MCP. If Cursor skills were installed via `npx impeccable install`, follow `/impeccable critique` / `/impeccable polish` for taste passes after the deterministic scan.

## Prose half — MCP `ai-slop-checker`

1. `check_ai_slop` on body copy (~200+ chars for a stable read)
2. `grade_landing_copy` on every hero (headline, subhead, cta)
3. `get_slop_stats` when you need to say whether a landing score is actually good (median of 239 real pages ≈ 79)

Aim for landing hero ≥ median and body copy free of the named tells the tool returns. Apply its concrete fixes; do not invent new "AI detector" claims.

## Hard tells to refuse even without tools

Matches existing user design rules and common detectors:

- Purple-to-blue / purple-to-indigo gradients; Inter/Roboto/Arial as display
- Three equal feature cards; cards nested in cards; rounded icon tile above a heading
- Bounce/elastic CTA arrows; default 300ms everything; "John Doe" testimonials
- Em-dash piles, delve-class vocab, "it's not X, it's Y" contrast-reframes, hype verbs (revolutionize / seamless / unlock)

## Honesty

Wikipedia's *Signs of AI writing* and these scorers are pattern catalogs. No single hit proves authorship; automated detectors falsely flag many human writers. Treat output as edit guidance only.

## Out of scope here

There is no one-click Claude.ai connector for these. The combined "anti-slop" mcp.directory skill is not a drop-in Cursor MCP — this project wires the real stdio servers plus CLI detectors instead.
