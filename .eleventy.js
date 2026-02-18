const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Pass through assets copied by CI, and css
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy({
    "2026": "assets/2026"
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

  // Filter: build asset URL from engagement path + relative asset path
  eleventyConfig.addFilter("assetUrl", (engagement, assetPath) => {
    if (!assetPath) return null;
    const filename = path.basename(assetPath);
    return `/assets/${engagement.year}/${engagement.term}/${engagement.venue}/assets/${filename}`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    pathPrefix: "/portfolio/"
  };
};
