# Savouring the Journey – A Life of Taste

Single-page static site to showcase a coffee table book. Inspired by the structure and aesthetic of fivemorselsoflove.com.

## Quick start

- Serve the folder with any static server, e.g.:

```sh
npx http-server -p 8080 /workspace
```

Open http://localhost:8080

## Flipbook implementation

- The book PDF is embedded as base64 into `assets/bookData.js` during setup to avoid exposing a direct downloadable URL.
- Pages are rendered on the client via PDF.js and displayed with StPageFlip for a flippable experience.
- Note: This is not DRM. Determined users can still extract content from the page.

## Assets

- `assets/images/Front.png` – front cover
- `assets/images/Back.png` – back cover
- `book.pdf` – source PDF (not served directly). Prefer not to deploy this file; only deploy `assets/bookData.js`.
- `assets/bookData.js` – generated base64 string of the PDF

## SEO

- Basic meta description and OG/Twitter tags included. Update URLs when deploying to production domain.

## Deployment

- Any static host (Netlify, Vercel, GitHub Pages, S3). Ensure all files in `/workspace` are deployed, except consider excluding `book.pdf` if you want to reduce casual downloads.