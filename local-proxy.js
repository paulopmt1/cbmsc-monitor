#!/usr/bin/env node

// Lightweight CORS proxy for LM Studio.
// Chromium browsers block requests from public HTTPS sites to localhost
// (Private Network Access spec) unless the server returns specific headers.
// LM Studio doesn't send those headers, so this proxy sits in between.
//
// Usage:  node local-proxy.js [--port 5001] [--target http://localhost:1234]

const http = require('http');
const { URL } = require('url');

const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const PORT = parseInt(flag('--port', '5001'), 10);
const TARGET = flag('--target', 'http://localhost:1234');

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Private-Network': 'true',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const target = new URL(req.url, TARGET);

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const proxyReq = http.request(
      target,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: target.host,
        },
      },
      (proxyRes) => {
        const headers = { ...proxyRes.headers, ...corsHeaders };
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, corsHeaders);
      res.end(JSON.stringify({ error: 'Could not reach LM Studio at ' + TARGET }));
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`CORS proxy listening on http://localhost:${PORT}`);
  console.log(`Forwarding to ${TARGET}`);
  console.log(`\nSet your chat URL to: http://localhost:${PORT}/v1`);
});
