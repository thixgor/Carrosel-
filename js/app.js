// app.js — estado, formulário, render do deck, ações por slide, persistência.
import { TEMPLATES, GATILHOS } from "./prompts.js";
import { generateCarousel, regenerateSlide } from "./gemini.js";
import { renderSlide, autoFit, fitToFrame, TEMPLATE_IDS } from "./templates.js";
import { exportPNG, exportZIP, captionText, copyText, canShareFiles, sharePNGs } from "./export.js";

const LIMITS = { kicker: 4, headline: 9, subheadline: 16, body: 32 };
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = { result: null, slides: [], input: null, busy: false, format: "4x5" };

// ─── Init ──────────────────────────────────────────────────────────────────────
function init() {
  buildGatilhos();
  buildTemplateSelect();
  buildPresetSelect();
  restoreFavTpl();
  wireForm();
  wireFormat();
  wireExport();
  restoreLast();
  window.addEventListener("resize", debounce(refit, 150));
}

function buildGatilhos() {
  const box = $("gatilhos");
  Object.entries(GATILHOS).forEach(([key, g]) => {
    const chip = el("button", "chip", g.label);
    chip.type = "button";
    chip.dataset.key = key;
    chip.setAttribute("aria-pressed", "false");
    chip.title = g.instrucao;
    chip.addEventListener("click", () => toggleGatilho(chip));
    box.appendChild(chip);
  });
}
function selectedGatilhos() { return [...document.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.key); }
function toggleGatilho(chip) {
  const on = chip.getAttribute("aria-pressed") === "true";
  if (!on && selectedGatilhos().length >= 4) { flash($("gatCount")); return; }
  chip.setAttribute("aria-pressed", String(!on));
  const n = selectedGatilhos().length;
  $("gatCount").textContent = `${n}/4`;
  document.querySelectorAll(".chip").forEach((c) => {
    const pressed = c.getAttribute("aria-pressed") === "true";
    c.setAttribute("aria-disabled", String(!pressed && n >= 4));
  });
}

function buildTemplateSelect() {
  $("template").innerHTML = `<option value="">IA escolhe por slide (recomendado)</option>`
    + TEMPLATES.map((t) => `<option value="${t.id}">${t.nome} — ${t.uso}</option>`).join("");
}

// ─── Presets de produto ─────────────────────────────────────────────────────────
function presets() { return store.get("da_presets", {}); }
function buildPresetSelect() {
  const sel = $("presetSel");
  const p = presets();
  sel.innerHTML = `<option value="">—</option>` + Object.keys(p).map((n) => `<option>${escapeHtml(n)}</option>`).join("");
}
function wirePresets() {
  $("presetSel").addEventListener("change", (e) => { const p = presets()[e.target.value]; if (p) fillForm(p); });
  $("presetSave").addEventListener("click", () => {
    const name = prompt("Nome do preset:", $("produto").value.slice(0, 40));
    if (!name) return;
    const p = presets(); p[name] = collectInput(); store.set("da_presets", p); buildPresetSelect(); $("presetSel").value = name;
    toast("Preset salvo");
  });
  $("presetDel").addEventListener("click", () => {
    const name = $("presetSel").value; if (!name) return;
    const p = presets(); delete p[name]; store.set("da_presets", p); buildPresetSelect();
  });
}

function restoreFavTpl() {
  const fav = store.get("da_favtpl", "");
  if (fav && TEMPLATE_IDS.includes(fav)) $("template").value = fav;
  updateFavStar(); updateTplNote();
  $("favTpl").addEventListener("click", () => {
    const cur = $("template").value;
    const fav = store.get("da_favtpl", "") === cur ? "" : cur;
    store.set("da_favtpl", fav); updateFavStar();
  });
  $("template").addEventListener("change", () => { updateFavStar(); updateTplNote(); });
}
function updateFavStar() {
  const fav = store.get("da_favtpl", "");
  const on = fav && fav === $("template").value;
  $("favTpl").dataset.on = on ? "1" : "0";
  $("favTpl").textContent = on ? "★" : "☆";
}
function updateTplNote() {
  const v = $("template").value;
  $("tplNote").textContent = v
    ? "Todos os slides vão usar este estilo. (Dá pra trocar um a um depois.)"
    : "A IA escolhe o melhor template de cada slide.";
}

