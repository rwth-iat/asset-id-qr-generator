# Asset ID QR Generator

A small static web app that turns asset IDs (e.g. Identification Link URLs per
DIN EN IEC 61406-1) into styled QR codes, ready to download.

## Features

- **Single ID**: live preview with download as PNG
- **Multiple IDs** (one per line): thumbnail previews, then a single download
  bundling a PNG and PDF for each ID plus a `config.txt` summary, packaged as
  a ZIP
- Styled QR codes with a thin frame, quiet zone, and orientation corner cut
- Optional asset ID label under the QR code, with adjustable text size
- Adjustable QR error correction level (M / Q / H, default Q — the standard
  requires at least M)
- Light / dark / auto theme, persisted across visits
- Embed mode (`?id=<base64url-encoded asset id>`) for rendering a single QR
  code without surrounding UI, e.g. in an `<iframe>`
  - `&ec=M|Q|H` sets the error correction level (defaults to Q)
  - `&label=1` shows the asset ID label, which is hidden by default in embed
    mode

## Running locally

This is a static site with no build step. Serve the repo root with any static
file server, for example:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Running with Docker

```sh
docker build -t asset-id-qr-generator .
docker run -p 8080:80 asset-id-qr-generator
```

## Project structure

```
index.html   - page markup
style.css    - styling and theming
app.js       - QR rendering, ZIP/PDF export, theme handling
assets/      - logo images (light/dark)
lib/         - vendored libraries (qrcode.js, jszip, jspdf)
```
