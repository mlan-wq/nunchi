// Renders the home-screen app icons (rounded Nunchi star) into src/icons/. Run locally: node scripts/make-icons.mjs
import { createRequire } from "node:module"; import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
const STAR = "M50 14 L60 37 L85 40 L66 57 L71 82 L50 70 L29 82 L34 57 L15 40 L40 37 Z";
// star drawn like the logo: thick navy outline, lavender fill, with a soft highlight and a small sparkle
const icon = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8F1FC"/><stop offset="1" stop-color="#F3DDEA"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g transform="translate(50 51) scale(${scale}) translate(-50 -48)">
    <path d="${STAR}" fill="#14152D" stroke="#14152D" stroke-width="26" stroke-linejoin="round"/>
    <path d="${STAR}" fill="#AD8FC9" stroke="#AD8FC9" stroke-width="10" stroke-linejoin="round"/>
    <path d="M38 41 Q42 36 46 35" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3.2" stroke-linecap="round"/>
  </g>
  <path d="M80 13 C81 18 82.5 19.5 87.5 20.5 C82.5 21.5 81 23 80 28 C79 23 77.5 21.5 72.5 20.5 C77.5 19.5 79 18 80 13Z" fill="#F3D27A" stroke="#14152D" stroke-width="1.6" stroke-linejoin="round" transform="translate(${(1-scale)*30} ${(1-scale)*30})"/>
</svg>`;
await mkdir("src/icons", { recursive: true });
await writeFile("src/icons/icon.svg", icon(0.76));
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, scale] of [["apple-touch-icon.png",180,0.76],["icon-192.png",192,0.76],["icon-512.png",512,0.76],["icon-maskable-512.png",512,0.6]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${icon(scale)}`);
  await p.screenshot({ path: `src/icons/${name}` });
}
await b.close(); console.log("icons written");
