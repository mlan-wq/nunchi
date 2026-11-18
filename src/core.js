// Shared state, constants and helpers.
/* ---------- PLATFORMS ---------- */
export const PLATFORMS = {
  netflix:{name:"Netflix", color:"#B20710", letter:"N", url:q=>`https://www.netflix.com/search?q=${q}`},
  viki:{name:"Viki", color:"#0B7FC0", letter:"V", url:q=>`https://www.viki.com/search?q=${q}`},
  disney:{name:"Disney+", color:"#0E2A9E", letter:"D+", url:q=>`https://www.disneyplus.com/search?q=${q}`},
  prime:{name:"Prime Video", color:"#1A6E8C", letter:"P", url:q=>`https://www.amazon.com/s?k=${q}&i=instant-video`},
  apple:{name:"Apple TV+", color:"#2B2B31", letter:"tv", url:q=>`https://tv.apple.com/search?term=${q}`},
  hulu:{name:"Hulu", color:"#14804A", letter:"H", url:q=>`https://www.hulu.com/search?q=${q}`},
  max:{name:"Max", color:"#2A2FD1", letter:"M", url:q=>`https://play.max.com/search?q=${q}`},
  kocowa:{name:"Kocowa", color:"#6C2BD9", letter:"K", url:q=>`https://www.kocowa.com/en_us/search?keyword=${q}`},
  paramount:{name:"Paramount+", color:"#0057B8", letter:"P+", url:q=>`https://www.paramountplus.com/search/?q=${q}`},
  crunchyroll:{name:"Crunchyroll", color:"#C4520F", letter:"C", url:q=>`https://www.crunchyroll.com/search?q=${q}`},
  tubi:{name:"Tubi", color:"#5B21B6", letter:"T", url:q=>`https://tubitv.com/search/${q}`},
  odk:{name:"OnDemandKorea", color:"#0F766E", letter:"O", url:q=>`https://www.ondemandkorea.com/en/search?q=${q}`}
};
export const COUNTRY = {US:"United States",MX:"México",CO:"Colombia",AR:"Argentina",CL:"Chile",PE:"Perú",ES:"España",BR:"Brasil",VE:"Venezuela",EC:"Ecuador",CA:"Canada",GB:"United Kingdom"};
export const GRADS = [["#D8CCE6","#8B7C9C"],["#F1C6D8","#A8607F"],["#C9BAD6","#5E4F78"],["#B8C4E6","#4A5482"],["#F3D9C4","#B07A62"],["#CDE3DA","#5E8A7C"],["#E6C8E8","#7C4E86"],["#A9A5B5","#3D3A55"]];
export const STATUS = {want:"Want to watch", watching:"Watching", done:"Finished"};
export const IMG = (p, size="w342") => p ? `https://image.tmdb.org/t/p/${size}${p}` : null;


export const S = { CAT:{source:"seed", regions:["US"], dramas:[]}, DRAMAS:[], BYID:new Map(), region:"US", me:null, identityOn:true, listTab:"all", profileTab:"favorites", profileSort:"recent", profileStars:"all", members:null };
// Profile-picture presets, grouped for the picker (images in /avatars/presets/).
const AV = n => `/avatars/presets/${n}.jpg`;
export const AVATAR_GROUPS = [
  { key:"characters", name:"Characters", items: Array.from({length:24}, (_,i)=>AV(`char-${String(i+1).padStart(2,"0")}`)) },
  { key:"food", name:"Food", items: ["kimchi-stew","bibimbap","tteokbokki","kimbap","ramyeon","jajangmyeon","fried-chicken","corn-dog","hotteok","bungeoppang","bingsu","dalgona"].map(n=>AV(`food-${n}`)) },
  { key:"snacks", name:"Snacks & drinks", items: [...["banana-milk","strawberry-milk","pepero","tteok-skewers","cup-ramyeon","samgak-kimbap","strawberry-cake"].map(n=>AV(`snack-${n}`)), AV("drink-soju"), AV("drink-makgeolli")] },
  { key:"places", name:"Places & things", items: [...["cherry-blossoms","palace","namsan-tower","hanok"].map(n=>AV(`place-${n}`)), ...["camera","headphones","kdrama-books","clapperboard","umbrella","varsity-jacket","doctor-coat","gavel","crown","lantern"].map(n=>AV(`thing-${n}`))] }
];
export const AVATARS = AVATAR_GROUPS[0].items; // default faces for people who haven't picked one
export const BANNERS = [
  {id:"canola-fields", name:"Canola fields"}, {id:"tangerine-grove", name:"Tangerine grove"}, {id:"first-snow", name:"First snow"},
  {id:"hanok-night", name:"Hanok night"}, {id:"han-river", name:"Han River sunset"}, {id:"cherry-blossoms", name:"Cherry blossoms"},
  {id:"seaside-village", name:"Seaside village"}, {id:"rooftop-night", name:"Rooftop date"}, {id:"rainy-bus-stop", name:"Rainy bus stop"},
  {id:"convenience-store", name:"Late-night store"}
];
/* ---------- HELPERS ---------- */
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const hash = s => { let h=0; for (const c of String(s)) h=(h*31+c.charCodeAt(0))>>>0; return h; };
export const starSvg = (fill, cls="star") => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#rstar" fill="${fill}" stroke="${fill}"/></svg>`;
export const ls = { get(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
export function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"),2200); }
export const plats = d => d.providers?.[S.region] || [];
export const weighted = d => (d.votes*d.score + 40*3.6)/(d.votes+40);          // keeps 3-vote shows from topping the ranking
export const byWeighted = (a,b) => weighted(b)-weighted(a);
export const timeAgo = t => { const s=(Date.now()-t)/1000; if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; if(s<2592000) return `${Math.floor(s/86400)}d ago`; return new Date(t).toLocaleDateString(); };

let refresher = null; // set by app.js: refreshes an expired login token
export const setRefresher = f => { refresher = f; };
export async function api(path, opts={}, retried=false){
  const r = await fetch(`/api/${path}`, { credentials:"same-origin", ...opts, headers:{ ...(opts.body && !(opts.body instanceof Blob) ? {"content-type":"application/json"} : {}), ...(opts.headers||{}) } });
  if (r.status===401 && !retried && refresher && S.me) { if (await refresher().catch(()=>null)) return api(path, opts, true); }
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Something went wrong (${r.status}).`), {status:r.status});
  return data;
}


