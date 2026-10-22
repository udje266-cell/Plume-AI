import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["scripts/bundle.mjs"]);
const app = (await import("../worker/index.js")).default;

const env = { APP_PASSWORD: "mot-de-passe-long" };
const basic = (password) =>
  "Basic " + Buffer.from("plume:" + password).toString("base64");
const get = (path, headers = {}, e = env) =>
  app.fetch(new Request("http://plume.test" + path, { headers }), e);

test("sans APP_PASSWORD, le site reste ouvert (usage local)", async () => {
  assert.equal((await get("/", {}, {})).status, 200);
});

test("sans mot de passe, la page demande une authentification", async () => {
  const r = await get("/");
  assert.equal(r.status, 401);
  assert.match(r.headers.get("WWW-Authenticate"), /^Basic realm="Plume AI"/);
});

test("un mauvais mot de passe est refusé", async () => {
  assert.equal((await get("/", { Authorization: basic("faux") })).status, 401);
  assert.equal((await get("/", { Authorization: "Basic !!!" })).status, 401);
});

test("le bon mot de passe ouvre la page", async () => {
  const r = await get("/", { Authorization: basic(env.APP_PASSWORD) });
  assert.equal(r.status, 200);
});

test("les routes IA sont protégées aussi", async () => {
  const r = await app.fetch(
    new Request("http://plume.test/api/agent", {
      method: "POST",
      headers: { Origin: "http://plume.test" },
      body: "{}",
    }),
    env,
  );
  assert.equal(r.status, 401);
});

test("l’icône et le manifeste restent publics", async () => {
  assert.equal((await get("/icon.png")).status, 200);
  assert.equal((await get("/manifest.webmanifest")).status, 200);
});
