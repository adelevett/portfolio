const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Pass through CSS
  eleventyConfig.addPassthroughCopy("src/css");

  // Auto-discover all year folders (2024/, 2025/, 2026/ etc.)
  fs.readdirSync(path.resolve("."))
    .filter(f => /^\d{4}$/.test(f) && fs.statSync(path.resolve(f)).isDirectory())
    .forEach(year => {
      eleventyConfig.addPassthroughCopy({ [year]: "assets/" + year });
    });

  // Filter: format date string nicely
  eleventyConfig.addFilter("niceDate", (dateStr) => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-AU", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    });
  });

  // Filter: group engagements by year then term
  eleventyConfig.addFilter("groupByYearTerm", (engagements) => {
    const grouped = {};
    for (const e of engagements) {
      const y = e.year;
      const t = e.term;
      if (!grouped[y]) grouped[y] = {};
      if (!grouped[y][t]) grouped[y][t] = [];
      grouped[y][t].push(e);
    }
    return grouped;
  });

  // Filter: build asset URL
  // assetPath is relative to the engagement folder e.g. "assets/foo.png" or "slides/page-03.png"
  eleventyConfig.addFilter("assetUrl", (engagement, assetPath) => {
    if (!assetPath) return null;
    return "/assets/" + engagement.year + "/" + engagement.term + "/" + engagement.venue + "/" + assetPath;
  });

  return {
    pathPrefix: "/portfolio/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};