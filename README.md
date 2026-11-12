# GarmentClothLab

A browser-first experiment for turning garment images into expressive cloth motion.

This repository starts from [Holocloth](https://github.com/dmitrykurash/holocloth) by Dmitry Kurash (MIT). The upstream project is preserved as the `upstream` Git remote in local clones.

## Prototype

- Original Holocloth playground: `/`
- Garment motion experiment: `/garment.html`

The first garment prototype maps garment-shaped image textures onto a 3D cloth grid and simulates gravity, wind, stretch, shear, and bending locally in the browser. It is deliberately **not** full garment reconstruction: automatic segmentation, sewing-pattern topology, inter-piece seams, self-collision, and true garment-specific meshes remain future work.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5199/garment.html`.

## Deploy

GitHub Actions deploys the `feat/garment-cloth-prototype` branch to GitHub Pages. The build runs on a standard runner; cloth simulation runs on the visitor's device. No GPU inference server is required.

## Upstream attribution

The original Holocloth project is MIT licensed. Its copyright and license notice are retained in `LICENSE`. New prototype code is contributed under the same MIT license unless otherwise noted.
