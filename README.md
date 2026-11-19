# Vice Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jhonrudi12/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jhonrudi12/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns a person's photo and a caption into cover art in the style of GTA 6's posters — the multi-panel cover look with bold lettering and a Vice City sunset or neon colour grade — and exports it as a PNG to share. It runs offline in a desktop browser from its own static files: the photos never leave the machine. Built for the [make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **5 multi-panel layouts:** Hero+3, 4-panel grid, 9-panel grid, tilted snapshot collage, full-bleed.
- **5 colour grades:** Vice Sunset, Neon Nights, Golden Hour, Midnight Purple, Palm Teal — real 256-entry LUT gradient maps with grain, vignette and intensity control.
- **Any photo:** multi-photo picker with per-panel assign, drag, zoom and flip; fill-all vs one-per-panel modes; cropping and positioning per panel.
- **Lettering:** editable Anton title (gradient + outline + shadow) and Pacifico subtitle, halftone title band, "VICE COAST" badge and a 5-star HEAT meter.
- **Export:** PNG in post sizes 1080×1080, 1080×1350 and 1920×1080.

All art, lettering and fonts are original or OFL-licensed (Anton, Pacifico) — no Rockstar Games logo, artwork or font.

## Run it

```bash
# Regenerate app/ + screenshots/ + dossier.json (deterministic)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

# Serve the app and open it in desktop Chrome
npx serve out/app   # or any static server pointed at out/app
```

Or open `app/index.html` from a static server directly — the app works fully offline, with no network requests.

## License

MIT — see [LICENSE](LICENSE).
