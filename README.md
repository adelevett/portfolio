# Alexis Delevett — Professional Portfolio

Eleventy portfolio for Adapted Technology work at College of San Mateo.

## Browse

- Home — welcome and section links
- About — role, philosophy, CV, self-assessment
- Student Support — adapted technology, alternate media
- Faculty Partnership — accessibility reviews and consults
- Workshops & Presentations — engagement archive
- Service — committees and collaboration
- Professional Learning — conferences and inquiry

## Add a page

Create a Markdown file in `src/sections/{section}/` with `title`, `section`, and `order` in the front matter. It appears in the nav dropdown automatically.

Add a presentation by placing `{year}/{term}/{venue}/engagement.json` at the repo root. Any PDF in that folder becomes the download.

## Preview

```bash
npm install
npm start
```

Site: `http://localhost:8080/portfolio/`

## Privacy

`out.csv` and `CONTENT-INVENTORY.md` are private working notes. Do not publish student names, IDs, emails, or phone numbers.