// ─── Formulário ──────────────────────────────────────────────────────────────────
function wireForm() {
  wirePresets();
  $("qtd").addEventListener("input", (e) => ($("qtdOut").textContent = e.target.value));
  $("genForm").addEventListener("submit", (e) => { e.preventDefault(); generate(); });
  $("btnRetry").addEventListener("click", generate);
  $("btnLimpar").addEventListener("click", clearDeck);
}

// Apaga todos os slides da tela e volta ao estado inicial (não mexe em presets/favoritos).
function clearDeck() {
  if (state.busy) return;
  if (state.slides.length && !confirm("Apagar todos os slides da tela? Seus presets e favoritos continuam.")) return;
  state.result = null; state.slides = []; state.input = null;
  $("deck").innerHTML = "";
  $("btnExport").disabled = true; $("btnLimpar").disabled = true;
  setState("idle");
  store.set("da_last", null);
}
// ─── Formato (4:5 / 9:16) ───────────────────────────────────────────────────────
function wireFormat() {
  state.format = store.get("da_format", "4x5");
  applyFormatUI();
  document.querySelectorAll("#formato .seg__btn").forEach((b) =>
    b.addEventListener("click", () => setFormat(b.dataset.fmt)));
}
function applyFormatUI() {
  document.querySelectorAll("#formato .seg__btn").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.fmt === state.format)));
  $("deck").dataset.ratio = state.format;
}
function setFormat(fmt) {
  if (fmt === state.format) return;
  state.format = fmt; store.set("da_format", fmt);
  applyFormatUI();
  if (state.slides.length) renderDeck();   // re-encaixa no novo formato
}

function collectInput() {
  return {
    produto: $("produto").value.trim(),
    oque: $("oque").value.trim(),
    resolve: $("resolve").value.trim(),
    diferencial: $("diferencial").value.trim(),
    valor: $("valor").value.trim(),
    qtd: Number($("qtd").value),
    gatilhos: selectedGatilhos(),
    tom: $("tom").value,
    template: $("template").value,
  };
}
function fillForm(input) {
  $("produto").value = input.produto || "";
  $("oque").value = input.oque || "";
  $("resolve").value = input.resolve || "";
  $("diferencial").value = input.diferencial || "";
  $("valor").value = input.valor || "";
  $("qtd").value = input.qtd || 8; $("qtdOut").textContent = $("qtd").value;
  $("tom").value = input.tom || "confronto";
  if (input.template) $("template").value = input.template;
  document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", (input.gatilhos || []).includes(c.dataset.key) ? "true" : "false"));
  $("gatCount").textContent = `${(input.gatilhos || []).length}/4`;
  updateFavStar();
}

// ─── Geração ─────────────────────────────────────────────────────────────────────
async function generate() {
  if (state.busy) return;
  const input = collectInput();
  if (!input.produto || !input.diferencial) { toast("Preencha produto e diferencial"); return; }
  state.busy = true; state.input = input;
  setState("loading"); showSkeleton(input.qtd);
  $("btnGerar").disabled = true; $("btnGerar").textContent = "Gerando…";
  try {
    const result = await generateCarousel(input);
    state.result = result; state.slides = result.slides;
    // "Template dos slides": se o usuário escolheu um estilo fixo, aplica em todos.
    if (input.template) state.slides.forEach((s) => (s.template = input.template));
    setHook(result.hook_score);
    renderDeck();
    setState("ready");
    $("btnExport").disabled = false; $("btnLimpar").disabled = false;
    persist();
  } catch (err) {
    $("errMsg").textContent = friendlyError(err);
    setState("error");
  } finally {
    state.busy = false; $("btnGerar").disabled = false; $("btnGerar").textContent = "Gerar carrossel";
  }
}
function friendlyError(err) {
  const m = err?.message || "Falha desconhecida.";
  if (/Chave recusada|GEMINI_API_KEY|API key/i.test(m)) return "Chave da API recusada ou ausente. Confira o GEMINI_API_KEY no .env e reinicie o servidor.";
  if (/Limite da API|429/i.test(m)) return "Você bateu o limite gratuito da API. Espere um minuto e tente de novo.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sem resposta do servidor. O npm start está rodando?";
  return "O modelo não devolveu um JSON válido. Tente de novo — às vezes a segunda sai limpa. (" + m + ")";
}

