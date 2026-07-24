// templates.js — registry dos 12 templates: injeta o JSON do Gemini nos slots.
import { TEMPLATES } from "./prompts.js";

const DARK = new Set(["brutal", "split", "lista", "revelacao", "oferta", "cta", "terminal", "checklist", "mito", "showcase"]);
const NOCHROME = new Set(["split", "cta", "mito"]);
const DEVICE_TYPES = new Set(["phone", "tablet"]);

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export const RATIO_H = { "4x5": 1350, "9x16": 1920 };   // altura em px por formato
export const isDark = (tpl) => DARK.has(tpl);
const logoFor = (tpl) => (isDark(tpl) ? "assets/logo_darkmode.svg" : "assets/logo.svg");
const pad = (x) => String(x).padStart(2, "0");

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
// destaca a primeira ocorrência de `destaque` no texto
function hl(text, destaque) {
  const safe = esc(text);
  if (!destaque) return safe;
  const d = esc(destaque);
  const i = safe.toLowerCase().indexOf(d.toLowerCase());
  if (i === -1) return safe;
  return safe.slice(0, i) + `<span class="tpl-destaque">${safe.slice(i, i + d.length)}</span>` + safe.slice(i + d.length);
}

const brand = (tpl) => `<div class="slide__brand"><img class="slide__logo" src="${logoFor(tpl)}" alt=""><span class="slide__handle">@domineaqui</span></div>`;
const index = (n, total) => `<div class="slide__index">${pad(n)} / ${pad(total)}</div>`;

// ─── Mockups de dispositivo (celular / tablet) ─────────────────────────────────
// O "3D ultrarrealista" vem de material (bisel metálico, brilho de vidro, sombra de
// contato) — NÃO de transform 3D, porque o html2canvas-pro achata matrix3d no export.
// Toda inclinação usa só rotação 2D, que é fiel no PNG.
function deviceScreen(m) {
  const inner = m.image
    ? `<img class="dev__img" src="${m.image}" alt="">`
    : `<div class="dev__ph"><span>adicione uma imagem</span></div>`;
  return `<div class="dev__screen">${inner}<div class="dev__glare"></div></div>`;
}
// Retorna só o dispositivo (.dev), com bisel, botões e tela. Sem posicionamento.
export function deviceHTML(mockup) {
  const m = mockup && DEVICE_TYPES.has(mockup.type) ? mockup : null;
  if (!m) return "";
  const angle = ["left", "right"].includes(m.angle) ? m.angle : "frontal";
  const top = m.type === "tablet"
    ? `<div class="dev__cam"></div>`
    : `<div class="dev__island"></div>`;
  return `<div class="dev dev--${m.type}" data-angle="${angle}">
      <span class="dev__side dev__side--power"></span>
      <span class="dev__side dev__side--volup"></span>
      <span class="dev__side dev__side--voldn"></span>
      ${top}${deviceScreen(m)}
    </div>`;
}
// Camada de overlay para colocar o dispositivo por cima de qualquer template.
export function renderMockupOverlay(mockup) {
  const dev = deviceHTML(mockup);
  if (!dev) return "";
  const pos = ["center", "left", "right", "bottom"].includes(mockup.pos) ? mockup.pos : "center";
  const size = Number(mockup.size) > 0 ? Number(mockup.size) : 1;
  return `<div class="mockup mockup--${pos}" style="--dev-size:${size}">${dev}</div>`;
}

// linhas → itens (fallback quando o modelo não mandou itens[])
const linesOf = (s) => (s.itens?.length ? s.itens : String(s.body || "").split(/\n|·|•/).map((x) => x.trim()).filter(Boolean));

function parseSides(items) {
  const eles = [], voce = [];
  items.forEach((raw, i) => {
    const [head, ...rest] = String(raw).split("::");
    const txt = rest.join("::").trim();
    if (txt) {
      const side = head.trim().toLowerCase();
      (side.startsWith("ele") || side.startsWith("concorr") ? eles : voce).push(txt);
    } else {
      (i % 2 === 0 ? eles : voce).push(head.trim());
    }
  });
  return { eles, voce };
}
function parseNodes(items) {
  return items.map((raw) => {
    const [when, ...rest] = String(raw).split("::");
    const what = rest.join("::").trim();
    return what ? { when: when.trim(), what } : { when: "", what: when.trim() };
  });
}

