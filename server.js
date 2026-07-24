// server.js — Express mínimo: serve os estáticos e faz proxy do Gemini (esconde a chave).
const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5173;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const KEY = process.env.GEMINI_API_KEY || "";

app.use(express.json({ limit: "1mb" }));

// Estáticos do projeto (dotfiles ignorados por padrão → .env nunca é servido).
app.use(express.static(__dirname, { dotfiles: "ignore", extensions: ["html"] }));

// Libs de terceiros servidas a partir de node_modules (offline, sem CDN).
const fs = require("fs");
function serveDep(route, relFile) {
  const file = path.join(__dirname, "node_modules", relFile);
  if (fs.existsSync(file)) app.get(route, (_req, res) => res.sendFile(file));
  else console.warn(`[aviso] não achei ${relFile} — rode "npm i"`);
}
serveDep("/vendor/html2canvas.min.js", "html2canvas-pro/dist/html2canvas-pro.min.js");
serveDep("/vendor/jszip.min.js", "jszip/dist/jszip.min.js");

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL, hasKey: Boolean(KEY) }));

// Proxy do Gemini: recebe {system, user, temperature}, devolve {text}.
app.post("/api/generate", async (req, res) => {
  if (!KEY) return res.status(500).json({ error: "GEMINI_API_KEY ausente. Preencha o .env e reinicie o servidor." });
  const { system, user, temperature = 0.9 } = req.body || {};
  if (!user) return res.status(400).json({ error: "Falta o campo 'user' no corpo da requisição." });

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
      const msg = data?.error?.message || `Gemini respondeu ${r.status}`;
      return res.status(r.status).json({ error: msg });
    }
    const cand = data?.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text) {
      const reason = cand?.finishReason || data?.promptFeedback?.blockReason || "sem conteúdo";
      return res.status(502).json({ error: `O modelo não retornou texto (${reason}).` });
    }
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: "Falha ao falar com o Gemini: " + (err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`\n  DomineAqui Carousel Engine`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  modelo: ${MODEL}   chave: ${KEY ? "carregada" : "FALTANDO (.env)"}\n`);
});
