const $ = (s) => document.querySelector(s);
let key = "",
  model = "gpt-4.1-mini",
  busy = false,
  editEntity = null,
  importMode = "";
const fresh = () => ({
  name: "Mon roman",
  synopsis: "",
  chapters: [{ id: crypto.randomUUID(), title: "Chapitre 1", text: "" }],
  entities: [],
});
let data;
try {
  data = JSON.parse(localStorage.getItem("plume-project-v1")) || fresh();
} catch {
  data = fresh();
}
let current = data.chapters[0].id;
const words = (t) => (t.trim().match(/\S+/g) || []).length;
function save() {
  try {
    localStorage.setItem("plume-project-v1", JSON.stringify(data));
    $("#notice").textContent = "Enregistré dans ce navigateur";
  } catch {
    $("#notice").textContent = "Stockage plein : exporte ton projet !";
  }
  stats();
}
function tab(t) {
  document
    .querySelectorAll(".section")
    .forEach((e) => e.classList.toggle("visible", e.id === t));
  document
    .querySelectorAll("[data-tab]")
    .forEach((e) => e.classList.toggle("active", e.dataset.tab === t));
}
document
  .querySelectorAll("[data-tab]")
  .forEach((e) => (e.onclick = () => tab(e.dataset.tab)));
function stats() {
  $("#wordCount").textContent = words($("#editor").value) + " mots";
  $("#chapterStat").textContent = data.chapters.length;
  $("#totalStat").textContent = data.chapters.reduce(
    (n, c) => n + words(c.text),
    0,
  );
  $("#canonStat").textContent = data.entities.length;
  $("#projectLabel").textContent = data.name || "Mon roman";
}
function loadChapter(id) {
  current = id;
  let c = data.chapters.find((c) => c.id === id);
  $("#title").value = c.title;
  $("#editor").value = c.text;
  stats();
  list();
}
function list() {
  let root = $("#chapterList");
  root.replaceChildren();
  data.chapters.forEach((c, i) => {
    let d = document.createElement("div");
    d.className = "chapter";
    let b = document.createElement("button");
    b.textContent =
      (c.id === current ? "● " : "") +
      String(i + 1).padStart(2, "0") +
      " — " +
      (c.title || "Sans titre");
    b.onclick = () => loadChapter(c.id);
    let small = document.createElement("small");
    small.textContent = words(c.text) + " mots";
    b.append(small);
    d.append(b);
    if (data.chapters.length > 1) {
      let del = document.createElement("button");
      del.textContent = "Supprimer";
      del.onclick = () => {
        if (confirm("Supprimer ce chapitre ?")) {
          data.chapters = data.chapters.filter((x) => x.id !== c.id);
          if (current === c.id) loadChapter(data.chapters[0].id);
          save();
          list();
        }
      };
      d.append(del);
    }
    root.append(d);
  });
}
$("#newChapter").onclick = () => {
  let c = {
    id: crypto.randomUUID(),
    title: "Chapitre " + (data.chapters.length + 1),
    text: "",
  };
  data.chapters.push(c);
  loadChapter(c.id);
  save();
};
["title", "editor"].forEach(
  (id) =>
    ($("#" + id).oninput = () => {
      let c = data.chapters.find((c) => c.id === current);
      c.title = $("#title").value;
      c.text = $("#editor").value;
      save();
      list();
    }),
);
$("#projectName").value = data.name;
$("#synopsis").value = data.synopsis;
["projectName", "synopsis"].forEach(
  (id) =>
    ($("#" + id).oninput = () => {
      data.name = $("#projectName").value;
      data.synopsis = $("#synopsis").value;
      save();
    }),
);
function renderEntities() {
  let root = $("#entities");
  root.replaceChildren();
  if (!data.entities.length) {
    let p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      "Ton univers prend forme ici. Ajoute ton premier personnage, lieu ou pouvoir.";
    root.append(p);
  }
  data.entities.forEach((e) => {
    let d = document.createElement("div");
    d.className = "entity";
    let h = document.createElement("h3");
    h.textContent = e.name;
    let s = document.createElement("small");
    s.textContent = e.type + " · " + e.status;
    let p = document.createElement("p");
    p.textContent = e.body;
    let b = document.createElement("button");
    b.textContent = "Modifier";
    b.onclick = () => entityForm(e);
    let del = document.createElement("button");
    del.textContent = "Supprimer";
    del.onclick = () => {
      if (confirm("Supprimer cette fiche ?")) {
        data.entities = data.entities.filter((x) => x.id !== e.id);
        save();
        renderEntities();
      }
    };
    d.append(h, s, p, b, del);
    root.append(d);
  });
}
function entityForm(e) {
  editEntity = e?.id || null;
  $("#entityName").value = e?.name || "";
  $("#entityBody").value = e?.body || "";
  $("#entityType").value = e?.type || "Personnage";
  $("#entityStatus").value = e?.status || "Validé — canon";
  $("#entityDialog").showModal();
}
$("#addEntity").onclick = () => entityForm();
$("#cancelEntity").onclick = () => $("#entityDialog").close();
$("#saveEntity").onclick = () => {
  if (!$("#entityName").value.trim()) return $("#entityName").focus();
  let e = {
    id: editEntity || crypto.randomUUID(),
    name: $("#entityName").value.trim(),
    body: $("#entityBody").value,
    type: $("#entityType").value,
    status: $("#entityStatus").value,
  };
  if (editEntity)
    data.entities = data.entities.map((x) => (x.id === editEntity ? e : x));
  else data.entities.push(e);
  save();
  renderEntities();
  $("#entityDialog").close();
};
["settings", "settingsTop"].forEach(
  (id) => ($("#" + id).onclick = () => $("#config").showModal()),
);
$("#closeConfig").onclick = () => $("#config").close();
const KEY_STORE = "plume-api-key";
function showConnected() {
  $("#connectionState").textContent =
    "Clé et accès au modèle vérifiés · " + model;
  $("#settingsTop").textContent = "✓ IA connectée";
}
function rememberKey() {
  try {
    if ($("#rememberKey").checked)
      localStorage.setItem(KEY_STORE, JSON.stringify({ key, model }));
    else localStorage.removeItem(KEY_STORE);
  } catch {}
}
try {
  const saved = JSON.parse(localStorage.getItem(KEY_STORE));
  if (saved?.key && saved?.model) {
    key = saved.key;
    model = saved.model;
    $("#model").value = model;
    $("#rememberKey").checked = true;
    showConnected();
  }
} catch {}
$("#rememberKey").onchange = () => {
  if (!$("#rememberKey").checked) rememberKey();
};
$("#saveConfig").onclick = async () => {
  const candidate = $("#apiKey").value.trim() || key;
  const selected = $("#model").value.trim();
  const status = $("#configStatus");
  if (!candidate || !selected) {
    status.textContent = "Renseigne ta clé API et le modèle.";
    return;
  }
  const button = $("#saveConfig");
  button.disabled = true;
  button.textContent = "Vérification…";
  status.textContent = "Vérification de la clé et de l’accès au modèle…";
  try {
    const r = await fetch("/api/connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: candidate, model: selected }),
    });
    const j = await readJson(r);
    if (!r.ok) throw Error(j.error || "Connexion refusée.");
    key = candidate;
    model = selected;
    $("#apiKey").value = "";
    rememberKey();
    status.textContent = "Connexion vérifiée. Tu peux lancer une analyse.";
    showConnected();
    $("#notice").textContent = "Connexion vérifiée — lance une analyse";
    $("#config").close();
    tab("agent");
    if (!$("#question").value)
      $("#question").value = "Vérifie la cohérence de mon chapitre ouvert.";
    $("#output").textContent =
      "Connexion vérifiée. Écris ou importe ton chapitre dans « Mon atelier », puis clique sur « Envoyer à l’agent ». La vérification de connexion ne confirme pas le crédit disponible.";
    $("#question").focus();
  } catch (e) {
    status.textContent = e.message;
  } finally {
    button.disabled = false;
    button.textContent = "Tester et activer";
  }
};
const tasks = {
  coherence:
    "Vérifie la cohérence du chapitre ouvert avec le manuscrit et les fiches validées. Cite précisément les passages et sources. Distingue contradiction certaine, point à clarifier et piste de correction. Ne prétends pas avoir trouvé des erreurs si le texte ne le permet pas.",
  style:
    "Propose des améliorations de style pour le chapitre ouvert : passage original, proposition et raison. Respecte ma voix et ne réécris pas tout.",
  ideas:
    "Propose trois pistes pour poursuivre le chapitre ouvert en respectant le canon. Présente-les comme des idées non validées.",
};
document.querySelectorAll("[data-task]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#question").value = tasks[b.dataset.task];
      tab("agent");
      run();
    }),
);
async function readJson(r) {
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    throw Error(
      r.ok
        ? "Réponse inattendue du serveur."
        : "Le serveur a répondu par une erreur " +
            r.status +
            " sans détail. Recharge la page et réessaie.",
    );
  }
}
async function run() {
  if (busy) return;
  if (!key) {
    $("#config").showModal();
    return;
  }
  let q = $("#question").value.trim();
  if (!q) return;
  let context = { ...data, chapterOpened: current };
  if (new Blob([JSON.stringify(context)]).size > 200000) {
    $("#output").textContent =
      "Le manuscrit dépasse la limite de cette version (environ 190 000 caractères). Travaille sur un projet plus court.";
    return;
  }
  busy = true;
  let text = "";
  $("#ask").disabled = true;
  $("#ask").textContent = "Analyse en cours…";
  $("#output").textContent =
    "Plume AI lit le manuscrit et consulte ta bible d’univers…";
  try {
    let r = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, model, question: q, context }),
    });
    if (!r.ok)
      throw Error((await readJson(r)).error || "Erreur du service IA.");
    const out = $("#output"),
      reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!text) out.textContent = "";
      text += value;
      out.textContent = text;
    }
    if (!text.trim())
      out.textContent = "Le service IA a renvoyé une réponse vide.";
  } catch (e) {
    $("#output").textContent = text
      ? text + "\n\n[Réponse interrompue : " + e.message + "]"
      : e.message;
  } finally {
    busy = false;
    $("#ask").disabled = false;
    $("#ask").textContent = "Envoyer à l’agent ↗";
  }
}
$("#ask").onclick = run;
$("#copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("#output").textContent);
    $("#copy").textContent = "Copié";
    setTimeout(() => ($("#copy").textContent = "Copier"), 1500);
  } catch {
    $("#notice").textContent = "La copie automatique est indisponible.";
  }
};
function download(name, text, type) {
  let url = URL.createObjectURL(new Blob([text], { type }));
  let a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#exportProject").onclick = () =>
  download(
    "plume-projet.json",
    JSON.stringify(data, null, 2),
    "application/json",
  );
$("#exportText").onclick = () =>
  download(
    "plume-manuscrit.txt",
    data.name +
      "\n\n" +
      data.chapters
        .map((c) => c.title + "\n\n" + c.text)
        .join("\n\n────────\n\n"),
    "text/plain",
  );
$("#importProject").onclick = () => {
  importMode = "project";
  $("#file").accept = ".json";
  $("#file").click();
};
$("#importText").onclick = () => {
  importMode = "text";
  $("#file").accept = ".txt";
  $("#file").click();
};
$("#file").onchange = async (e) => {
  let f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 2000000)
      throw Error("Fichier trop volumineux (2 Mo maximum).");
    let t = await f.text();
    if (importMode === "text") {
      let c = {
        id: crypto.randomUUID(),
        title: f.name.replace(/\.txt$/i, ""),
        text: t,
      };
      data.chapters.push(c);
      loadChapter(c.id);
    } else {
      let p = JSON.parse(t);
      if (
        typeof p.name !== "string" ||
        typeof p.synopsis !== "string" ||
        !Array.isArray(p.chapters) ||
        !p.chapters.length ||
        !Array.isArray(p.entities) ||
        !p.chapters.every(
          (c) =>
            typeof c.id === "string" &&
            typeof c.title === "string" &&
            typeof c.text === "string",
        ) ||
        !p.entities.every((c) =>
          ["id", "name", "body", "type", "status"].every(
            (k) => typeof c[k] === "string",
          ),
        ) ||
        new Set(p.chapters.map((c) => c.id)).size !== p.chapters.length
      )
        throw Error("Sauvegarde Plume invalide.");
      if (!confirm("Remplacer le projet actuel par cette sauvegarde ?")) return;
      data = p;
      $("#projectName").value = data.name;
      $("#synopsis").value = data.synopsis;
      loadChapter(data.chapters[0].id);
      renderEntities();
    }
    save();
  } catch (err) {
    alert(err.message);
  } finally {
    e.target.value = "";
  }
};
loadChapter(current);
renderEntities();
