// Generates the illustrated avatar presets into src/avatars/*.svg (soft, round-faced style with blushing cheeks).
import { mkdir, writeFile } from "node:fs/promises";

const SKIN = { s1:"#FBE3D0", s2:"#F3CBAA", s3:"#E2AE85", s4:"#C88B60", s5:"#9D6743", s6:"#6E4630" };
const HAIR = { black:"#26212D", dark:"#43302A", brown:"#7B5236", blonde:"#E6C17A", auburn:"#A7553B", gray:"#BDB7C4", lavender:"#B79CD6", pink:"#E9A6C3" };
const darken = (hex, k=0.82) => "#" + hex.slice(1).match(/../g).map(h => Math.round(parseInt(h,16)*k).toString(16).padStart(2,"0")).join("");

const backs = {
  long:  c => `<path d="M57,96 C52,58 78,42 100,42 C122,42 148,58 143,96 L152,176 C130,186 70,186 48,176Z" fill="${c}"/>`,
  bob:   c => `<path d="M55,98 C52,58 78,41 100,41 C122,41 148,58 145,98 L147,140 C130,149 70,149 53,140Z" fill="${c}"/>`,
  wavy:  c => `<path d="M56,96 C50,56 78,41 100,41 C122,41 150,56 144,96 C152,112 144,124 152,140 C158,156 146,170 150,182 L50,182 C54,170 42,156 48,140 C56,124 48,112 56,96Z" fill="${c}"/>`,
  afro:  c => `<g fill="${c}">${[[100,60,40],[66,74,26],[134,74,26],[58,104,22],[142,104,22],[80,46,24],[120,46,24],[62,128,16],[138,128,16]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`,
  bun:   c => `<circle cx="100" cy="36" r="17" fill="${c}"/>`,
  pony:  c => `<path d="M136,74 C162,84 166,124 152,150 C146,128 140,110 132,96Z" fill="${c}"/>`,
  none:  () => ""
};
const fronts = {
  bangs:  c => `<path d="M60,104 C56,60 80,45 100,45 C122,45 145,60 140,104 C137,94 134,86 129,80 C112,86 88,86 71,80 C66,86 63,95 60,104Z" fill="${c}"/>`,
  side:   c => `<path d="M60,104 C55,58 82,44 102,45 C124,46 146,62 140,102 C136,88 130,80 122,76 C104,78 84,70 74,62 C66,74 62,88 60,104Z" fill="${c}"/>`,
  short:  c => `<path d="M61,98 C56,58 82,43 104,45 C127,47 145,64 139,98 C137,86 132,78 124,73 C106,79 85,76 70,71 C65,79 62,88 61,98Z" fill="${c}"/>`,
  spiky:  c => `<path d="M61,96 C56,62 70,46 84,48 L88,38 L96,47 L104,36 L110,47 L120,40 L120,50 C138,56 146,72 139,96 C136,84 130,77 122,74 C106,79 86,77 71,72 C65,79 62,88 61,96Z" fill="${c}"/>`,
  buzz:   c => `<path d="M62,94 C61,63 81,52 100,52 C119,52 139,63 138,94 C131,76 117,69 100,69 C83,69 69,76 62,94Z" fill="${c}"/>`,
  curtain:c => `<path d="M60,104 C56,58 80,44 100,44 C120,44 144,58 140,104 C136,90 128,80 104,74 L100,64 L96,74 C72,80 64,90 60,104Z" fill="${c}"/>`,
  afro:   c => `<path d="M64,90 C66,66 82,58 100,58 C118,58 134,66 136,90 C126,78 114,74 100,74 C86,74 74,78 64,90Z" fill="${c}"/>`,
  none:   () => ""
};

