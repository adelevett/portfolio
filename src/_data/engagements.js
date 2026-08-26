const fs = require("fs");
const path = require("path");

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === "string" ? item.trim() : String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

module.exports = async function () {
  // Walk the repo root looking for engagement.json files
  // Expected path: {year}/{Term}/{VENUE}/engagement.json
  const engagements = [];
  const root = path.resolve(__dirname, "../..");  // repo root

  function walk(dir, depth = 0) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "_site" || entry.name === "src") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.name === "engagement.json") {
        try {
          const data = JSON.parse(fs.readFileSync(full, "utf8"));
          // Derive slug for URL: year/term/venue (lowercased)
          const rel = path.relative(root, path.dirname(full));
          const parts = rel.split(path.sep); // [year, Term, VENUE]
          data.slug = parts.map(p => p.toLowerCase()).join("/");
          data.year = data.year || parts[0];
          data.term = data.term || parts[1];
          data.venue = data.venue || parts[2];
          data.collaborators = normalizeStringList(data.collaborators);
          // Any PDF sitting next to engagement.json counts as a downloadable
          // deck, whatever it is named.
          const dirFiles = fs.readdirSync(path.dirname(full));
          data.pdfFile = dirFiles.find(f => f.toLowerCase().endsWith(".pdf")) || null;
          engagements.push(data);
        } catch {
          // Skip unreadable engagement.json files during discovery.
        }
      }
    }
  }

  walk(root);
  // Sort newest first
  engagements.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return engagements;
};
