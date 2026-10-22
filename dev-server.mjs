import http from "node:http";
import app from "./worker/index.js";
const host = "127.0.0.1";
const port = 3000;
http
  .createServer(async (incoming, outgoing) => {
    try {
      const parts = [];
      let size = 0;
      for await (const part of incoming) {
        size += part.length;
        if (size > 500000) {
          outgoing.writeHead(413, { "Content-Type": "application/json" });
          outgoing.end(JSON.stringify({ error: "Requête trop volumineuse." }));
          return;
        }
        parts.push(part);
      }
      const body = Buffer.concat(parts);
      const request = new Request(
        new URL(
          incoming.url,
          `http://${incoming.headers.host || `${host}:${port}`}`,
        ),
        {
          method: incoming.method,
          headers: incoming.headers,
          ...(!["GET", "HEAD"].includes(incoming.method) ? { body } : {}),
        },
      );
      const response = await app.fetch(
        request,
        { APP_PASSWORD: process.env.APP_PASSWORD },
        {},
      );
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body)
        for await (const chunk of response.body) outgoing.write(chunk);
      outgoing.end();
    } catch {
      if (outgoing.headersSent) return outgoing.end();
      outgoing.writeHead(500, { "Content-Type": "application/json" });
      outgoing.end(JSON.stringify({ error: "Erreur du serveur local." }));
    }
  })
  .listen(port, host, () => console.log(`Plume : http://${host}:${port}`));
