import http from 'node:http';
import { readFile } from 'node:fs/promises';

const page = new URL('./index.html', import.meta.url);
const port = Number(process.env.PORT || 3000);
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (path !== '/' && path !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  try {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(await readFile(page));
  } catch {
    res.writeHead(500); res.end('Unable to load the game.');
  }
}).listen(port, '0.0.0.0', () => console.log(`Captain Nova is running on port ${port}`));
