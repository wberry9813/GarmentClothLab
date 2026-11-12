# GarmentClothLab

A browser-first experiment for expressive garment-image cloth motion.

The repository builds on [Holocloth](https://github.com/dmitrykurash/holocloth) by Dmitry Kurash (MIT). The upstream project is preserved as the `upstream` remote in local clones.

## Pages

- Original Holocloth playground: `/`
- Garment Motion experiment: `/garment.html`

## Current direction: single-piece controlled cloth

The garment is treated as one complete image mapped onto a stable regular grid. Image alpha is used only for visual transparency; it does not delete physical grid vertices. A pre-draped rest pose, two upper support points, restrained wind, damping, and low-amplitude depth motion create a stable presentation animation.

The built-in white T-shirt image is derived from the supplied checkerboard-background reference: the checkerboard was removed into an alpha channel and the image was cropped/resized to WebP for browser delivery.

This is a visual-first 2.5D cloth display, not a sewing-pattern or physically complete garment reconstruction. It does not split sleeves/hem, run AI recognition, or require server inference.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5199/garment.html`.

## Deploy

GitHub Actions deploys the default branch to GitHub Pages. Simulation runs locally in the visitor's browser; no GPU inference server is required.

## Upstream attribution

The original Holocloth project is MIT licensed. Its copyright and license notice are retained in `LICENSE`.
