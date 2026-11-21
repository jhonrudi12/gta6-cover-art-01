# Vice Coast Cover Studio

[![MakeFun](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e88)](https://make.fun/competitions/gta6-cover-art-01)
[![Offline](https://img.shields.io/badge/offline-no%20upload%20%E2%80%A2%20no%20network-2ee6c8)](https://make.fun/competitions/gta6-cover-art-01)
[![Export](https://img.shields.io/badge/export-PNG%201080%C3%971080%20%E2%80%A2%201080%C3%971350%20%E2%80%A2%201920%C3%971080-ffd23e)](https://make.fun/competitions/gta6-cover-art-01)

An offline web app that turns your photos and a caption into a Vice City-style
multi-panel cover poster — the GTA VI poster look, drawn from your own photos,
with bold sunset lettering and a neon colour grade. Photos never leave your
machine; everything runs from static files in `app/`.

## How it works

1. **Photos** — add up to 6 of your own, or use the two bundled samples
   (`app/samples/pier.jpg`, `app/samples/boulevard.jpg`).
2. **Layout** — five multi-panel layouts: Hero + 3, Grid 4, Grid 9,
   Tilted Snaps, and Full Bleed. Panels are cut from your photos at render
   time — no fixed frame image.
3. **Colour grade** — five grades (Vice Sunset, Neon Nights, Golden Hour,
   Midnight Purple, Palm Teal), each a per-channel 256-entry LUT with a
   strength slider, plus film grain and vignette.
4. **Lettering** — editable Anton title with a sunset gradient, dark outline
   and shadow over a halftone band, a Pacifico subtitle, a "VICE COAST"
   badge, and a five-star heat meter.
5. **Export** — one click downloads a PNG at 1080×1080, 1080×1350,
   or 1920×1080.

Click any panel in the live preview to crop it: pick its photo, zoom, pan by
dragging, or flip it. "Fill all panels" puts one photo (and crop) everywhere.

## Run it

```sh
node serve.ts        # then open http://localhost:4173/
```

No build step, no network request: fonts (Anton + Pacifico, SIL Open Font
License, under `app/fonts/`), samples, scripts and styles are all files
under `app/`.

## Screenshot presets

`?shot=` opens the app straight into a state, for screenshots and sharing:

- `?shot=editor&layout=grid9&grade=neon&photo=both` — editor with samples loaded
- `?shot=cover&layout=hero3&grade=sunset&photo=pier&title=VICE%20COAST` — exported-cover view
- `?shot=export&layout=tilted&grade=golden&size=1080x1350` — cover at export size

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-app.ts`. Two runs are byte-identical.

## Credits

Original design and code, built for the MakeFun `gta6-cover-art-01`
competition. Fonts: Anton and Pacifico under the SIL Open Font License
(see `app/fonts/OFL.txt`). Not affiliated with Rockstar Games; no Rockstar
logo, artwork, or font is used.
