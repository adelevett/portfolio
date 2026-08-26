module.exports = {
  layout: "page.njk",
  eleventyComputed: {
    // Landing pages (index.md) live at /{section}/, subpages at /{section}/{slug}/.
    // Eleventy 3 gives index.md a fileSlug of its parent folder, so detect the
    // landing via filePathStem instead.
    permalink: (data) =>
      data.page.filePathStem.endsWith("/index")
        ? `/${data.section}/`
        : `/${data.section}/${data.page.fileSlug}/`
  }
};