// ─── Renderers (retornam o innerHTML do conteúdo, sem chrome) ──────────────────
const R = {
  brutal: (s) => `
    ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
    <h2 class="tpl-headline">${hl(s.headline, s.destaque)}</h2>`,

  confissao: (s) => `
    ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
    <h2 class="tpl-headline">${hl(s.headline, s.destaque)}</h2>
    ${s.subheadline ? `<p class="tpl-sub">${esc(s.subheadline)}</p>` : ""}`,

  dado: (s) => `
    ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
    <div class="dado__num">${hl(s.headline, s.destaque)}</div>
    ${s.body ? `<p class="tpl-body">${hl(s.body, s.destaque)}</p>` : ""}`,

  split: (s) => `
    <div class="split__antes">
      <span class="split__tag">antes</span>
      <h2 class="tpl-headline">${esc(s.subheadline || s.body)}</h2>
    </div>
    <div class="split__depois">
      <span class="split__tag">depois</span>
      <h2 class="tpl-headline">${esc(s.headline)}</h2>
    </div>`,

  citacao: (s) => `
    <div class="citacao__mark">&ldquo;</div>
    <p class="tpl-body">${hl(s.body || s.headline, s.destaque)}</p>
    ${s.subheadline ? `<p class="tpl-sub">${esc(s.subheadline)}</p>` : ""}`,

  lista: (s) => {
    const rows = linesOf(s).slice(0, 5).map((t, i) =>
      `<div class="lista__row"><span class="lista__n">${pad(i + 1)}</span><span class="lista__txt">${esc(t)}</span></div>`).join("");
    return `
      ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
      <div class="lista__items">${rows}</div>`;
  },

  timeline: (s) => {
    const nodes = parseNodes(linesOf(s)).slice(0, 5).map((nd) =>
      `<div class="tl__node">${nd.when ? `<div class="tl__when">${esc(nd.when)}</div>` : ""}<div class="tl__what">${esc(nd.what)}</div></div>`).join("");
    return `
      ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
      <div class="tl">${nodes}</div>`;
  },

  comparativo: (s) => {
    const { eles, voce } = parseSides(linesOf(s));
    const col = (cls, head, mark, arr) =>
      `<div class="cmp__col cmp__col--${cls}"><div class="cmp__head">${esc(head)}</div>${arr.map((t) =>
        `<div class="cmp__item"><span class="cmp__mark">${mark}</span><span>${esc(t)}</span></div>`).join("")}</div>`;
    return `
      <h2 class="tpl-headline">${hl(s.headline, s.destaque)}</h2>
      <div class="cmp">
        ${col("eles", "eles", "✗", eles.length ? eles : ["—"])}
        ${col("voce", "você", "✓", voce.length ? voce : ["—"])}
      </div>`;
  },

  revelacao: (s) => `
    ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
    <h2 class="tpl-headline">${hl(s.headline, s.destaque)}</h2>
    ${s.body ? `<p class="tpl-body">${esc(s.body)}</p>` : ""}`,

  oferta: (s) => `
    ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
    ${s.subheadline ? `<div class="oferta__anchor">${esc(s.subheadline)}</div>` : ""}
    <div class="oferta__label">hoje</div>
    <div class="oferta__price">${esc(s.headline)}</div>
    ${s.body ? `<p class="tpl-body">${hl(s.body, s.destaque)}</p>` : ""}`,

  cta: (s) => `
    <img class="cta__logo" src="assets/logo_darkmode.svg" alt="DomineAqui">
    <h2 class="tpl-headline">${hl(s.headline, s.destaque)}</h2>
    ${s.subheadline ? `<div class="cta__btn">${esc(s.subheadline)}</div>` : ""}
    <div class="cta__url">${esc(s.body || "domineaqui.com.br")}</div>`,

  terminal: (s) => `
    <div class="term__prompt">${esc(s.kicker || "residente@domineaqui:~$")} <span class="term__sig">./run</span></div>
    <h2 class="tpl-headline">${hl(s.headline, s.destaque)}<span class="term__cursor"></span></h2>
    ${s.body ? `<p class="tpl-body">${esc(s.body)}</p>` : ""}`,

  // ─── Novos templates ─────────────────────────────────────────────────────────
  prontuario: (s) => {
    const rows = linesOf(s).slice(0, 4).map((r) => {
      const [l, ...rest] = String(r).split("::");
      const v = rest.join("::").trim();
      return `<div class="pront__row"><span class="pront__label">${esc(l.trim())}</span><span class="pront__val">${esc(v || l.trim())}</span></div>`;
    }).join("");
    return `
      <div class="pront__head"><span class="pront__doc">${esc(s.kicker || "prontuário")}</span><span class="pront__stamp">DomineAqui</span></div>
      <div class="pront__rows">${rows}</div>
      ${s.headline ? `<div class="pront__conduta"><span class="pront__ctlabel">conduta</span><p class="tpl-headline">${hl(s.headline, s.destaque)}</p></div>` : ""}`;
  },

  checklist: (s) => {
    const items = linesOf(s).slice(0, 6).map((t) =>
      `<div class="chk__row"><span class="chk__box">✓</span><span class="chk__txt">${esc(t)}</span></div>`).join("");
    return `
      ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
      ${s.headline ? `<h2 class="tpl-headline chk__title">${hl(s.headline, s.destaque)}</h2>` : ""}
      <div class="chk__list">${items}</div>`;
  },

  estatisticas: (s) => {
    const cells = linesOf(s).slice(0, 4).map((r) => {
      const [n, ...rest] = String(r).split("::");
      const lab = rest.join("::").trim();
      return `<div class="stat__cell"><div class="stat__num">${esc(n.trim())}</div><div class="stat__lab">${esc(lab)}</div></div>`;
    }).join("");
    return `
      ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
      ${s.headline ? `<h2 class="tpl-headline stat__title">${hl(s.headline, s.destaque)}</h2>` : ""}
      <div class="stat__grid">${cells}</div>`;
  },

  mito: (s) => `
    <div class="mito__band mito__band--mito"><span class="mito__tag">mito</span><p class="mito__text">${esc(s.subheadline || s.body)}</p></div>
    <div class="mito__band mito__band--verdade"><span class="mito__tag">verdade</span><p class="mito__text">${hl(s.headline, s.destaque)}</p></div>`,

  manchete: (s) => `
    <div class="manch__masthead"><span>${esc(s.kicker || "DomineAqui")}</span><span class="manch__date">edição especial</span></div>
    <h2 class="tpl-headline manch__hl">${hl(s.headline, s.destaque)}</h2>
    ${s.subheadline ? `<p class="manch__sub">${esc(s.subheadline)}</p>` : ""}
    ${s.body ? `<p class="tpl-body manch__lede">${esc(s.body)}</p>` : ""}`,

  bula: (s) => `
    <div class="bula__stripe"></div>
    <div class="bula__badge">${esc(s.kicker || "atenção")}</div>
    <h2 class="tpl-headline bula__hl">${hl(s.headline, s.destaque)}</h2>
    ${s.body ? `<p class="tpl-body">${esc(s.body)}</p>` : ""}`,

  // Showcase: o dispositivo é o herói. Texto compacto em cima, device no centro.
  showcase: (s) => {
    const m = (s.mockup && DEVICE_TYPES.has(s.mockup.type)) ? s.mockup : { ...(s.mockup || {}), type: "phone" };
    const size = Number(m.size) > 0 ? Number(m.size) : 1;
    return `
      ${s.kicker ? `<p class="tpl-kicker">${esc(s.kicker)}</p>` : ""}
      ${s.headline ? `<h2 class="tpl-headline show__hl">${hl(s.headline, s.destaque)}</h2>` : ""}
      <div class="show__stage" data-dev="${m.type}" style="--dev-size:${size}">${deviceHTML(m)}</div>
      ${s.body ? `<p class="tpl-body show__body">${esc(s.body)}</p>` : ""}`;
  },
};

