const http = require('http');
const httpProxy = require('http-proxy');
const PORT = process.env.PROXY_PORT ? Number(process.env.PROXY_PORT) : 8085;
const TARGET = process.env.TARGET || 'http://127.0.0.1:8000';
const proxy = httpProxy.createProxyServer({ target: TARGET, changeOrigin: true, preserveHeaderKeyCase: true });
proxy.on('error', (err, req, res) => {
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Proxy error', details: String(err) }));
});
const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: TARGET });
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔁 Proxy listening on http://127.0.0.1:${PORT} -> ${TARGET}`);
});
