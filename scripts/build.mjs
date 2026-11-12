// Build: fetch the K-drama catalog from TMDB (when TMDB_API_KEY is set), bundle the app, copy static files to dist/.
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { build } from "esbuild";
import vm from "node:vm";

const KEY = process.env.TMDB_API_KEY || "";
const REGIONS = (process.env.TMDB_REGIONS || "US,MX,CO,AR,CL,PE,ES").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
const MAX_PAGES = +(process.env.TMDB_PAGES || 150); // 20 shows per page
const EXCLUDE_GENRES = "10764|10767|10763|16|99|10762"; // reality, talk, news, animation, documentary, kids

// Map TMDB provider names to Nunchi platform keys.
function platformKey(name) {
  const n = name.toLowerCase();
  if (n.startsWith("netflix")) return "netflix";
  if (n.includes("viki")) return "viki";
  if (n.startsWith("disney")) return "disney";
  if (n.includes("prime video") || n === "amazon video") return n === "amazon video" ? null : "prime";
  if (n.startsWith("apple tv")) return n.includes("store") ? null : "apple";
  if (n === "hulu") return "hulu";
  if (n === "max" || n.startsWith("hbo max") || n === "max amazon channel") return "max";
  if (n.includes("kocowa")) return "kocowa";
  if (n.startsWith("paramount")) return "paramount";
  if (n.startsWith("crunchyroll")) return "crunchyroll";
  if (n.includes("tubi")) return "tubi";
  if (n.includes("onDemandKorea".toLowerCase()) || n.includes("ondemandkorea")) return "odk";
  return null;
}
const GENRE_RENAME = { "Action & Adventure": "Action", "Sci-Fi & Fantasy": "Fantasy", "War & Politics": "Historical", "Soap": "Drama", "Family": "Family" };

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tmdb(path, tries = 4) {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${KEY}`;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await sleep(1000 * (i + 1)); continue; }
    throw new Error(`TMDB ${r.status} for ${path}`);
  }
  throw new Error(`TMDB gave up on ${path}`);
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

async function catalogFromTmdb() {
  const ids = new Map();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await tmdb(`/discover/tv?with_origin_country=KR&with_original_language=ko&without_genres=${EXCLUDE_GENRES}&sort_by=popularity.desc&include_null_first_air_dates=false&page=${page}`);
    for (const s of r.results) if (s.poster_path && s.first_air_date) ids.set(s.id, s);
    if (page >= r.total_pages) break;
  }
  console.log(`TMDB: ${ids.size} Korean series found, fetching details…`);
  const list = await pool([...ids.keys()], 8, async id => {
    try {
      const d = await tmdb(`/tv/${id}?append_to_response=watch/providers`);
      const wp = d["watch/providers"]?.results || {};
      const providers = {}; const links = {};
      for (const reg of REGIONS) {
        const R = wp[reg]; if (!R) continue;
        const keys = new Set([...(R.flatrate || []), ...(R.ads || []), ...(R.free || [])].map(p => platformKey(p.provider_name)).filter(Boolean));
        if (keys.size) { providers[reg] = [...keys]; links[reg] = R.link; }
      }
      return {
        id: String(d.id), title: d.name, original: d.original_name !== d.name ? d.original_name : undefined,
        year: +d.first_air_date.slice(0, 4), eps: d.number_of_episodes || null,
        genres: d.genres.map(g => GENRE_RENAME[g.name] || g.name),
        score: Math.round(d.vote_average * 5) / 10, votes: d.vote_count, pop: Math.round(d.popularity),
        synopsis: (d.overview || "").slice(0, 600), poster: d.poster_path, backdrop: d.backdrop_path || undefined,
        providers, links
      };
    } catch (e) { console.warn(String(e)); return null; }
  });
  return list.filter(Boolean);
}

async function catalogFromSeed() {
  const ctx = { window: {} }; vm.runInNewContext(await readFile("scripts/seed.js", "utf8"), ctx);
  const slug = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ctx.window.NUNCHI_SEED.map(d => ({ id: slug(d.t), title: d.t, year: d.y, eps: d.e, genres: d.g, score: d.s, votes: 1000, pop: 0, synopsis: d.d, poster: null, providers: { US: d.p }, links: {} }));
}

await mkdir("dist/data", { recursive: true });
let dramas, source;
if (KEY) {
  try { dramas = await catalogFromTmdb(); source = "tmdb"; }
  catch (e) { console.error("TMDB fetch failed, falling back to the built-in catalog:", e); }
}
if (!dramas?.length) { dramas = await catalogFromSeed(); source = "seed"; REGIONS.splice(0, REGIONS.length, "US"); }
await writeFile("dist/data/dramas.json", JSON.stringify({ source, regions: REGIONS, builtAt: new Date().toISOString(), dramas }));
const perPlatform = {};
for (const d of dramas) for (const [reg, ps] of Object.entries(d.providers || {})) for (const p of ps) { perPlatform[reg] ||= {}; perPlatform[reg][p] = (perPlatform[reg][p] || 0) + 1; }
await writeFile("dist/data/meta.json", JSON.stringify({ source, total: dramas.length, withPoster: dramas.filter(d => d.poster).length, perPlatform, builtAt: new Date().toISOString() }, null, 1));
console.log(`Catalog: ${dramas.length} dramas from ${source}`, perPlatform);

await build({ entryPoints: ["src/app.js"], bundle: true, minify: true, format: "esm", target: "es2020", outfile: "dist/app.js" });
for (const f of ["index.html", "styles.css", "star.png", "logo.png"]) await copyFile(`src/${f}`, `dist/${f}`);
console.log("Build done.");
