// Vice Coast Cover Studio — the program that hands this entry in (Node 22, standard
// library only). It copies the app's static files and the screenshots from beside
// this file into /output and writes /output/dossier.json, the summary the judge
// reads, using the vendored make.fun library. The build is deterministic: run it
// twice and the two outputs are byte-identical.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps (reference/gate.json): text_max_bytes shapes the dossier's
// bytes; the rest refuse an entry the scorer would refuse — more than 4 screenshots
// or one over 256 KiB, more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ over 1000 bytes. app/ counts beside /output's own
// 1000-entry cap, together with screenshots/ and dossier.json.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
