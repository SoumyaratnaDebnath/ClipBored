import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

http.createServer(async (req, res) => {
  const entry = files.get(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  if (!entry) { res.writeHead(404); return res.end('Not found'); }
  try {
    const [name, type] = entry;
    res.writeHead(200, { 'Content-Type':type, 'X-Content-Type-Options':'nosniff' });
    res.end(await readFile(path.join(root, name)));
  } catch {
    res.writeHead(500);
    res.end('Server error');
  }
}).listen(port, () => console.log(`ClipBored running at http://localhost:${port}`));
