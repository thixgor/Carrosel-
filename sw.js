// sw.js — service worker do PWA. Cacheia o app shell (funciona offline);
// nunca cacheia a API do Gemini. Suba o número da versão a cada deploy.
const VERSION = "domineaqui-v2";

const ASSETS = [
  "/", "/index.html", "/manifest.json",
  "/css/tokens.css", "/css/templates.css", "/css/app.css",
  "/js/app.js", "/js/gemini.js", "/js/prompts.js", "/js/templates.js", "/js/export.js",
  "/vendor/html2canvas.min.js", "/vendor/jszip.min.js",
  "/assets/logo.svg", "/assets/logo_darkmode.svg",
  "/assets/icons/icon-192.png", "/assets/icons/icon-512.png", "/assets/icons/apple-touch-icon.png",
  "/assets/fonts/anton-400.woff2",
  "/assets/fonts/fraunces-400.woff2", "/assets/fonts/fraunces-600.woff2", "/assets/fonts/fraunces-900.woff2",
  "/assets/fonts/spacegrotesk-400.woff2", "/assets/fonts/spacegrotesk-500.woff2", "/assets/fonts/spacegrotesk-700.woff2",
  "/assets/fonts/jetbrainsmono-400.woff2", "/assets/fonts/jetbrainsmono-700.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;              // POST /api/generate passa direto
  if (url.pathname.startsWith("/api/")) return;        // nunca cacheia a API

  // Documento: rede primeiro (pega updates), cai no cache offline.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }
  // Estáticos: cache primeiro, atualiza em segundo plano.
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
