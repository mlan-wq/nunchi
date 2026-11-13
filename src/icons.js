// Nunchi's own icon set: tab bar line icons and illustrated badge medals.
const STAR = "M50 14 L60 37 L85 40 L66 57 L71 82 L50 70 L29 82 L34 57 L15 40 L40 37 Z";
const N = "#14152D";

/* ---------- tab bar (24px, currentColor; .f parts fill with lavender when active) ---------- */
const tab = body => `<svg class="nico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const TAB_ICONS = {
  home: tab(`<path class="f" d="${STAR}" transform="translate(-0.5 -0.6) scale(.25)" stroke-width="8"/><path d="M19.5 2.5 C19.8 4 20.3 4.5 21.8 4.8 C20.3 5.1 19.8 5.6 19.5 7.1 C19.2 5.6 18.7 5.1 17.2 4.8 C18.7 4.5 19.2 4 19.5 2.5Z" fill="currentColor" stroke-width="1"/>`),
  catalog: tab(`<circle class="f" cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 L20.5 20.5"/><path d="M10.5 7.6 L11.3 9.6 L13.4 9.8 L11.8 11.1 L12.3 13.2 L10.5 12.1 L8.7 13.2 L9.2 11.1 L7.6 9.8 L9.7 9.6Z" fill="currentColor" stroke-width="0.8"/>`),
  community: tab(`<path class="f" d="M4 5.5 h11 a2.5 2.5 0 0 1 2.5 2.5 v5.5 a2.5 2.5 0 0 1 -2.5 2.5 h-6 l-3.5 3 v-3 h-1.5 a2.5 2.5 0 0 1 -2.5 -2.5 v-5.5 a2.5 2.5 0 0 1 2.5 -2.5z"/><path d="M9.5 13 C7 11.3 6.6 10.2 7.1 9.3 C7.6 8.5 8.8 8.5 9.5 9.5 C10.2 8.5 11.4 8.5 11.9 9.3 C12.4 10.2 12 11.3 9.5 13Z" fill="currentColor" stroke-width="1"/><path d="M19.5 9.5 a2.5 2.5 0 0 1 2 2.5 v4.5 a2.5 2.5 0 0 1 -2.5 2.5 h-.5 v2.5 l-3 -2.5 h-3"/>`),
  "my-list": tab(`<rect class="f" x="2.5" y="6.5" width="19" height="13" rx="3.5"/><path d="M8.5 2.5 L12 6.2 L15.5 2.5"/><path d="M12 16 C9.6 14.4 9.1 13.3 9.6 12.4 C10.1 11.5 11.3 11.5 12 12.5 C12.7 11.5 13.9 11.5 14.4 12.4 C14.9 13.3 14.4 14.4 12 16Z" fill="currentColor" stroke-width="1"/>`),
  bell: tab(`<path class="f" d="M6 16.5 V11 a6 6 0 0 1 12 0 v5.5 l1.5 2 h-15z"/><path d="M10 21 a2.2 2.2 0 0 0 4 0"/><path d="M12 3 v2"/><path d="M16.8 6.6 C17.1 7.9 17.6 8.4 18.9 8.7" stroke-width="1.6"/>`),
  me: tab(`<circle class="f" cx="12" cy="8.5" r="4.2"/><path class="f" d="M4.5 20.5 C5.3 16.2 8.3 14.3 12 14.3 C15.7 14.3 18.7 16.2 19.5 20.5Z"/>`)
};

