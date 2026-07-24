// gen-icons.js — gera os ícones do PWA a partir da logo (verde de fundo + emblema claro).
// Rode com: node scripts/gen-icons.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SVG = fs.readFileSync(path.join(ROOT, "assets", "logo_darkmode.svg"));
const GREEN = { r: 11, g: 61, b: 46, alpha: 1 }; // #0B3D2E

async function make(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(SVG, { density: 500 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: GREEN } })
    .composite([{ input: logo, gravity: "center" }])
    .png().toFile(path.join(ROOT, "assets", "icons", out));
  console.log("  ✓", out);
}

(async () => {
  await make(192, 0.18, "icon-192.png");
  await make(512, 0.18, "icon-512.png");
  await make(512, 0.30, "icon-512-maskable.png"); // mais folga: zona segura do Android/iOS
  await make(180, 0.16, "apple-touch-icon.png");  // iOS home screen
  console.log("ícones gerados em assets/icons/");
})().catch((e) => { console.error(e); process.exit(1); });
