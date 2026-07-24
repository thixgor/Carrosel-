// export.js — html2canvas-pro → PNG/ZIP, e copiar legenda.
import { renderSlide, autoFit, RATIO_H } from "./templates.js";

// html2canvas-pro (UMD) expõe um objeto de exports; a função fica em .default
const h2c = () => (window.html2canvas && (window.html2canvas.default || window.html2canvas));

// PROBLEMA: no clone que o html2canvas monta, ele resolve url() das fontes pela conta
// dele e às vezes cai no fallback → PNG com fonte errada. SOLUÇÃO à prova de falha:
// embutir os woff2 como data-URI (base64) e injetar esse @font-face DENTRO do clone via
// onclone. Sem fetch, sem resolução de caminho — a fonte certa está ali. Construído 1x.
const FONT_FACES = [
  ["Anton", 400, "anton-400.woff2"],
  ["Fraunces", 400, "fraunces-400.woff2"],
  ["Fraunces", 600, "fraunces-600.woff2"],
  ["Fraunces", 900, "fraunces-900.woff2"],
  ["Space Grotesk", 400, "spacegrotesk-400.woff2"],
  ["Space Grotesk", 500, "spacegrotesk-500.woff2"],
  ["Space Grotesk", 700, "spacegrotesk-700.woff2"],
  ["JetBrains Mono", 400, "jetbrainsmono-400.woff2"],
  ["JetBrains Mono", 700, "jetbrainsmono-700.woff2"],
];
function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
let fontCssPromise;
function embeddedFontCss() {
  if (fontCssPromise) return fontCssPromise;
  fontCssPromise = (async () => {
    const parts = await Promise.all(FONT_FACES.map(async ([f, w, file]) => {
      const buf = await (await fetch(`/assets/fonts/${file}`)).arrayBuffer();
      const uri = "data:font/woff2;base64," + toBase64(buf);
      return `@font-face{font-family:"${f}";font-weight:${w};font-style:normal;font-display:block;src:url(${uri}) format("woff2")}`;
    }));
    return parts.join("");
  })();
  return fontCssPromise;
}

// container escondido onde os slides são renderizados em tamanho real
function staging(h) {
  let el = document.getElementById("stagingExport");
  if (!el) {
    el = document.createElement("div");
    el.id = "stagingExport";
    el.style.cssText = "position:fixed;left:-20000px;top:0;pointer-events:none;";
    document.body.appendChild(el);
  }
  el.style.width = "1080px";
  el.style.height = h + "px";
  return el;
}

async function slideToCanvas(slide, ctx) {
  const ratio = ctx.ratio || "4x5";
  const h = RATIO_H[ratio] || RATIO_H["4x5"];
  const fontCss = await embeddedFontCss();
  await document.fonts.ready;           // fontes prontas no doc principal (para o auto-fit medir certo)
  const stage = staging(h);
  stage.innerHTML = "";
  const el = renderSlide(slide, { ...ctx, ratio });
  el.dataset.export = "true";          // congela o cursor do terminal
  el.style.transform = "none";
  stage.appendChild(el);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  autoFit(el);                          // mede DEPOIS das fontes (senão encaixa no fallback)
  await new Promise((r) => requestAnimationFrame(r));
  const render = h2c();
  if (typeof render !== "function") throw new Error("html2canvas não carregou (rode npm i e recarregue).");
  const canvas = await render(el, {
    width: 1080, height: h, scale: 1, backgroundColor: null, useCORS: true, logging: false,
    onclone: (doc) => {                 // fontes embutidas DENTRO do clone → sem fallback
      const st = doc.createElement("style");
      st.textContent = fontCss;
      doc.head.appendChild(st);
    },
  });
  stage.innerHTML = "";
  return canvas;
}

const canvasBlob = (canvas) => new Promise((res) => canvas.toBlob(res, "image/png"));

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPNG(slide, ctx) {
  const canvas = await slideToCanvas(slide, ctx);
  download(await canvasBlob(canvas), `slide-${String(ctx.n ?? slide.n).padStart(2, "0")}.png`);
}

// Web Share (iPhone): compartilha os PNG direto na folha de compartilhamento → Fotos/Instagram.
export function canShareFiles() {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob([""])], "x.png", { type: "image/png" })] })); }
  catch (_) { return false; }
}
export async function sharePNGs(slides, total, ratio, onProgress) {
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const canvas = await slideToCanvas(slides[i], { n: i + 1, total, ratio });
    const blob = await canvasBlob(canvas);
    files.push(new File([blob], `slide-${String(i + 1).padStart(2, "0")}.png`, { type: "image/png" }));
    onProgress?.(i + 1, slides.length);
  }
  if (!(navigator.canShare && navigator.canShare({ files }))) return "unsupported";
  try { await navigator.share({ files, title: "Carrossel DomineAqui" }); return "shared"; }
  catch (err) { return err?.name === "AbortError" ? "cancelled" : "error"; }
}

export async function exportZIP(slides, total, ratio, onProgress) {
  const zip = new window.JSZip();
  for (let i = 0; i < slides.length; i++) {
    const canvas = await slideToCanvas(slides[i], { n: i + 1, total, ratio });
    zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await canvasBlob(canvas));
    onProgress?.(i + 1, slides.length);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  download(blob, `carrossel-domineaqui-${ratio}.zip`);
}

export function captionText(result) {
  const tags = (result.hashtags || []).map((h) => "#" + String(h).replace(/^#/, "")).join(" ");
  return [result.legenda, "", tags, "", result.primeiro_comentario ? "1º comentário: " + result.primeiro_comentario : ""]
    .join("\n").trim();
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}
