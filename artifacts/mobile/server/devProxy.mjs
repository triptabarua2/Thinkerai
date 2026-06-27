import http from "http";
import net from "net";
import { spawn } from "child_process";

const TARGET_PORT = 8081;
const PROXY_PORT = 5000;

function waitForPort(port, retries = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const sock = net.createConnection({ host: "localhost", port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on("error", () => {
        if (++attempts >= retries) return reject(new Error(`Port ${port} never opened`));
        setTimeout(check, 1000);
      });
    };
    check();
  });
}

const expoEnv = {
  ...process.env,
  PORT: String(TARGET_PORT),
};

const expo = spawn(
  "./node_modules/.bin/expo",
  ["start", "--port", String(TARGET_PORT)],
  { env: expoEnv, stdio: "inherit" }
);

expo.on("error", (err) => console.error("Expo spawn error:", err));
expo.on("exit", (code) => {
  if (code !== 0 && code !== null) console.error(`Expo exited with code ${code}`);
  process.exit(code ?? 0);
});

process.on("SIGTERM", () => expo.kill("SIGTERM"));
process.on("SIGINT", () => expo.kill("SIGINT"));

console.log(`Waiting for Metro on port ${TARGET_PORT}…`);
waitForPort(TARGET_PORT).then(() => {
  console.log(`Metro ready. Starting proxy on port ${PROXY_PORT}…`);

  const server = http.createServer((req, res) => {
    const opts = {
      host: "localhost",
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
    };
    const proxy = http.request(opts, (pr) => {
      res.writeHead(pr.statusCode, pr.headers);
      pr.pipe(res, { end: true });
    });
    proxy.on("error", (err) => {
      if (!res.headersSent) res.writeHead(502);
      res.end("Proxy error: " + err.message);
    });
    req.pipe(proxy, { end: true });
  });

  server.on("upgrade", (req, socket, head) => {
    const target = net.createConnection({ host: "localhost", port: TARGET_PORT }, () => {
      const hdrs = [
        `${req.method} ${req.url} HTTP/1.1`,
        ...Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
        "",
        "",
      ].join("\r\n");
      target.write(hdrs);
      if (head?.length) target.write(head);
      target.pipe(socket, { end: true });
      socket.pipe(target, { end: true });
    });
    target.on("error", () => socket.destroy());
    socket.on("error", () => target.destroy());
  });

  server.listen(PROXY_PORT, "0.0.0.0", () => {
    console.log(`Dev proxy: 0.0.0.0:${PROXY_PORT} → localhost:${TARGET_PORT}`);
  });
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
