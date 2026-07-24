// api/health.js — checagem rápida: confirma que a função roda e se a chave existe.
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
};
