const fs = require("fs");
const path = require("path");

module.exports = async function () {
  // Walk the repo root looking for engagement.json files
  // Expected path: {year}/{Term}/{VENUE}/engagement.json
  const engagements = [];
  const root = path.join(__dirname, "../../..");  // repo root

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
          data.year  = data.year  || parts[0];
          data.term  = data.term  || parts[1];
          data.venue = data.venue || parts[2];
          engagements.push(data);
        } catch (e) {
          console.warn("Could not parse", full, e.message);
        }
      }
    }
  }

  walk(root);
  // Sort newest first
  engagements.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return engagements;
};
