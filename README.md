# Vice Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jhonrudi12/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jhonrudi12/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns a person's photo and a caption into cover art in the
style of a Vice City poster — the multi-panel look with bold lettering and a sunset
or neon colour grade — and exports it as a PNG to share. It runs offline in a
desktop browser from its own static files, and the photos never leave the machine.
Built for the [make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **5 multi-panel layouts:** Hero+3, 4-panel grid, 9-panel grid, tilted snapshot
  collage, full bleed — each drawn from your photos, not a fixed frame.
- **5 colour grades:** Vice Sunset, Neon Nights, Golden Hour, Midnight Purple,
  Palm Teal — real 256-entry per-channel LUTs with a strength slider, plus film
  grain and a vignette.
- **Any photo:** upload your own (up to 6), or use the two built-in samples. Click
  any panel in the live preview to crop it: pick its photo, zoom, pan, flip — or
  fill every panel with one photo.
- **Lettering:** editable Anton title with a sunset gradient, dark outline and
  shadow over a halftone band, a Pacifico subtitle, a "VICE COAST" badge and a
  five-star heat meter.
- **Export:** one click downloads a PNG in 1080×1080, 1080×1350 or 1920×1080.

All art and lettering is original, and both fonts (Anton, Pacifico) are SIL Open
Font License files vendored under `app/fonts/` — no Rockstar Games logo, artwork
or font is used anywhere.

## Run it

```bash
# Serve the app and open it in desktop Chrome
node serve.ts
# then open http://localhost:8080
```

Or point any static server at `app/` — the app works fully offline, with no
network requests.

## Hand it in

```bash
# Regenerate app/ + screenshots/ + dossier.json (deterministic)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
