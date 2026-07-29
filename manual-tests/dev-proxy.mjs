#!/usr/bin/env node
// Same-origin dev proxy — makes the split dev ports look like production.
// In prod, nginx serves the web app and proxies /api on ONE origin, so the
// mock/Stripe checkout round-trip (which bounces through PUBLIC_URL) works.
// On dev, web (:3100) and api (:4100) are separate origins, breaking it.
// This zero-dep proxy puts both behind :3200:
//   /api/* -> 127.0.0.1:4100 (NestJS);  /* -> 127.0.0.1:3100 (Nitro web)
import http from "node:http";
const PORT = Number(process.env.PROXY_PORT ?? 3200);
const API = { host: "127.0.0.1", port: 4100 };
const WEB = { host: "127.0.0.1", port: 3100 };
const server = http.createServer((req, res) => {
  const target = req.url.startsWith("/api/") ? API : WEB;
  const proxyReq = http.request(
    { host: target.host, port: target.port, method: req.method, path: req.url,
      headers: { ...req.headers, host: "localhost:" + PORT } },
    (proxyRes) => { res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers); proxyRes.pipe(res); },
  );
  proxyReq.on("error", (e) => { res.writeHead(502, { "content-type": "text/plain" }); res.end("proxy error: " + e.message); });
  req.pipe(proxyReq);
});
server.listen(PORT, () => console.log("dev proxy on http://localhost:" + PORT + " -> web :3100 / api :4100"));
