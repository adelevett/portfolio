const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Pass through CSS
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img");

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

  // Collection: section content pages (src/sections/**/*.md), grouped by
  // their `section` front matter and sorted by `order`. Drives nav dropdowns,
  // section landing page listings, and the home page section cards.
  eleventyConfig.addCollection("sectionPages", function (collectionApi) {
    const grouped = {};
    collectionApi.getFilteredByGlob("src/sections/**/*.md")
      .filter(p => p.data.section)
      .sort((a, b) =>
        (a.data.order ?? 99) - (b.data.order ?? 99) ||
        (a.data.title || "").localeCompare(b.data.title || "")
      )
      .forEach(p => {
        (grouped[p.data.section] = grouped[p.data.section] || []).push(p);
      });
    return grouped;
  });

  // Markdown links are written from the site root (`/presentations/`).
  // Nunjucks already runs those through the `url` filter; markdown does not,
  // so on GitHub Pages they skip the `/portfolio/` prefix.
  eleventyConfig.amendLibrary("md", (mdLib) => {
    const url = eleventyConfig.getFilter("url");
    const prefix = url("/");
    const render =
      mdLib.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    mdLib.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex("href");
      if (hrefIndex >= 0) {
        const href = token.attrs[hrefIndex][1];
        const alreadyPrefixed =
          href === prefix.replace(/\/$/, "") || href.startsWith(prefix);
        if (href.startsWith("/") && !href.startsWith("//") && !alreadyPrefixed) {
          token.attrs[hrefIndex][1] = url(href);
        }
      }
      return render(tokens, idx, options, env, self);
    };
  });

  // Add a "back to top" link inside every anchored <h2> so long section
  // pages let readers jump back to the page-level table of contents.
  eleventyConfig.addTransform("backToTopLinks", (content) => {
    if (!content.includes('<h2 id="')) return content;
    return content.replace(
      /(<h2 id="[^"]*">)([\s\S]*?)(<\/h2>)/g,
      (_m, open, inner, close) =>
        `${open}${inner}<a class="back-to-top" href="#page-top" aria-label="Back to top">&#8593; Top</a>${close}`
    );
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
