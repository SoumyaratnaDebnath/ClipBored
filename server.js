import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'clips.json');
const port = process.env.PORT || 3000;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };

async function clips() {
  try { return JSON.parse(await readFile(dataFile, 'utf8')); }
  catch { return []; }
}
const send = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    if (req.method === 'GET' && url.pathname === '/api/clips') return send(res, 200, await clips());
    if (req.method === 'POST' && url.pathname === '/api/clips') {
      let body = ''; for await (const chunk of req) body += chunk;
      try {
        const input = JSON.parse(body);
        if (typeof input.text !== 'string' || !input.text.trim()) return send(res, 400, { error:'Add some text first.' });
        const items = await clips();
        const item = { id: crypto.randomUUID(), text: input.text.trim().slice(0, 20000), createdAt: new Date().toISOString() };
        items.unshift(item);
        await mkdir(dataDir, { recursive:true });
        await writeFile(dataFile, JSON.stringify(items.slice(0, 100), null, 2));
        return send(res, 201, item);
      } catch { return send(res, 400, { error:'Could not save that clip.' }); }
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/clips/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/clips/'.length));
      const items = (await clips()).filter(item => item.id !== id);
      await mkdir(dataDir, { recursive:true }); await writeFile(dataFile, JSON.stringify(items, null, 2));
      return send(res, 200, { ok:true });
    }
    return send(res, 404, { error:'Not found' });
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep) || !existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  try { res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(500); res.end('Server error'); }
}).listen(port, () => console.log(`ClipBored running at http://localhost:${port}`));
