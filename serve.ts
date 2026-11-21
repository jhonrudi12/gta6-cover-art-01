// Vice Coast Cover Studio — local static server.
// Serves app/ over HTTP so the app can be opened in a desktop browser.
// No build step, no network calls: every file served comes from app/.
// Usage: node serve.ts [port]   (default port 4173, or $PORT)
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const file = join(root, path === '/' ? 'index.html' : normalize(path));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] || 'application/octet-stream',
    'content-length': stat.size,
  });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Vice Coast Cover Studio at http://localhost:${port}/`);
});