// ─── Deck ───────────────────────────────────────────────────────────────────────
function setState(s) {
  $("stateIdle").hidden = s !== "idle";
  $("stateError").hidden = s !== "error";
  $("deck").hidden = !(s === "ready" || s === "loading");
  $("counter").hidden = $("hookMeter").hidden = !(s === "ready");
}
function setHook(score) {
  $("hookMeter").hidden = false;
  $("hookFill").style.width = Math.max(0, Math.min(100, score)) + "%";
  $("hookVal").textContent = score || "—";
  $("hookFill").style.background = score >= 75 ? "var(--color-orange)" : "var(--color-red)";
}
function showSkeleton(n) {
  const deck = $("deck"); deck.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const card = el("div", "card skeleton");
    card.appendChild(el("div", "card__bar", `<span class="card__n">${String(i + 1).padStart(2, "0")}</span>`));
    card.appendChild(el("div", "card__frame"));
    deck.appendChild(card);
  }
}
function renumber() { state.slides.forEach((s, i) => (s.n = i + 1)); }
function renderDeck() {
  renumber();
  const deck = $("deck"); deck.dataset.ratio = state.format; deck.innerHTML = "";
  state.slides.forEach((slide, i) => deck.appendChild(renderCard(slide, i)));
  $("counterN").textContent = state.slides.length;
  refit();
}
function renderCard(slide, i) {
  const total = state.slides.length;
  const card = el("div", "card");
  card.draggable = true;
  card.dataset.i = i;

  const bar = el("div", "card__bar",
    `<span class="card__n">${String(i + 1).padStart(2, "0")}</span>
     <span class="card__tipo">${escapeHtml(slide.template)}</span>`);
  const tools = el("div", "card__tools");
  tools.append(
    tool("⟳", "Regenerar", () => regen(i)),
    tool("⭳", "Baixar PNG", () => exportPNG(slide, { n: i + 1, total, ratio: state.format })),
    tool("⧉", "Duplicar", () => duplicate(i)),
    tool("✕", "Remover", () => removeSlide(i)),
  );
  bar.appendChild(tools);

  const frame = el("div", "card__frame");
  const s = renderSlide(slide, { n: i + 1, total, ratio: state.format });
  frame.appendChild(s);
  frame.addEventListener("click", (e) => { if (!e.target.closest(".card__tool")) openEditor(i); });

  card.append(bar, frame);
  wireDrag(card);
  return card;
}
function tool(sym, title, fn) {
  const b = el("button", "card__tool", sym); b.title = title; b.type = "button";
  b.addEventListener("click", fn); return b;
}
function refit() {
  document.querySelectorAll("#deck .card:not(.skeleton)").forEach((card) => {
    const frame = card.querySelector(".card__frame");
    const s = frame.querySelector(".slide");
    if (s) { s.style.transform = "none"; autoFit(s); fitToFrame(s, frame); }
  });
}

// ─── Ações por slide ──────────────────────────────────────────────────────────────
async function regen(i) {
  if (state.busy) return;
  const card = document.querySelector(`.card[data-i="${i}"]`);
  card?.classList.add("skeleton");
  try {
    const ns = await regenerateSlide(state.input, state.slides[i], state.slides);
    state.slides[i] = { ...state.slides[i], ...ns };
    renderDeck(); persist();
  } catch (err) { toast("Regeneração falhou: " + friendlyError(err)); card?.classList.remove("skeleton"); }
}
function duplicate(i) { state.slides.splice(i + 1, 0, structuredClone(state.slides[i])); renderDeck(); persist(); }
function removeSlide(i) {
  if (state.slides.length <= 1) { toast("Precisa de pelo menos 1 slide"); return; }
  state.slides.splice(i, 1); renderDeck(); persist();
}

