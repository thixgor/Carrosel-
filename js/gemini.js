// gemini.js — chamada ao proxy, parse resiliente, retry, auto-crítica.
import { buildSystemPrompt, fewshotsAsText, GATILHOS } from "./prompts.js";

const ENDPOINT = "/api/generate";

function describeInput(input) {
  const g = (input.gatilhos || []).map((k) => GATILHOS[k]?.label).filter(Boolean);
  const linhas = [
    `Produto: ${input.produto}`,
    input.oque && `O que é: ${input.oque}`,
    input.resolve && `O que resolve: ${input.resolve}`,
    `Diferencial: ${input.diferencial}`,
    input.valor && `Valor: ${input.valor} (ative ancoragem na oferta)`,
    `Quantidade de slides: ${input.qtd}`,
    `Tom: ${input.tom}`,
    g.length && `Gatilhos: ${g.join(", ")}`,
    input.template && `Template padrão sugerido: ${input.template}`,
  ].filter(Boolean);
  return linhas.join("\n");
}

function buildUserPrompt(input) {
  return `${fewshotsAsText()}

AGORA A TAREFA REAL — mesmo formato de JSON dos exemplos:
${describeInput(input)}

Responda apenas com o JSON. Sem crase, sem markdown, sem texto antes ou depois.`;
}

// Extrai JSON mesmo se vier com cercas ```json ou texto em volta.
function parseJSONLoose(text) {
  if (!text) throw new Error("Resposta vazia do modelo.");
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(t); } catch (_) { /* tenta recorte */ }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Não achei JSON válido na resposta.");
  }
  return JSON.parse(t.slice(first, last + 1));
}

async function callGemini(system, user, { temperature = 0.9, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, user, temperature }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `HTTP ${res.status}`;
        // 4xx de chave/quota não adianta repetir
        if (res.status === 401 || res.status === 403) throw new Error(`Chave recusada: ${msg}`);
        if (res.status === 429) throw new Error(`Limite da API atingido: ${msg}`);
        throw new Error(msg);
      }
      const data = await res.json();
      return parseJSONLoose(data.text);
    } catch (err) {
      lastErr = err;
      if (/Chave recusada|Limite da API/.test(err.message)) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function normalize(json, input) {
  const slides = Array.isArray(json.slides) ? json.slides : [];
  slides.forEach((s, i) => {
    s.n = s.n ?? i + 1;
    s.template = s.template || s.template_sugerido || "brutal";
    s.kicker ??= ""; s.headline ??= ""; s.subheadline ??= "";
    s.body ??= ""; s.destaque ??= ""; s.itens = Array.isArray(s.itens) ? s.itens : [];
    s.tipo ??= "";
  });
  return {
    hook_score: Number(json.hook_score) || 0,
    gatilhos_aplicados: json.gatilhos_aplicados || [],
    slides,
    legenda: json.legenda || "",
    hashtags: json.hashtags || [],
    primeiro_comentario: json.primeiro_comentario || "",
    _input: input,
  };
}

// Segunda passada: se o hook ficou fraco, reescreve só o slide 1.
async function rewriteHook(result, input) {
  const system = buildSystemPrompt(input);
  const user = `O slide 1 abaixo teve hook_score ${result.hook_score}, abaixo de 75. Reescreva SÓ o slide 1 para parar o dedo: ≤9 palavras, sem exclamação, com número ou reversão, tensão imediata.
Slide 1 atual: ${JSON.stringify(result.slides[0])}
Contexto do produto:
${describeInput(input)}
Responda só com o JSON do novo slide 1 e o novo hook_score, no formato:
{"hook_score": 0-100, "slide": { ...campos do slide 1... }}`;
  try {
    const fix = await callGemini(system, user, { temperature: 1.0, retries: 1 });
    if (fix?.slide) {
      fix.slide.n = 1;
      fix.slide.template = fix.slide.template || fix.slide.template_sugerido || result.slides[0].template;
      fix.slide.itens = Array.isArray(fix.slide.itens) ? fix.slide.itens : [];
      result.slides[0] = { ...result.slides[0], ...fix.slide };
      result.hook_score = Number(fix.hook_score) || result.hook_score;
    }
  } catch (_) { /* mantém o original se a reescrita falhar */ }
  return result;
}

export async function generateCarousel(input) {
  const system = buildSystemPrompt(input);
  const user = buildUserPrompt(input);
  const json = await callGemini(system, user, { temperature: 0.9 });
  let result = normalize(json, input);
  if (result.hook_score < 75 && result.slides.length) {
    result = await rewriteHook(result, input);
  }
  return result;
}

// Regenera um único slide, mantendo o resto do carrossel como contexto.
export async function regenerateSlide(input, slide, allSlides) {
  const system = buildSystemPrompt(input);
  const resumo = allSlides.map((s) => `${s.n}. [${s.tipo}] ${s.headline || s.body}`).join("\n");
  const user = `Reescreva SÓ o slide ${slide.n} (tipo "${slide.tipo}", template "${slide.template}") de um carrossel que já existe. Mantenha coerência com o resto e não repita headlines.
Carrossel atual:
${resumo}
Produto:
${describeInput(input)}
Responda só com o JSON de um slide, no mesmo formato dos campos (n, tipo, kicker, headline, subheadline, body, itens, destaque, template_sugerido).`;
  const json = await callGemini(system, user, { temperature: 1.0, retries: 1 });
  const s = json.slide || json;
  s.n = slide.n;
  s.template = s.template || s.template_sugerido || slide.template;
  s.itens = Array.isArray(s.itens) ? s.itens : [];
  ["kicker", "headline", "subheadline", "body", "destaque", "tipo"].forEach((k) => (s[k] ??= ""));
  return s;
}
