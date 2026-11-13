# Image Converter Pro

Private, browser-local image conversion and batch export built by [Oathan Rex](https://oathanrex.github.io).

## Features

- **100% browser-local processing**: Converts, resizes, adjusts colors, and packages files using the HTML5 Canvas API with zero server uploads.
- **Supported formats**: Open `JPG`, `PNG`, `WEBP`, `GIF` (first frame), `BMP`, and `SVG`. Export to `JPG`, `PNG`, `WEBP`, `GIF` (static), `BMP`, or single/merged `PDF`.
- **EXIF metadata control**: Strips camera EXIF data by default for privacy, with an optional toggle to preserve EXIF tags (including normalized orientation) in `JPG`, `PNG`, and `WEBP` exports.
- **Batch naming & archives**: Apply filename prefixes or suffixes across the queue, inspect side-by-side comparisons with zoom, download a deduplicated `ZIP`, or merge the queue into one `PDF`.

## Local Development

```bash
npm install
npm run dev
```

Run the unit tests and typecheck:

```bash
npx --yes tsx --test src/utils/imageProcessing.test.ts src/utils/exif.test.ts
npm run lint
npm run build
```

## Deploy to GitHub Pages

1. Push this repository to GitHub (default branch `main`).
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds `dist/` with relative asset paths (`base: './'`) and publishes to `https://oathanrex.github.io/image-converter-pro/`.