// Constrói o elemento .slide completo a partir do slide (dados).
export function renderSlide(slide, ctx = {}) {
  const tpl = R[slide.template] ? slide.template : "brutal";
  const el = document.createElement("div");
  el.className = "slide";
  el.dataset.template = tpl;
  if (ctx.ratio === "9x16") el.dataset.ratio = "9x16";
  if (isDark(tpl)) el.dataset.surface = "dark";
  const total = ctx.total || 8;
  const chrome = NOCHROME.has(tpl) ? "" : index(ctx.n ?? slide.n, total) + brand(tpl);
  el.innerHTML = R[tpl](slide) + chrome;
  // Mockup como overlay: vale em qualquer template (menos showcase, que já desenha o
  // device no próprio layout). Fica absoluto, então não interfere no auto-fit do texto.
  if (tpl !== "showcase" && slide.mockup && DEVICE_TYPES.has(slide.mockup.type)) {
    el.insertAdjacentHTML("beforeend", renderMockupOverlay(slide.mockup));
  }
  return el;
}

// Encaixa texto grande dentro do canvas (auto-fit por overflow real, medido a 1080×1350).
export function autoFit(slideEl) {
  const targets = [...slideEl.querySelectorAll(".tpl-headline, .dado__num, .oferta__price, .tpl-body, .lista__txt, .tl__what, .split__tag, .chk__txt, .stat__num, .pront__val, .mito__text")];
  // idempotente: zera qualquer tamanho inline antes de medir (evita encolher em cascata
  // a cada resize/re-render)
  targets.forEach((t) => (t.style.fontSize = ""));
  const base = new Map();
  targets.forEach((t) => base.set(t, parseFloat(getComputedStyle(t).fontSize)));
  // O que medir: no split os painéis são absolutos e NÃO fazem o slide crescer, então
  // o overflow deles nunca era detectado. Medimos os painéis direto. Nos demais, o slide.
  const panels = [...slideEl.querySelectorAll(".split__antes, .split__depois")];
  const boxes = panels.length ? panels : [slideEl];
  const overflowing = () =>
    boxes.some((b) => b.scrollHeight > b.clientHeight + 2 || b.scrollWidth > b.clientWidth + 2) ||
    targets.some((t) => t.scrollWidth > t.clientWidth + 2);   // palavra mais larga que a caixa → encolhe
  let guard = 0;
  while (overflowing() && guard++ < 48) {
    targets.forEach((t) => {
      const cur = parseFloat(t.style.fontSize || getComputedStyle(t).fontSize);
      if (cur > base.get(t) * 0.34) t.style.fontSize = cur * 0.93 + "px";
    });
  }
}

// Ajusta a escala visual do slide dentro de uma moldura (o slide é sempre 1080px reais).
export function fitToFrame(slideEl, frameEl) {
  const scale = frameEl.clientWidth / 1080;
  slideEl.style.transform = `scale(${scale})`;
}
