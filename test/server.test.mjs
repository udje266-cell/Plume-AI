import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["scripts/bundle.mjs"]);
const app = (await import("../worker/index.js")).default;

// Remplace fetch (appels à OpenAI) par une file de réponses simulées.
const realFetch = globalThis.fetch;
let replies, calls;
beforeEach(() => {
  replies = [];
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options?.body && JSON.parse(options.body) });
    const next = replies.shift();
    if (!next) throw new Error("appel OpenAI inattendu");
    return next();
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});
const reply =
  (status, body = {}) =>
  () =>
    Response.json(body, { status });
const sse =
  (...parts) =>
  () =>
    new Response(
      parts
        .map(
          (p) =>
            `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`,
        )
        .join("") + "data: [DONE]\n\n",
    );

const post = (path, body, { origin = "http://plume.test", host } = {}) =>
  app.fetch(
    new Request("http://plume.test" + path, {
      method: "POST",
      headers: { Origin: origin, ...(host ? { Host: host } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const connect = (opts) =>
  post("/api/connection", { key: "sk-test", model: "gpt-4.1-mini" }, opts);
const ask = (context = { chapters: [] }) =>
  post("/api/agent", {
    key: "sk-test",
    model: "gpt-4.1-mini",
    question: "Analyse",
    context,
  });

test("la page d’accueil, l’icône et le manifeste sont servis", async () => {
  const page = await app.fetch(new Request("http://plume.test/"));
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<style>[\s\S]+<\/style>/);
  assert.match(html, /<script>[\s\S]+<\/script>/);
  assert.doesNotMatch(html, /href="style\.css"|src="app\.js"/);
  const icon = await app.fetch(new Request("http://plume.test/icon.png"));
  assert.equal(icon.headers.get("Content-Type"), "image/png");
  const manifest = await app.fetch(
    new Request("http://plume.test/manifest.webmanifest"),
  );
  assert.equal((await manifest.json()).name, "Plume AI");
  const missing = await app.fetch(new Request("http://plume.test/inconnu"));
  assert.equal(missing.status, 404);
});

test("connexion : clé valide acceptée", async () => {
  replies.push(reply(200));
  const r = await connect();
  assert.deepEqual([r.status, await r.json()], [200, { ok: true }]);
  assert.match(calls[0].url, /\/v1\/models\/gpt-4\.1-mini$/);
});

test("connexion : une autre origine est refusée", async () => {
  const r = await connect({ origin: "https://autre.example" });
  assert.equal(r.status, 403);
  assert.equal(calls.length, 0);
});

test("connexion : un proxy qui réécrit l’adresse est accepté via Host", async () => {
  replies.push(reply(200));
  const r = await connect({
    origin: "https://plume.example",
    host: "plume.example",
  });
  assert.equal(r.status, 200);
});

test("connexion : clé refusée (401)", async () => {
  replies.push(reply(401));
  const r = await connect();
  assert.equal(r.status, 401);
  assert.match((await r.json()).error, /Clé API refusée/);
});

test("connexion : clé restreinte (403 sur /models) vérifiée par une génération", async () => {
  replies.push(reply(403), reply(200));
  const r = await connect();
  assert.equal(r.status, 200);
  assert.match(calls[1].url, /chat\/completions$/);
});

test("connexion : crédit insuffisant signalé", async () => {
  replies.push(
    reply(403),
    reply(429, { error: { code: "insufficient_quota" } }),
  );
  const r = await connect();
  assert.equal(r.status, 402);
  assert.match((await r.json()).error, /crédit API insuffisant/);
});

test("connexion : modèle au nom invalide refusé sans appeler OpenAI", async () => {
  const r = await post("/api/connection", { key: "sk", model: "../../x" });
  assert.equal(r.status, 400);
  assert.equal(calls.length, 0);
});

test("agent : la réponse est diffusée en texte brut", async () => {
  replies.push(sse("Bonjour", ", voici l’analyse."));
  const r = await ask();
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Content-Type"), /^text\/plain/);
  assert.equal(await r.text(), "Bonjour, voici l’analyse.");
  assert.equal(calls[0].body.stream, true);
});

test("agent : limite de 200 000 octets UTF-8 sur le contexte", async () => {
  replies.push(sse("ok"));
  const ok = await ask({ chapters: [{ text: "é".repeat(99_000) }] });
  assert.equal(ok.status, 200);
  const tooBig = await ask({ chapters: [{ text: "é".repeat(100_000) }] });
  assert.equal(tooBig.status, 400);
});

test("agent : erreur OpenAI traduite en message clair", async () => {
  replies.push(reply(429, { error: { code: "insufficient_quota" } }));
  const r = await ask();
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /Crédit API insuffisant/);
});

test("agent : JSON invalide refusé", async () => {
  const r = await post("/api/agent", "{pas du json");
  assert.equal(r.status, 502);
  assert.equal(calls.length, 0);
});
