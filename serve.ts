import { createReadStream, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('./game/', import.meta.url)));
const flag = process.argv.indexOf('--port', 2);
const candidate = Number(process.argv[flag + 1]);
const port = flag >= 2 && Number.isInteger(candidate) && candidate >= 1 && candidate <= 65535 ? candidate : 8080;
const utf8 = '; charset=utf-8';
const mime = new Map([
  ['.html', 'text/html' + utf8], ['.js', 'text/javascript' + utf8],
  ['.mjs', 'text/javascript' + utf8], ['.css', 'text/css' + utf8],
  ['.json', 'application/json' + utf8], ['.txt', 'text/plain' + utf8],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'], ['.woff2', 'font/woff2'], ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'], ['.bin', 'application/octet-stream'],
  ['.wasm', 'application/wasm'], ['.wav', 'audio/wav'], ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'],
]);

/** @param {string} path */
function insideRoot(path) {
  const route = relative(root, path);
  return route !== '..' && !route.startsWith('..' + sep) && !isAbsolute(route);
}

createServer((req, res) => {
  let route;
  try {
    const raw = (req.url ?? '/').split(/[?#]/, 1)[0];
    route = decodeURIComponent(raw);
    if (!route.startsWith('/') || route.includes('\0')) throw new Error('Invalid path');
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  const path = resolve(root, '.' + route + (route.endsWith('/') ? 'index.html' : ''));
  if (!insideRoot(path)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  let file, size;
  try {
    file = realpathSync(path);
    if (!insideRoot(file)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error('Expected a file');
    size = stat.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }

  res.writeHead(200, {
    'content-type': mime.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).on('error', () => res.destroy()).pipe(res);
}).on('error', (error) => {
  console.error('Cannot serve game/ on 127.0.0.1:' + port + ' (' + (error.code ?? error.message) + ')');
  process.exitCode = 1;
}).listen(port, '127.0.0.1', () => console.log('game/ is on http://localhost:' + port));
