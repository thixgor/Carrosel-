// api/generate.js — Função serverless da Vercel: proxy do Gemini (esconde a chave).
// Equivalente ao POST /api/generate do server.js, mas no formato que a Vercel roda
// (o server.js Express é só para desenvolvimento local com `npm start`).
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido. Use POST." });
    return;
  }

  const KEY = process.env.GEMINI_API_KEY || "";
  const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  if (!KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY ausente. Adicione a variável de ambiente no projeto da Vercel e faça o redeploy." });
    return;
  }

  // A Vercel já entrega req.body parseado quando o content-type é JSON; caímos para
  // JSON.parse manual se vier como string.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch (_) { body = {}; } }
  body = body || {};
  const { system, user, temperature = 0.9 } = body;
  if (!user) {
    res.status(400).json({ error: "Falta o campo 'user' no corpo da requisição." });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 8192 },
  };
  if (system) payload.system_instruction = { parts: [{ text: system }] };

  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json();
    if (!r.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : `Gemini respondeu ${r.status}`;
      res.status(r.status).json({ error: msg });
      return;
    }
    const cand = data && data.candidates && data.candidates[0];
    const text = (cand && cand.content && cand.content.parts ? cand.content.parts.map((p) => p.text).join("") : "") || "";
    if (!text) {
      const reason = (cand && cand.finishReason) || (data && data.promptFeedback && data.promptFeedback.blockReason) || "sem conteúdo";
      res.status(502).json({ error: `O modelo não retornou texto (${reason}).` });
      return;
    }
    res.status(200).json({ text });
  } catch (err) {
    res.status(502).json({ error: "Falha ao falar com o Gemini: " + (err.message || err) });
  }
};
