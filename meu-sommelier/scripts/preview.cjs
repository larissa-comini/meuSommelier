const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  const stream = fs.createReadStream(target);
  stream.on('error', () => {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('A prévia está sendo atualizada. Recarregue em instantes.');
  });
  stream.pipe(res);
}).listen(8081, '127.0.0.1', () => console.log('Preview: http://localhost:8081'));