/* ---------- badge medals (64px) ---------- */
const medal = (bg, ring, art) => `<svg class="medal" viewBox="0 0 64 64" aria-hidden="true">
  <path d="${scallop()}" fill="${bg}" stroke="${N}" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="32" cy="32" r="22.5" fill="none" stroke="${ring}" stroke-width="1.6" stroke-dasharray="2.5 3.2" stroke-linecap="round"/>
  <g stroke="${N}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${art}</g>
  <path d="M51 6 C51.6 9 52.6 10 55.6 10.6 C52.6 11.2 51.6 12.2 51 15.2 C50.4 12.2 49.4 11.2 46.4 10.6 C49.4 10 50.4 9 51 6Z" fill="#F3D27A" stroke="${N}" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;
function scallop(){ // soft flower-shaped rosette
  const pts = [], n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + .5) / n) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a, r) => `${(32 + Math.cos(a) * r).toFixed(1)} ${(32 + Math.sin(a) * r).toFixed(1)}`;
    pts.push(`${i ? "" : `M${p(a0, 27)} `}Q${p(a1, 31.5)} ${p(a2, 27)}`);
  }
  return pts.join(" ") + "Z";
}
const heart = (x, y, s, fill) => `<path d="M${x} ${y+5*s} C${x-6*s} ${y+1*s} ${x-6.5*s} ${y-3*s} ${x-4*s} ${y-4.5*s} C${x-2.4*s} ${y-5.4*s} ${x-.8*s} ${y-4.6*s} ${x} ${y-3*s} C${x+.8*s} ${y-4.6*s} ${x+2.4*s} ${y-5.4*s} ${x+4*s} ${y-4.5*s} C${x+6.5*s} ${y-3*s} ${x+6*s} ${y+1*s} ${x} ${y+5*s}Z" fill="${fill}"/>`;

export const BADGE_ART = {
  // clapperboard with a heart
  "first-finale": medal("#F6E2EC", "#D9A0BC", `
    <rect x="17" y="29" width="30" height="18" rx="3.5" fill="#fff"/>
    <g transform="rotate(-14 17 29)"><rect x="17" y="21.5" width="30" height="7" rx="2" fill="${N}"/>
    <path d="M23 21.5 L20 28.5 M30 21.5 L27 28.5 M37 21.5 L34 28.5 M44 21.5 L41 28.5" stroke="#fff" stroke-width="2"/></g>
    ${heart(32, 38, .8, "#D9A0BC")}`),
  // popcorn bucket
  "binge": medal("#FBEFD9", "#E8A87C", `
    <circle cx="24.5" cy="27.5" r="5" fill="#FFF8E7"/><circle cx="39.5" cy="27.5" r="5" fill="#FFF8E7"/><circle cx="32" cy="24" r="6" fill="#FFF8E7"/><circle cx="27" cy="19" r="4.2" fill="#FFF8E7"/><circle cx="37" cy="19" r="4.2" fill="#FFF8E7"/>
    <path d="M20 31 L44 31 L41 49 L23 49Z" fill="#fff"/>
    <path d="M28 31.5 L28.6 48.5 M36 31.5 L35.4 48.5" stroke="#E36D8C" stroke-width="3.4"/>
    <path d="M20 31 L44 31 L41 49 L23 49Z" fill="none"/>`),
  // crown
  "veteran": medal("#EFE3F6", "#AD8FC9", `
    <path d="M17 42 L15.5 23 L25 31 L32 18.5 L39 31 L48.5 23 L47 42Z" fill="#F3D27A"/>
    <rect x="17" y="42" width="30" height="5.5" rx="2" fill="#E8B84F"/>
    <circle cx="32" cy="34" r="2.8" fill="#D9A0BC" stroke-width="1.6"/><circle cx="24" cy="36" r="2" fill="#AD8FC9" stroke-width="1.4"/><circle cx="40" cy="36" r="2" fill="#AD8FC9" stroke-width="1.4"/>`),
  // pencil writing
  "critic": medal("#E4ECF7", "#7FA6C9", `
    <path d="M18 46 C24 44 30 47 36 45" fill="none" stroke-width="1.8"/>
    <g transform="rotate(40 32 31)"><rect x="27.5" y="12" width="9" height="6" rx="1.5" fill="#D9A0BC"/><rect x="27.5" y="18" width="9" height="20" fill="#F3D27A"/><path d="M27.5 38 L36.5 38 L32 47Z" fill="#FBE3D0"/><path d="M30.6 44 L33.4 44 L32 47Z" fill="${N}"/></g>`),
  // golden fountain-pen nib
  "pen-gold": medal("#FBEFD9", "#E8B84F", `
    <path d="M32 15 C41 23 45 32 40.5 39 L32 49 L23.5 39 C19 32 23 23 32 15Z" fill="#F3D27A"/>
    <path d="M32 33 L32 47" stroke-width="2"/><circle cx="32" cy="31" r="3" fill="#fff"/>
    <path d="M26.5 26 C28 23 29.5 21 31 19.5" fill="none" stroke="#fff" stroke-width="2"/>`),
  // Nunchi rounded star
  "star-giver": medal("#F6EFFA", "#AD8FC9", `
    <path d="${STAR}" transform="translate(11 11.5) scale(.42)" fill="#F3D27A" stroke-width="5.5"/>
    <circle cx="27.5" cy="33" r="1.6" fill="${N}" stroke="none"/><circle cx="36.5" cy="33" r="1.6" fill="${N}" stroke="none"/>
    <path d="M30 37 Q32 39 34 37" fill="none" stroke-width="1.6"/>
    <ellipse cx="25" cy="36.5" rx="2.2" ry="1.3" fill="#F29BB0" stroke="none" opacity=".7"/><ellipse cx="39" cy="36.5" rx="2.2" ry="1.3" fill="#F29BB0" stroke="none" opacity=".7"/>`),
  // gem
  "gem": medal("#E9F3F6", "#7FC3D1", `
    <path d="M18.5 28 L25 19 L39 19 L45.5 28 L32 47Z" fill="#BEE6EF"/>
    <path d="M18.5 28 L45.5 28 M25 19 L28.5 28 L32 47 L35.5 28 L39 19 M28.5 28 L32 19 L35.5 28" fill="none" stroke-width="1.6"/>
    <path d="M22 27 L26 21.5" stroke="#fff" stroke-width="2"/>`),
  // gat: the traditional Joseon scholar hat
  "joseon": medal("#E6F0EA", "#9CC5A1", `
    <ellipse cx="32" cy="39" rx="19" ry="5" fill="#3A3A55"/>
    <path d="M25 38.5 L26 22.5 C29 20.5 35 20.5 38 22.5 L39 38.5Z" fill="#3A3A55"/>
    <path d="M26.3 26 C29.5 27.2 34.5 27.2 37.7 26" fill="none" stroke="#AD8FC9" stroke-width="2.4"/>
    <path d="M22 41 C22.5 45 23.5 48 25 50.5 M42 41 C41.5 45 40.5 48 39 50.5" fill="none" stroke-width="1.6"/>
    <circle cx="25" cy="50.5" r="1.8" fill="#D9A0BC" stroke-width="1.2"/><circle cx="39" cy="50.5" r="1.8" fill="#D9A0BC" stroke-width="1.2"/>`),
  // compass
  "explorer": medal("#FCE8DC", "#E8A87C", `
    <circle cx="32" cy="32" r="15" fill="#fff"/>
    <path d="M32 19.5 L36 32 L32 44.5 L28 32Z" fill="#fff"/><path d="M32 19.5 L36 32 L28 32Z" fill="#E36D8C"/>
    <circle cx="32" cy="32" r="2" fill="${N}" stroke="none"/>
    <path d="M32 15.5 L32 17.5 M48.5 32 L46.5 32 M32 48.5 L32 46.5 M15.5 32 L17.5 32" stroke-width="1.8"/>`),
  // cassette tape
  "classic": medal("#F6E2EC", "#D9A0BC", `
    <rect x="15" y="21" width="34" height="23" rx="3.5" fill="#AD8FC9"/>
    <rect x="19" y="25" width="26" height="10" rx="2" fill="#fff"/>
    <circle cx="25.5" cy="30" r="2.6" fill="#fff"/><circle cx="38.5" cy="30" r="2.6" fill="#fff"/><path d="M28.5 30 L35.5 30" stroke-width="1.6"/>
    <path d="M22 44 L24.5 38.5 L39.5 38.5 L42 44" fill="#fff"/>`),
  // butterfly
  "social": medal("#EFE3F6", "#AD8FC9", `
    <path d="M31 31 C25 18 15 18 16.5 26 C17.5 31 24 33 31 32Z" fill="#D9A0BC"/>
    <path d="M33 31 C39 18 49 18 47.5 26 C46.5 31 40 33 33 32Z" fill="#AD8FC9"/>
    <path d="M31 33 C24 34 19 38 21.5 43 C24 46.5 29 41 31 35Z" fill="#F6C3D5"/>
    <path d="M33 33 C40 34 45 38 42.5 43 C40 46.5 35 41 33 35Z" fill="#C9B6E0"/>
    <path d="M32 26 L32 44" stroke-width="3"/><path d="M31 25 C30 21 28 19 26.5 18.5 M33 25 C34 21 36 19 37.5 18.5" fill="none" stroke-width="1.6"/>`),
  // heart with sparkle
  "fan-fav": medal("#F6EFFA", "#AD8FC9", `
    ${heart(32, 34, 2.3, "#AD8FC9")}
    <path d="M25 27.5 C25.5 26 26.5 25 28 24.5" fill="none" stroke="#fff" stroke-width="2.2"/>`)
};