// ─── Drag reorder ─────────────────────────────────────────────────────────────────
let dragFrom = null;
function wireDrag(card) {
  card.addEventListener("dragstart", () => { dragFrom = Number(card.dataset.i); card.classList.add("dragging"); });
  card.addEventListener("dragend", () => { card.classList.remove("dragging"); document.querySelectorAll(".card").forEach((c) => c.classList.remove("dragover")); });
  card.addEventListener("dragover", (e) => { e.preventDefault(); card.classList.add("dragover"); });
  card.addEventListener("dragleave", () => card.classList.remove("dragover"));
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    const to = Number(card.dataset.i);
    if (dragFrom == null || dragFrom === to) return;
    const [moved] = state.slides.splice(dragFrom, 1);
    state.slides.splice(to, 0, moved);
    renderDeck(); persist();
  });
}

// ─── Editor inline (drawer) ───────────────────────────────────────────────────────
function openEditor(i) {
  const slide = state.slides[i];
  $("drawerTitle").textContent = `Slide ${i + 1} · ${slide.template}`;
  const body = $("drawerBody"); body.innerHTML = "";

  body.appendChild(editSelect("Template", slide.template, TEMPLATE_IDS, (v) => { slide.template = v; liveUpdate(i); }));
  ["kicker", "headline", "subheadline", "body", "destaque"].forEach((f) => {
    body.appendChild(editField(f, slide[f] || "", LIMITS[f], (v) => { slide[f] = v; liveUpdate(i); }));
  });
  if (["lista", "timeline", "comparativo"].includes(slide.template)) {
    body.appendChild(editArea("itens (um por linha)", (slide.itens || []).join("\n"), (v) => {
      slide.itens = v.split("\n").map((x) => x.trim()).filter(Boolean); liveUpdate(i);
    }));
  }
  showDrawer("drawer");
}
function editField(name, val, limit, onInput) {
  const wrap = el("div", "ed");
  const count = limit ? `<span class="count">0/${limit} palavras</span>` : "";
  wrap.innerHTML = `<label>${name}${count}</label>`;
  const input = name === "headline" || name === "body" || name === "subheadline"
    ? el("textarea") : el("input");
  if (input.tagName === "TEXTAREA") input.rows = name === "body" ? 3 : 2;
  input.className = "input"; input.value = val;
  const cnt = wrap.querySelector(".count");
  const upd = () => { if (cnt) { const w = input.value.trim().split(/\s+/).filter(Boolean).length; cnt.textContent = `${w}/${limit} palavras`; cnt.style.color = w > limit ? "var(--color-red)" : ""; } };
  input.addEventListener("input", () => { onInput(input.value); upd(); });
  wrap.appendChild(input); upd();
  return wrap;
}
function editArea(label, val, onInput) {
  const wrap = el("div", "ed", `<label>${label}</label>`);
  const ta = el("textarea", "input"); ta.rows = 5; ta.value = val;
  ta.addEventListener("input", () => onInput(ta.value));
  wrap.appendChild(ta); return wrap;
}
function editSelect(label, val, opts, onChange) {
  const wrap = el("div", "ed", `<label>${label}</label>`);
  const sel = el("select", "input");
  sel.innerHTML = opts.map((o) => `<option ${o === val ? "selected" : ""}>${o}</option>`).join("");
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.appendChild(sel); return wrap;
}
function liveUpdate(i) {
  const card = document.querySelector(`.card[data-i="${i}"]`);
  if (!card) return;
  const frame = card.querySelector(".card__frame");
  frame.innerHTML = "";
  const s = renderSlide(state.slides[i], { n: i + 1, total: state.slides.length, ratio: state.format });
  frame.appendChild(s); autoFit(s); fitToFrame(s, frame);
  card.querySelector(".card__tipo").textContent = state.slides[i].template;
  persist();
}

// ─── Drawers ──────────────────────────────────────────────────────────────────────
function showDrawer(id) { $(id).hidden = false; }
function hideDrawer(id) { $(id).hidden = true; }
$("drawerClose").addEventListener("click", () => hideDrawer("drawer"));
$("drawerScrim").addEventListener("click", () => hideDrawer("drawer"));
document.querySelectorAll('[data-close="caption"]').forEach((b) => b.addEventListener("click", () => hideDrawer("captionDrawer")));

