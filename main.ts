// Vice Coast Cover Studio — entrypoint.
// Copies app/ and screenshots/ from this repository into the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-app.ts.
// Node 22, standard library only. Deterministic: files are copied in sorted
// path order with fixed timestamps, so two runs produce byte-identical output.
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const FIXED_TIME = new Date('2026-01-01T00:00:00.000Z');

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copySorted(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copySorted(src, dest);
    } else if (entry.isFile()) {
      cpSync(src, dest);
      utimesSync(dest, FIXED_TIME, FIXED_TIME);
    }
  }
  utimesSync(destDir, FIXED_TIME, FIXED_TIME);
}

function main(): void {
  // Clear the output directory's contents without removing the directory
  // itself: the grader mounts /output writable, but its parent is not, so
  // removing /output itself fails with EACCES (rmdir).
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), { recursive: true, force: true });
  }
  for (const dir of ['app', 'screenshots']) {
    const src = join(repoRoot, dir);
    if (!statSync(src, { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`missing ${dir}/ in repository root ${repoRoot}`);
    }
    copySorted(src, join(outDir, dir));
  }
  const dossier = buildDossier(repoRoot, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  utimesSync(join(outDir, 'dossier.json'), FIXED_TIME, FIXED_TIME);
  console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
}

main();
