import { createServer } from "http";
import { request } from "http";

const TARGET_PORT = 5000;
const PROXY_PORT = 8081;
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

function waitForTarget(retries = 0) {
  const probe = request({ hostname: "127.0.0.1", port: TARGET_PORT, path: "/", method: "GET" }, () => {
    startProxy();
  });
  probe.on("error", () => {
    if (retries < MAX_RETRIES) {
      setTimeout(() => waitForTarget(retries + 1), RETRY_DELAY_MS);
    } else {
      console.error(`Proxy: target port ${TARGET_PORT} never became ready`);
    }
  });
  probe.end();
}

function startProxy() {
  createServer((req, res) => {
    const opts = {
      hostname: "127.0.0.1",
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    const proxy = request(opts, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res, { end: true });
    });
    req.pipe(proxy, { end: true });
    proxy.on("error", () => res.destroy());
  }).listen(PROXY_PORT, () => {
    console.log(`Proxy listening on :${PROXY_PORT} → :${TARGET_PORT}`);
  });
}

waitForTarget();