// ─── Export ─────────────────────────────────────────────────────────────────────
function wireExport() {
  const btn = $("btnExport");
  btn.addEventListener("click", () => {
    if (!state.result) return;
    const menu = el("div", "export-menu");
    menu.style.cssText = "position:absolute;top:64px;right:16px;background:var(--color-paper);border:2px solid var(--ui-line-2);border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.3);z-index:50;overflow:hidden;";
    const item = (label, fn) => { const b = el("button", null, label); b.style.cssText = "display:block;width:100%;text-align:left;padding:12px 18px;border:none;background:none;font:500 14px var(--font-sans);cursor:pointer;"; b.onmouseenter = () => (b.style.background = "var(--color-paper-2)"); b.onmouseleave = () => (b.style.background = "none"); b.onclick = () => { menu.remove(); fn(); }; return b; };
    if (canShareFiles()) menu.append(item("Compartilhar imagens (Fotos/Instagram)", doShare));
    menu.append(
      item("Baixar ZIP (todos os PNG)", doZip),
      item("Copiar legenda + hashtags", doCopyCaption),
      item("Ver legenda + hashtags", openCaption),
    );
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", function off(e) { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener("click", off); } }), 0);
  });
}
async function doShare() {
  toast("Renderizando imagens…", 60000);
  try {
    const r = await sharePNGs(state.slides, state.slides.length, state.format, (a, b) => toast(`Renderizando ${a}/${b}…`, 60000));
    toast(r === "shared" ? "Pronto para compartilhar" : r === "cancelled" ? "Cancelado" : "Compartilhar não disponível — use o ZIP");
  } catch (err) { toast("Falhou: " + (err.message || err)); }
}
async function doZip() {
  toast("Renderizando PNGs…", 60000);
  try { await exportZIP(state.slides, state.slides.length, state.format, (a, b) => toast(`Renderizando ${a}/${b}…`, 60000)); toast("ZIP baixado"); }
  catch (err) { toast("Export falhou: " + (err.message || err)); }
}
async function doCopyCaption() { const ok = await copyText(captionText(state.result)); toast(ok ? "Legenda copiada" : "Não consegui copiar"); }
function openCaption() {
  const r = state.result;
  $("captionBody").innerHTML = `
    <div class="caption-block"><h4>Legenda</h4><pre>${escapeHtml(r.legenda)}</pre><button class="btn btn--mini" data-copy="legenda">copiar</button></div>
    <div class="caption-block"><h4>Hashtags</h4><pre>${escapeHtml((r.hashtags || []).map((h) => "#" + h.replace(/^#/, "")).join(" "))}</pre><button class="btn btn--mini" data-copy="tags">copiar</button></div>
    <div class="caption-block"><h4>1º comentário</h4><pre>${escapeHtml(r.primeiro_comentario)}</pre><button class="btn btn--mini" data-copy="com">copiar</button></div>`;
  $("captionBody").querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const map = { legenda: r.legenda, tags: (r.hashtags || []).map((h) => "#" + h.replace(/^#/, "")).join(" "), com: r.primeiro_comentario };
    const ok = await copyText(map[b.dataset.copy]); toast(ok ? "Copiado" : "Falhou");
  }));
  showDrawer("captionDrawer");
}

// ─── Persistência ─────────────────────────────────────────────────────────────────
function persist() {
  if (!state.result) return;
  const snapshot = { input: state.input, result: { ...state.result, slides: state.slides }, format: state.format, at: Date.now() };
  store.set("da_last", snapshot);
  const hist = store.get("da_history", []);
  hist.unshift({ produto: state.input.produto, at: snapshot.at });
  store.set("da_history", hist.slice(0, 20));
}
function restoreLast() {
  const snap = store.get("da_last", null);
  if (!snap?.result?.slides?.length) { setState("idle"); return; }
  state.input = snap.input; state.result = snap.result; state.slides = snap.result.slides;
  if (snap.format) { state.format = snap.format; applyFormatUI(); }
  fillForm(snap.input);
  setHook(snap.result.hook_score);
  renderDeck(); setState("ready"); $("btnExport").disabled = false; $("btnLimpar").disabled = false;
}

// ─── Utils ────────────────────────────────────────────────────────────────────────
let toastT;
function toast(msg, ms = 2200) {
  let t = document.querySelector(".toast"); if (t) t.remove();
  t = el("div", "toast", escapeHtml(msg)); document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms);
}
function flash(node) { node.animate([{ color: "var(--color-red)" }, { color: "" }], { duration: 600 }); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

init();