function avatar({ id, bg, skin, hair="black", back="none", front="short", shirt="#AD8FC9", glasses=false, hijab=null, beard=false, freckles=false, pin=false, earrings=false, lashes=false }) {
  const S = SKIN[skin], Sd = darken(S, 0.9), H = HAIR[hair] || hair;
  const parts = [];
  parts.push(`<rect width="200" height="200" rx="100" fill="${bg}"/>`);
  if (hijab) parts.push(`<path d="M44,200 C40,146 50,58 100,46 C150,58 160,146 156,200Z" fill="${darken(hijab,0.9)}"/>`);
  else parts.push(backs[back](H));
  parts.push(`<path d="M32,200 C36,168 62,154 100,154 C138,154 164,168 168,200Z" fill="${shirt}"/>`);
  parts.push(`<path d="M88,128 L112,128 L112,156 C106,162 94,162 88,156Z" fill="${Sd}"/>`);
  if (!hijab) parts.push(`<ellipse cx="62" cy="106" rx="8" ry="10" fill="${Sd}"/><ellipse cx="138" cy="106" rx="8" ry="10" fill="${Sd}"/>`);
  if (earrings && !hijab) parts.push(`<circle cx="61" cy="119" r="3.5" fill="#F3D27A"/><circle cx="139" cy="119" r="3.5" fill="#F3D27A"/>`);
  parts.push(`<path d="M62,98 C62,66 80,54 100,54 C120,54 138,66 138,98 C138,128 122,146 100,146 C78,146 62,128 62,98Z" fill="${S}"/>`);
  if (hijab) parts.push(`<path d="M56,112 C52,64 74,44 100,44 C126,44 148,64 144,112 C140,84 124,64 100,64 C76,64 60,84 56,112Z" fill="${hijab}"/><path d="M60,118 C66,146 84,156 100,156 C116,156 134,146 140,118 C146,150 130,168 100,170 C70,168 54,150 60,118Z" fill="${hijab}"/>`);
  else parts.push(fronts[front](H));
  if (pin) parts.push(`<g transform="translate(122,70) rotate(-12)"><path d="M0,-8 L2.4,-2.5 L8,-2 L3.7,1.8 L5,7.5 L0,4.5 L-5,7.5 L-3.7,1.8 L-8,-2 L-2.4,-2.5Z" fill="#F3D27A" stroke="#F3D27A" stroke-width="2.5" stroke-linejoin="round"/></g>`);
  // brows, eyes, blush, nose, mouth
  const brow = hijab ? "#3B2E2A" : darken(H === HAIR.gray || H === HAIR.blonde ? "#8A6A4A" : H, 0.9);
  parts.push(`<path d="M76,93 Q84,89 91,92" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M109,92 Q116,89 124,93" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  parts.push(`<ellipse cx="84" cy="104" rx="4.2" ry="5.2" fill="#2A2230"/><ellipse cx="116" cy="104" rx="4.2" ry="5.2" fill="#2A2230"/><circle cx="85.5" cy="102" r="1.4" fill="#fff"/><circle cx="117.5" cy="102" r="1.4" fill="#fff"/>`);
  if (lashes) parts.push(`<path d="M79,100 L76,97 M121,100 L124,97" stroke="#2A2230" stroke-width="2" stroke-linecap="round"/>`);
  parts.push(`<ellipse cx="76" cy="118" rx="9" ry="5.5" fill="#F29BB0" opacity=".45"/><ellipse cx="124" cy="118" rx="9" ry="5.5" fill="#F29BB0" opacity=".45"/>`);
  if (freckles) parts.push(`<g fill="${darken(S,0.72)}" opacity=".7">${[[72,114],[78,117],[74,120],[122,114],[128,117],[126,120]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.3"/>`).join("")}</g>`);
  parts.push(`<path d="M98,112 Q100,115 102,112" stroke="${darken(S,0.75)}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  if (beard) parts.push(`<path d="M66,112 C68,138 84,152 100,152 C116,152 132,138 134,112 C130,128 118,134 100,134 C82,134 70,128 66,112Z" fill="${H}"/><path d="M90,126 Q100,122 110,126" stroke="${H}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  parts.push(`<path d="M93,127 Q100,132 107,127" stroke="#B8546C" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  if (glasses) parts.push(`<g fill="none" stroke="#2A2230" stroke-width="2.6"><rect x="71" y="94" width="25" height="20" rx="9"/><rect x="104" y="94" width="25" height="20" rx="9"/><path d="M96,102 Q100,99 104,102"/></g>`);
  return { id, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><clipPath id="c"><circle cx="100" cy="100" r="100"/></clipPath></defs><g clip-path="url(#c)">${parts.join("")}</g></svg>` };
}

const BG = ["#F6EFFA","#F6E2EC","#E6F0EA","#FBEFD9","#E4ECF7","#EFE3F6","#FCE8DC","#E9F3F6"];
const presets = [
  {skin:"s1", hair:"black", back:"bob", front:"bangs", shirt:"#AD8FC9", pin:true},
  {skin:"s2", hair:"blonde", back:"long", front:"side", shirt:"#D9A0BC", earrings:true},
  {skin:"s5", hair:"black", back:"afro", front:"afro", shirt:"#F1C27A", earrings:true},
  {skin:"s3", hair:"dark", back:"none", front:"short", shirt:"#14152D"},
  {skin:"s2", hair:"brown", back:"none", front:"short", shirt:"#7FA6C9", glasses:true},
  {skin:"s4", skin2:0, hijab:"#AD8FC9", shirt:"#8E6EB0"},
  {skin:"s6", hair:"black", back:"none", front:"buzz", shirt:"#D9A0BC", beard:true},
  {skin:"s1", hair:"auburn", back:"wavy", front:"curtain", shirt:"#9CC5A1", freckles:true},
  {skin:"s3", hair:"black", back:"pony", front:"bangs", shirt:"#E8A87C"},
  {skin:"s2", hair:"gray", back:"bun", front:"side", shirt:"#C9B6E0", glasses:true},
  {skin:"s5", hair:"dark", back:"none", front:"spiky", shirt:"#7FA6C9"},
  {skin:"s2", hijab:"#F2B8C6", shirt:"#14152D", glasses:true},
  {skin:"s1", hair:"lavender", back:"bob", front:"bangs", shirt:"#14152D", pin:true},
  {skin:"s4", hair:"black", back:"long", front:"curtain", shirt:"#AD8FC9", lashes:true},
  {skin:"s6", hair:"black", back:"afro", front:"afro", shirt:"#9CC5A1", glasses:true},
  {skin:"s3", hair:"brown", back:"none", front:"curtain", shirt:"#F1C27A"},
  {skin:"s1", hair:"blonde", back:"none", front:"short", shirt:"#9CC5A1", beard:true},
  {skin:"s5", hijab:"#2E3A5C", shirt:"#D9A0BC"},
  {skin:"s2", hair:"pink", back:"long", front:"bangs", shirt:"#C9B6E0", earrings:true},
  {skin:"s3", hair:"gray", back:"none", front:"short", shirt:"#14152D", glasses:true, beard:true},
  {skin:"s4", hair:"dark", back:"bun", front:"bangs", shirt:"#7FA6C9", freckles:true},
  {skin:"s6", hair:"dark", back:"wavy", front:"side", shirt:"#F1C27A", earrings:true},
  {skin:"s1", hair:"black", back:"none", front:"curtain", shirt:"#D9A0BC", glasses:true},
  {skin:"s4", hair:"black", back:"none", front:"buzz", shirt:"#AD8FC9"}
];

await mkdir("src/avatars", { recursive: true });
const ids = [];
for (const [i, p] of presets.entries()) {
  const id = `a${String(i + 1).padStart(2, "0")}`;
  const { svg } = avatar({ id, bg: BG[i % BG.length], ...p });
  await writeFile(`src/avatars/${id}.svg`, svg);
  ids.push(id);
}
await writeFile("src/avatars/index.json", JSON.stringify(ids));
console.log(`${ids.length} avatars written`);
