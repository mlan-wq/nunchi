import { getUser, login, signup, logout, oauthLogin, handleAuthCallback, getSettings, requestPasswordRecovery, updateUser, acceptInvite, onAuthChange } from "@netlify/identity";

/* ---------- PLATFORMS ---------- */
const PLATFORMS = {
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
const COUNTRY = {US:"United States",MX:"México",CO:"Colombia",AR:"Argentina",CL:"Chile",PE:"Perú",ES:"España",BR:"Brasil",VE:"Venezuela",EC:"Ecuador",CA:"Canada",GB:"United Kingdom"};
const GRADS = [["#D8CCE6","#8B7C9C"],["#F1C6D8","#A8607F"],["#C9BAD6","#5E4F78"],["#B8C4E6","#4A5482"],["#F3D9C4","#B07A62"],["#CDE3DA","#5E8A7C"],["#E6C8E8","#7C4E86"],["#A9A5B5","#3D3A55"]];
const STATUS = {want:"Want to watch", watching:"Watching", done:"Finished"};
const IMG = (p, size="w342") => p ? `https://image.tmdb.org/t/p/${size}${p}` : null;

/* ---------- STATE ---------- */
let CAT = {source:"seed", regions:["US"], dramas:[]};
let DRAMAS = [], BYID = new Map();
let region = "US";
let me = null;            // my profile from /api/me
let identityOn = true;    // false when Netlify Identity isn't enabled on this site
const catState = {q:"", plat:"all", genre:"all", sort:"popular", decade:"all", limit:60};
let listTab = "all";

/* ---------- HELPERS ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hash = s => { let h=0; for (const c of String(s)) h=(h*31+c.charCodeAt(0))>>>0; return h; };
const starSvg = (fill, cls="star") => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#rstar" fill="${fill}" stroke="${fill}"/></svg>`;
const ls = { get(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"),2200); }
const plats = d => d.providers?.[region] || [];
const weighted = d => (d.votes*d.score + 40*3.6)/(d.votes+40);          // keeps 3-vote shows from topping the ranking
const byWeighted = (a,b) => weighted(b)-weighted(a);
const timeAgo = t => { const s=(Date.now()-t)/1000; if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; if(s<2592000) return `${Math.floor(s/86400)}d ago`; return new Date(t).toLocaleDateString(); };

async function api(path, opts={}){
  const r = await fetch(`/api/${path}`, { credentials:"same-origin", ...opts, headers:{ ...(opts.body && !(opts.body instanceof Blob) ? {"content-type":"application/json"} : {}), ...(opts.headers||{}) } });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Something went wrong (${r.status}).`), {status:r.status});
  return data;
}

/* ---------- COMPONENTS ---------- */
function posterHtml(d, tag){
  const [a,b] = GRADS[hash(d.id)%GRADS.length];
  const top = `<div class="p-top">${tag?`<span class="p-tag">${tag}</span>`:"<span></span>"}<span>${d.poster?"":d.year}</span></div>`;
  if (d.poster) return `<div class="poster" style="background:${b}"><img class="cover" src="${IMG(d.poster)}" alt="${esc(d.title)} poster" loading="lazy">${top}<span></span></div>`;
  return `<div class="poster" style="background:linear-gradient(170deg,${a} 0%,${b} 100%)"><img class="p-star" src="/star.png" alt="">${top}<div class="p-name">${esc(d.title)}</div></div>`;
}
const platChips = d => `<div class="plats">${plats(d).map(p=>`<span class="plat" style="background:${PLATFORMS[p].color}">${PLATFORMS[p].name}</span>`).join("")}</div>`;
function cardHtml(d, tag){
  return `<a class="card" href="#drama-${d.id}">${posterHtml(d, tag)}
    <div class="t-title">${esc(d.title)}</div>
    <div class="t-meta">${starSvg("var(--lavender)")}<span class="rating">${d.score.toFixed(1)}</span> · ${esc(d.genres[0]||"Drama")} · ${d.year}</div>
    ${platChips(d)}</a>`;
}
function thumbHtml(d){
  const [a,b] = GRADS[hash(d.id)%GRADS.length];
  return d.poster ? `<div class="rank-thumb"><img src="${IMG(d.poster,"w154")}" alt="" loading="lazy"></div>` : `<div class="rank-thumb" style="background:linear-gradient(160deg,${a},${b})"></div>`;
}
function rankRows(list){
  return list.map((d,i)=>`<a class="rank-row" href="#drama-${d.id}">
    <div class="rank-num">${String(i+1).padStart(2,"0")}</div>${thumbHtml(d)}
    <div class="rank-body"><div class="rank-title">${esc(d.title)}</div><div class="rank-meta">${d.genres.slice(0,2).join(" · ")} · ${d.year}</div></div>
    ${platChips(d)}<div class="rank-score">${starSvg("#fff")}${d.score.toFixed(1)}</div></a>`).join("");
}
function avatarHtml(u, size=42){
  const letter = esc((u?.name||u?.handle||"?")[0].toUpperCase());
  return u?.avatar ? `<img class="avatar" src="${esc(u.avatar)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;background:${["var(--lavender)","var(--pink)","#8E6EB0","#7C8BC4"][hash(u?.handle||"")%4]};font-size:${size*0.42}px">${letter}</span>`;
}
const starsRow = r => `<span class="mini-stars" aria-label="${r} out of 5">${[1,2,3,4,5].map(i=>starSvg(i<=r?"var(--lavender-dark)":i-0.5<=r?"var(--lavender)":"var(--line)")).join("")}</span>`;
function reviewCard(r, showDrama=true){
  const d = BYID.get(r.dramaId);
  return `<div class="review-card"><div class="review-top">
    <a href="#u-${esc(r.user.handle)}">${avatarHtml(r.user)}</a>
    <div style="min-width:0"><a class="r-user" href="#u-${esc(r.user.handle)}">${esc(r.user.name)} <span class="handle">@${esc(r.user.handle)}</span></a>
    <div class="r-meta">${showDrama&&d?`reviewed <a href="#drama-${d.id}"><b>${esc(d.title)}</b></a> · `:""}${r.rating?starsRow(r.rating):""} · ${timeAgo(r.at)}</div></div></div>
    ${r.text?`<p class="review-quote">${esc(r.text)}</p>`:""}</div>`;
}
const allGenres = () => { const c={}; DRAMAS.forEach(d=>d.genres.forEach(g=>c[g]=(c[g]||0)+1)); return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]); };

/* ---------- BADGES ---------- */
function badgesFor(p, reviewsCount){
  const list = Object.entries(p.list||{});
  const done = list.filter(([,e])=>e.status==="done").map(([id])=>BYID.get(id)).filter(Boolean);
  const genres = new Set(done.flatMap(d=>d.genres));
  const gems = done.filter(d=>d.votes<150 && d.score>=3.8).length;
  const hist = done.filter(d=>d.genres.includes("Historical")).length;
  const oldies = done.filter(d=>d.year<2010).length;
  const rated = list.filter(([,e])=>e.rating).length;
  const B = [
    ["First finale", "Finished your first K-drama", done.length>=1],
    ["Binge royalty", "Finished 10 K-dramas", done.length>=10],
    ["Drama veteran", "Finished 50 K-dramas", done.length>=50],
    ["Critic", "Wrote your first review", reviewsCount>=1],
    ["Pen of gold", "Wrote 10 reviews", reviewsCount>=10],
    ["Star giver", "Rated 25 dramas", rated>=25],
    ["Hidden gem hunter", "Finished 3 hidden gems", gems>=3],
    ["Joseon scholar", "Finished 3 historical dramas", hist>=3],
    ["Genre explorer", "Finished dramas in 6 genres", genres.size>=6],
    ["Classic soul", "Finished 3 dramas from before 2010", oldies>=3]
  ];
  return B.map(([name,desc,got])=>({name,desc,got}));
}

/* ---------- AUTH UI ---------- */
function renderAuthSlot(){
  const slot = $("#authSlot");
  if (me) slot.innerHTML = `<a class="me-pill" href="#u-${esc(me.handle)}" title="Your profile">${avatarHtml(me,34)}<span>${esc(me.name)}</span></a>`;
  else slot.innerHTML = `<button class="list-pill" data-act="login">Log in</button>`;
}
let authMode = "login", settings = null;
async function openAuth(mode="login", note=""){
  authMode = mode;
  if (!identityOn){ toast("Accounts aren't switched on for this site yet."); return; }
  try { settings ||= await getSettings(); } catch { settings = {providers:{}}; }
  const providers = Object.entries(settings.providers||{}).filter(([k,on])=>on && k!=="email").map(([k])=>k);
  const dlg = $("#authDialog");
  const titles = {login:"Welcome back", signup:"Join Nunchi", forgot:"Reset your password", reset:"Choose a new password", invite:"Finish your account"};
  dlg.innerHTML = `<form method="dialog" class="auth" id="authForm">
    <button class="close" value="cancel" aria-label="Close" formnovalidate>×</button>
    <img src="/star.png" alt="" class="auth-star">
    <h2 id="authTitle">${titles[mode]}</h2>
    ${note?`<p class="auth-note">${esc(note)}</p>`:""}
    ${mode==="signup"?`<label>Name<input id="fName" required maxlength="40" autocomplete="name"></label>`:""}
    ${["login","signup","forgot"].includes(mode)?`<label>Email<input id="fEmail" type="email" required autocomplete="email"></label>`:""}
    ${mode!=="forgot"?`<label>Password<input id="fPass" type="password" required minlength="6" autocomplete="${mode==="login"?"current-password":"new-password"}"></label>`:""}
    <p class="auth-error" id="authError" hidden></p>
    <button class="btn wide" type="submit" value="ok">${{login:"Log in",signup:"Create my profile",forgot:"Send reset link",reset:"Save password",invite:"Create my account"}[mode]}</button>
    ${(mode==="login"||mode==="signup") && providers.length ? `<div class="or">or</div>${providers.map(p=>`<button type="button" class="btn ghost wide" data-oauth="${p}">Continue with ${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}`:""}
    <div class="auth-switch">
      ${mode==="login"?`New here? <button type="button" data-auth="signup">Create a profile</button> · <button type="button" data-auth="forgot">Forgot password?</button>`:""}
      ${mode==="signup"||mode==="forgot"?`Already have a profile? <button type="button" data-auth="login">Log in</button>`:""}
    </div></form>`;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("input")?.focus();
}
async function submitAuth(e){
  e.preventDefault();
  const errEl = $("#authError"), btn = e.target.querySelector("[type=submit]");
  const v = id => document.getElementById(id)?.value;
  btn.disabled = true; errEl.hidden = true;
  try {
    if (authMode==="login") await login(v("fEmail"), v("fPass"));
    else if (authMode==="signup") {
      const u = await signup(v("fEmail"), v("fPass"), {full_name: v("fName")});
      if (!u?.confirmedAt) { $("#authDialog").close(); toast("Check your email to confirm your account."); return; }
    }
    else if (authMode==="forgot") { await requestPasswordRecovery(v("fEmail")); $("#authDialog").close(); toast("If that email has a profile, a reset link is on its way."); return; }
    else if (authMode==="reset") await updateUser({password: v("fPass")});
    else if (authMode==="invite") await acceptInvite(pendingToken, v("fPass"));
    $("#authDialog").close();
    await loadMe(); toast(`Hi ${me?.name || "there"}!`);
    if (authMode==="signup" || authMode==="invite") location.hash = "#edit-profile"; else route();
  } catch (err) {
    errEl.textContent = /invalid|credentials|password/i.test(err.message) ? "That email and password don't match. Try again or reset your password." : err.message;
    errEl.hidden = false;
  } finally { btn.disabled = false; }
}
let pendingToken = null;
async function loadMe(){
  try { const u = await getUser(); me = u ? await api("me") : null; }
  catch(e){ me = null; if (e?.name==="MissingIdentityError") identityOn = false; }
  renderAuthSlot();
}
function requireLogin(why){ openAuth("login", why); }

/* ---------- VIEWS ---------- */
async function viewHome(app){
  const pop = [...DRAMAS].sort((a,b)=>b.pop-a.pop);
  const trending = (CAT.source==="tmdb" ? pop.filter(d=>d.year>=new Date().getFullYear()-2) : [...DRAMAS].sort((a,b)=>b.year-a.year||b.score-a.score)).slice(0,4);
  const ranking = [...DRAMAS].sort(byWeighted).slice(0,5);
  const counts = Object.fromEntries(Object.keys(PLATFORMS).map(p=>[p, DRAMAS.filter(d=>plats(d).includes(p)).length]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]));
  const gems = DRAMAS.filter(d=>d.score>=4.1 && d.votes>=15 && d.votes<200 && d.poster!==undefined).sort((a,b)=>hash(a.id+new Date().toDateString())-hash(b.id+new Date().toDateString())).slice(0,4);
  const withProviders = DRAMAS.filter(d=>plats(d).length).length;
  app.innerHTML = `
  <section class="hero">
    <div class="hero-decoration"></div>
    <svg class="hero-sparkle" viewBox="0 0 40 40" aria-hidden="true"><use href="#sparkle" fill="currentColor"/></svg>
    <img class="hero-star" src="/star.png" alt="">
    <div class="wrap hero-inner">
      <span class="eyebrow">Your K-drama space</span>
      <h1>Find your next<br><span class="accent">obsession.</span></h1>
      <p>Rate what you watch, discover what everyone is talking about, and find exactly where to stream every K-drama.</p>
      <form class="search-bar" id="heroSearch" role="search"><svg aria-hidden="true"><use href="#search"/></svg>
        <input id="heroQ" type="search" placeholder="Search for a K-drama..." aria-label="Search for a K-drama"><button class="btn" type="submit">Search</button></form>
      <div class="hero-stats">
        <div><b>${DRAMAS.length.toLocaleString()}</b>K-dramas</div>
        <div><b>${withProviders.toLocaleString()}</b>streaming in ${COUNTRY[region]||region}</div>
        <div><b>${Object.keys(counts).length}</b>platforms</div>
      </div>
    </div>
  </section>
  <div class="wrap">
    <section class="block"><div class="block-head"><div><span class="eyebrow">Everyone's watching</span><h2>Trending now</h2></div><a href="#catalog" class="see-all">View all →</a></div>
      <div class="grid four">${trending.map((d,i)=>cardHtml(d, `#${i+1} Trending`)).join("")}</div></section>
    <div class="ranking"><div class="block-head"><div><span class="eyebrow">The nunchi ranking</span><h2>Top rated of all time</h2></div><a href="#ranking" class="see-all">See ranking →</a></div>${rankRows(ranking)}</div>
    <section class="block"><div class="block-head"><div><span class="eyebrow">Where to watch in ${esc(COUNTRY[region]||region)}</span><h2>Browse by platform</h2></div></div>
      <div class="plat-tiles">${Object.entries(counts).map(([k,n])=>`<button class="plat-tile" style="background:${PLATFORMS[k].color}" data-plat="${k}"><span class="pt-name">${PLATFORMS[k].name}</span><span class="pt-count">${n.toLocaleString()} K-dramas →</span></button>`).join("")}</div></section>
    ${gems.length?`<section class="block"><div class="block-head"><div><span class="eyebrow">Hidden gems</span><h2>Loved by few, adored by all</h2></div><a href="#catalog" class="see-all">Explore →</a></div>
      <div class="grid four">${gems.map(d=>cardHtml(d,"Hidden gem")).join("")}</div></section>`:""}
    <section class="block"><div class="block-head"><div><span class="eyebrow">From the community</span><h2>What everyone's saying</h2></div><a href="#community" class="see-all">Meet the community →</a></div>
      <div class="review-grid" id="feed"><div class="empty small">Loading reviews…</div></div></section>
    <div class="cta"><div><span class="eyebrow">Your watchlist is waiting</span><h2>Never forget the drama someone told you to watch.</h2><p>Save it now. Obsess over it later.</p></div>
      ${me?`<a class="btn" href="#my-list">Open my list</a>`:`<button class="btn" data-act="signup">Create my profile</button>`}</div>
  </div>`;
  api("feed").then(f=>{ const el=$("#feed"); if(!el) return;
    el.innerHTML = f.length ? f.slice(0,6).map(r=>reviewCard(r)).join("") : `<div class="empty small">No reviews yet. Open any drama and be the first to review it.</div>`;
  }).catch(()=>{ const el=$("#feed"); if(el) el.innerHTML=`<div class="empty small">Reviews will show here once the community starts writing.</div>`; });
}

function filtered(){
  const q = catState.q.trim().toLowerCase();
  let list = DRAMAS.filter(d=>
    (!q || d.title.toLowerCase().includes(q) || (d.original||"").includes(catState.q.trim()) || d.synopsis.toLowerCase().includes(q)) &&
    (catState.plat==="all" || plats(d).includes(catState.plat)) &&
    (catState.genre==="all" || d.genres.includes(catState.genre)) &&
    (catState.decade==="all" || String(Math.floor(d.year/10)*10)===catState.decade));
  const s = catState.sort;
  list.sort(s==="new"?(a,b)=>b.year-a.year||b.pop-a.pop : s==="az"?(a,b)=>a.title.localeCompare(b.title) : s==="old"?(a,b)=>a.year-b.year : s==="score"?byWeighted : (a,b)=>b.pop-a.pop||byWeighted(a,b));
  return list;
}
function viewCatalog(app){
  const decades = [...new Set(DRAMAS.map(d=>Math.floor(d.year/10)*10))].sort((a,b)=>b-a);
  const pc = Object.keys(PLATFORMS).map(k=>[k, DRAMAS.filter(d=>plats(d).includes(k)).length]).filter(([,n])=>n);
  app.innerHTML = `<div class="wrap">
    <div class="page-head"><span class="eyebrow">The catalog</span><h1>Every K-drama, and where to watch it</h1>
      <p>${DRAMAS.length.toLocaleString()} series. Platforms shown for ${esc(COUNTRY[region]||region)}; change the country at the top.</p></div>
    <div class="filters">
      <div class="filter-row">
        <div class="search-bar"><svg aria-hidden="true"><use href="#search"/></svg><input id="catQ" type="search" placeholder="Search titles or plots..." aria-label="Search titles or plots" value="${esc(catState.q)}"></div>
        <select class="chip" id="catGenre" aria-label="Genre"><option value="all">All genres</option>${allGenres().map(g=>`<option ${catState.genre===g?"selected":""}>${esc(g)}</option>`).join("")}</select>
        <select class="chip" id="catDecade" aria-label="Decade"><option value="all">Any year</option>${decades.map(d=>`<option value="${d}" ${catState.decade==String(d)?"selected":""}>${d}s</option>`).join("")}</select>
        <select class="chip" id="catSort" aria-label="Sort">${[["popular","Most popular"],["score","Top rated"],["new","Newest"],["old","Oldest"],["az","A–Z"]].map(([v,l])=>`<option value="${v}" ${catState.sort===v?"selected":""}>${l}</option>`).join("")}</select>
      </div>
      <div class="filter-row" id="platChips"><button class="chip" data-plat="all" aria-pressed="${catState.plat==="all"}">All</button>
        ${pc.map(([k,n])=>`<button class="chip" data-plat="${k}" aria-pressed="${catState.plat===k}">${PLATFORMS[k].name}<span class="n">${n.toLocaleString()}</span></button>`).join("")}</div>
    </div>
    <div id="catResults"></div></div>`;
  renderResults();
}
function renderResults(){
  const list = filtered(), el = $("#catResults"); if(!el) return;
  el.innerHTML = list.length
    ? `<div class="result-count">${list.length.toLocaleString()} ${list.length===1?"drama":"dramas"}</div><div class="grid">${list.slice(0,catState.limit).map(d=>cardHtml(d)).join("")}</div>
       ${list.length>catState.limit?`<div class="more-row"><button class="btn ghost" data-act="more">Show more</button></div>`:""}`
    : `<div class="empty"><img src="/star.png" alt="">No K-dramas match those filters. Try another platform or clear the search.</div>`;
}

function myEntry(id){ return me?.list?.[id] || {}; }
async function viewDetail(app, id){
  const d = BYID.get(id);
  if(!d){ app.innerHTML = `<div class="wrap"><a class="back" href="#catalog">← Back to catalog</a><div class="empty">We couldn't find that drama.</div></div>`; return; }
  const qs = encodeURIComponent(d.title), e = myEntry(id), ps = plats(d);
  const similar = DRAMAS.filter(x=>x!==d && x.genres.some(g=>d.genres.includes(g))).map(x=>[x, x.genres.filter(g=>d.genres.includes(g)).length*2 + weighted(x) + Math.min(x.pop,200)/200]).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  const others = Object.entries(d.providers||{}).filter(([r])=>r!==region);
  app.innerHTML = `
  ${d.backdrop?`<div class="backdrop" style="background-image:url('${IMG(d.backdrop,"w1280")}')"></div>`:""}
  <div class="wrap">
    <a class="back" href="#catalog">← Back to catalog</a>
    <div class="detail">
      <div>${posterHtml(d)}</div>
      <div style="min-width:0">
        <span class="eyebrow">K-drama · ${d.year}</span>
        <h1>${esc(d.title)}</h1>${d.original?`<div class="original">${esc(d.original)}</div>`:""}
        <div class="d-meta"><span class="score-big">${starSvg("var(--lavender-dark)")}${d.score.toFixed(1)} <small>/ 5 · ${d.votes.toLocaleString()} votes</small></span>
          <span id="communityScore"></span><span>${d.year}</span>${d.eps?`<span class="dot">•</span><span>${d.eps} episodes</span>`:""}</div>
        <div class="genre-row">${d.genres.map(g=>`<button class="genre" data-genre="${esc(g)}">${esc(g)}</button>`).join("")}</div>
        <p class="synopsis">${esc(d.synopsis || "No synopsis yet.")}</p>
        <div class="status-row">${Object.entries(STATUS).map(([k,v])=>`<button class="chip" data-status="${k}" aria-pressed="${e.status===k}">${e.status===k?"✓ ":""}${v}</button>`).join("")}
          ${me&&!me.favorites.includes(id)?`<button class="chip" data-fav="${id}">♡ Add to favorites</button>`:me?`<button class="chip" data-unfav="${id}" aria-pressed="true">♥ Favorite</button>`:""}</div>
        <div class="where"><h2>Where to watch in ${esc(COUNTRY[region]||region)}</h2>
          ${ps.length?`<div class="where-list">${ps.map(p=>{const P=PLATFORMS[p]; return `<a class="where-item" href="${P.url(qs)}" target="_blank" rel="noopener">
            <span class="wi-left"><span class="logo-dot" style="background:${P.color}">${P.letter}</span><span>${P.name}<small>Included with subscription</small></span></span><span class="go">Open ↗</span></a>`}).join("")}</div>`
            :`<p class="where-note">Not streaming in ${esc(COUNTRY[region]||region)} right now.</p>`}
          ${others.length?`<p class="where-note">Also streaming in ${others.map(([r,l])=>`${esc(COUNTRY[r]||r)} (${l.map(p=>PLATFORMS[p].name).join(", ")})`).join(" · ")}.</p>`:""}
          <p class="where-note">${d.links?.[region]?`<a href="${esc(d.links[region])}" target="_blank" rel="noopener">See every option on TMDB</a> · `:""}Streaming data by JustWatch, updated with every site build.</p>
        </div>
      </div>
    </div>
    <section class="block" id="reviewsBlock">
      <div class="block-head"><div><span class="eyebrow">Community</span><h2>Ratings & reviews</h2></div></div>
      <div class="my-review">${me?`
        <div class="rate-row"><span class="rate-label">Your rating</span><div class="rate" role="radiogroup" aria-label="Your rating">${[1,2,3,4,5].map(i=>`<button class="rate-star" data-rate="${i}" role="radio" aria-checked="${e.rating===i}" aria-label="${i} star${i>1?"s":""}">${starSvg(i<=(e.rating||0)?"var(--lavender-dark)":"var(--line)","star big")}</button>`).join("")}</div>${e.rating?`<button class="link" data-rate="0">Clear</button>`:""}</div>
        <textarea id="reviewText" maxlength="2000" rows="3" placeholder="What did you think? No spoilers in the first line, please."></textarea>
        <div class="review-actions"><button class="btn" data-act="saveReview">Post review</button></div>`
        : `<div class="login-prompt">${avatarHtml(null)}<div><b>Rate and review ${esc(d.title)}</b><br><span>Log in to add it to your profile and your list.</span></div><button class="btn" data-act="login">Log in</button></div>`}</div>
      <div class="review-grid" id="dramaReviews"><div class="empty small">Loading reviews…</div></div>
    </section>
    <section class="block"><div class="block-head"><div><span class="eyebrow">If you liked this</span><h2>You might also love</h2></div></div>
      <div class="grid four">${similar.map(x=>cardHtml(x)).join("")}</div></section>
  </div>`;
  try {
    const revs = await api(`reviews/${encodeURIComponent(id)}`);
    const mine = me && revs.find(r=>r.user.handle===me.handle);
    if (mine && $("#reviewText")) $("#reviewText").value = mine.text || "";
    const rated = revs.filter(r=>r.rating);
    if (rated.length) $("#communityScore").innerHTML = `<span class="score-big community">${starSvg("var(--pink)")}${(rated.reduce((s,r)=>s+r.rating,0)/rated.length).toFixed(1)} <small>Nunchi · ${rated.length}</small></span>`;
    const withText = revs.filter(r=>r.text);
    $("#dramaReviews").innerHTML = withText.length ? withText.map(r=>reviewCard(r,false)).join("") : `<div class="empty small">No reviews yet. Yours could be the first.</div>`;
  } catch { const el=$("#dramaReviews"); if(el) el.innerHTML=`<div class="empty small">Reviews couldn't load right now.</div>`; }
}

function viewRanking(app){
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">The nunchi ranking</span><h1>Top 50 K-dramas</h1><p>Ranked by score, weighted by how many people voted, so a show with five perfect votes doesn't top the list.</p></div>
    <div class="ranking" style="margin-top:28px">${rankRows([...DRAMAS].sort(byWeighted).slice(0,50))}</div></div>`;
}

async function viewCommunity(app){
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">The community</span><h1>Find your drama people</h1><p>Browse profiles, see what fans are finishing, and follow their favorites.</p></div><div id="members" class="members"><div class="empty small">Loading members…</div></div></div>`;
  try {
    const ms = await api("members");
    $("#members").innerHTML = ms.length ? ms.map(m=>`<a class="member" href="#u-${esc(m.handle)}">
      <div class="m-banner" style="${m.banner?`background-image:url('${esc(m.banner)}')`:""}"></div>
      <div class="m-body">${avatarHtml(m,56)}<div class="m-name">${esc(m.name)}</div><div class="handle">@${esc(m.handle)}</div>
      ${m.bio?`<p class="m-bio">${esc(m.bio)}</p>`:""}<div class="m-stats"><span><b>${m.finished}</b> finished</span><span><b>${m.ratings}</b> rated</span></div>
      <div class="m-favs">${m.favorites.slice(0,4).map(id=>BYID.get(id)).filter(Boolean).map(thumbHtml).join("")}</div></div></a>`).join("")
      : `<div class="empty">No profiles yet. ${me?"":"<button class='btn' data-act='signup'>Be the first</button>"}</div>`;
  } catch { $("#members").innerHTML = `<div class="empty small">Profiles couldn't load right now.</div>`; }
}

function listRows(entries, editable){
  return entries.map(([id,e])=>{ const d=BYID.get(id); if(!d) return ""; return `<div class="list-row">${thumbHtml(d)}
    <a class="lr-body" href="#drama-${d.id}"><div class="lr-title">${esc(d.title)}</div><div class="t-meta">${e.rating?starsRow(e.rating):`${starSvg("var(--lavender)")}<span class="rating">${d.score.toFixed(1)}</span>`} · ${d.year}</div>${platChips(d)}</a>
    ${editable?`<select class="chip" data-listid="${d.id}" aria-label="Status for ${esc(d.title)}">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${e.status===k?"selected":""}>${v}</option>`).join("")}<option value="none">Remove</option></select>`:e.status?`<span class="status-pill">${STATUS[e.status]}</span>`:""}</div>`; }).join("");
}
function viewMyList(app){
  if (!me){ app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Your watchlist</span><h1>My list</h1></div><div class="empty"><img src="/star.png" alt="">Log in to keep your watchlist, ratings and progress on every device.<div class="more-row"><button class="btn" data-act="login">Log in</button> <button class="btn ghost" data-act="signup">Create a profile</button></div></div></div>`; return; }
  const items = Object.entries(me.list).filter(([,e])=>e.status).sort((a,b)=>b[1].at-a[1].at);
  const shown = items.filter(([,e])=>listTab==="all"||e.status===listTab);
  const n = k => items.filter(([,e])=>k==="all"||e.status===k).length;
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Your watchlist</span><h1>My list</h1><p>Track what you want to watch, what you're watching and what you've finished. It shows on <a class="link" href="#u-${esc(me.handle)}">your profile</a>.</p></div>
    <div class="tabs">${[["all","All"],...Object.entries(STATUS)].map(([k,v])=>`<button class="chip" data-tab="${k}" aria-pressed="${listTab===k}">${v}<span class="n">${n(k)}</span></button>`).join("")}</div>
    <div style="margin-top:14px">${shown.length?listRows(shown,true):`<div class="empty"><img src="/star.png" alt="">Nothing here yet. Open any drama and tap “Want to watch”.<div class="more-row"><a class="btn" href="#catalog">Browse the catalog</a></div></div>`}</div></div>`;
}

let profileTab = "favorites";
async function viewProfile(app, handle){
  app.innerHTML = `<div class="wrap"><div class="empty small">Loading profile…</div></div>`;
  let p; try { p = await api(`u/${encodeURIComponent(handle)}`); } catch(e){ app.innerHTML = `<div class="wrap"><div class="empty"><img src="/star.png" alt="">${esc(e.message)}</div></div>`; return; }
  const mine = me && me.handle === p.handle;
  if (mine) Object.assign(me, {list:p.list, favorites:p.favorites});
  const entries = Object.entries(p.list||{});
  const cnt = s => entries.filter(([,e])=>e.status===s).length;
  const badges = badgesFor(p, p.reviews.filter(r=>r.text).length);
  const favs = p.favorites.map(id=>BYID.get(id)).filter(Boolean);
  const tabs = [["favorites","Favorites"],["done","Finished"],["watching","Watching"],["want","Want to watch"],["reviews","Reviews & ratings"],["badges","Badges"]];
  let body = "";
  if (profileTab==="favorites") body = favs.length?`<div class="grid">${favs.map(d=>cardHtml(d)).join("")}</div>`:`<div class="empty small">${mine?"Pick up to 6 favorite dramas from any drama page, or in Edit profile.":"No favorites picked yet."}</div>`;
  else if (STATUS[profileTab]) { const l = entries.filter(([,e])=>e.status===profileTab).sort((a,b)=>b[1].at-a[1].at); body = l.length?listRows(l,false):`<div class="empty small">Nothing here yet.</div>`; }
  else if (profileTab==="reviews") { const rs=[...p.reviews].sort((a,b)=>b.at-a.at); body = rs.length?`<div class="review-grid">${rs.map(r=>reviewCard({...r,user:p})).join("")}</div>`:`<div class="empty small">No ratings or reviews yet.</div>`; }
  else body = `<div class="badges">${badges.map(b=>`<div class="badge ${b.got?"got":""}"><img src="/star.png" alt=""><div><b>${b.name}</b><span>${b.desc}</span></div></div>`).join("")}</div>`;
  app.innerHTML = `
    <div class="profile-banner" style="${p.banner?`background-image:url('${esc(p.banner)}')`:""}"></div>
    <div class="wrap">
      <div class="profile-head">
        ${avatarHtml(p,120)}
        <div class="ph-body"><h1>${esc(p.name)}</h1><div class="handle">@${esc(p.handle)} · member since ${new Date(p.createdAt).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</div>
          ${p.bio?`<p class="bio">${esc(p.bio)}</p>`:""}
          <div class="p-stats"><span><b>${cnt("done")}</b> finished</span><span><b>${cnt("watching")}</b> watching</span><span><b>${cnt("want")}</b> to watch</span>${(n=>`<span><b>${n}</b> review${n===1?"":"s"}</span>`)(p.reviews.filter(r=>r.text).length)}<span><b>${badges.filter(b=>b.got).length}</b> badges</span></div></div>
        ${mine?`<div class="ph-actions"><a class="btn" href="#edit-profile">Edit profile</a><button class="btn ghost" data-act="logout">Log out</button></div>`:""}
      </div>
      <div class="earned">${badges.filter(b=>b.got).map(b=>`<span class="badge-pill" title="${esc(b.desc)}"><img src="/star.png" alt="">${b.name}</span>`).join("")}</div>
      <div class="tabs">${tabs.map(([k,v])=>`<button class="chip" data-ptab="${k}" aria-pressed="${profileTab===k}">${v}</button>`).join("")}</div>
      <div class="profile-body">${body}</div>
    </div>`;
}

function viewEditProfile(app){
  if (!me){ requireLogin("Log in to edit your profile."); location.hash="#home"; return; }
  const favs = me.favorites.map(id=>BYID.get(id)).filter(Boolean);
  app.innerHTML = `<div class="wrap narrow">
    <div class="page-head"><span class="eyebrow">Your profile</span><h1>Edit profile</h1></div>
    <form id="profileForm" class="edit-form">
      <div class="img-edit">
        <div class="banner-edit" style="${me.banner?`background-image:url('${esc(me.banner)}')`:""}"><label class="btn ghost small">Change banner<input type="file" accept="image/*" data-img="banner" hidden></label></div>
        <div class="avatar-edit">${avatarHtml(me,96)}<label class="btn ghost small">Change photo<input type="file" accept="image/*" data-img="avatar" hidden></label></div>
      </div>
      <label>Name<input id="pName" maxlength="40" value="${esc(me.name)}" required></label>
      <label>Username<div class="prefix"><span>@</span><input id="pHandle" maxlength="20" pattern="[a-z0-9_]{3,20}" value="${esc(me.handle)}" required></div><small>3–20 lowercase letters, numbers or underscores. Your profile lives at #u-${esc(me.handle)}.</small></label>
      <label>Bio<textarea id="pBio" maxlength="280" rows="3" placeholder="Second lead syndrome survivor. Will cry at any airport scene.">${esc(me.bio)}</textarea></label>
      <div><span class="label">Favorite dramas <small>(up to 6)</small></span>
        <div class="fav-edit" id="favEdit">${favs.map(d=>`<div class="fav-chip">${thumbHtml(d)}<span>${esc(d.title)}</span><button type="button" data-unfav="${d.id}" aria-label="Remove ${esc(d.title)}">×</button></div>`).join("")}</div>
        ${favs.length<6?`<div class="search-bar fav-search"><svg aria-hidden="true"><use href="#search"/></svg><input id="favQ" type="search" placeholder="Add a favorite…" aria-label="Search a drama to add to favorites" autocomplete="off"></div><div id="favResults" class="fav-results"></div>`:""}
      </div>
      <p class="auth-error" id="profileError" hidden></p>
      <div class="review-actions"><a class="btn ghost" href="#u-${esc(me.handle)}">Cancel</a><button class="btn" type="submit">Save profile</button></div>
    </form></div>`;
}

async function resizeImage(file, maxW, maxH){
  const img = await createImageBitmap(file);
  const s = Math.min(1, maxW/img.width, maxH/img.height);
  const c = Object.assign(document.createElement("canvas"), {width:Math.round(img.width*s), height:Math.round(img.height*s)});
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r=>c.toBlob(r, "image/jpeg", 0.86));
}

/* ---------- ROUTER ---------- */
async function route(){
  const h = decodeURIComponent(location.hash.slice(1)) || "home";
  const app = $("#app"); let v = h;
  if (h.startsWith("drama-")) { await viewDetail(app, h.slice(6)); v="catalog"; }
  else if (h.startsWith("u-")) { await viewProfile(app, h.slice(2)); v = me && h.slice(2)===me.handle ? "me" : "community"; }
  else if (h==="catalog") viewCatalog(app);
  else if (h==="ranking") viewRanking(app);
  else if (h==="community") await viewCommunity(app);
  else if (h==="my-list") viewMyList(app);
  else if (h==="edit-profile") viewEditProfile(app);
  else { await viewHome(app); v="home"; }
  document.querySelectorAll("[data-v]").forEach(a=>a.classList.toggle("active", a.dataset.v===v));
}
let lastHash = "";
window.addEventListener("hashchange", ()=>{ const keep = lastHash.split("-")[0]===location.hash.split("-")[0] && location.hash.startsWith("#u-"); lastHash=location.hash; route().then(()=>{ if(!keep) window.scrollTo(0,0); }); });
const go = h => { if (location.hash===h) route(); else location.hash = h; };
async function rerender(){ const y = scrollY; await route(); scrollTo(0,y); }

/* ---------- EVENTS ---------- */
document.addEventListener("submit", async e=>{
  if (e.target.id==="heroSearch"){ e.preventDefault(); Object.assign(catState,{q:$("#heroQ").value, plat:"all", genre:"all", limit:60}); go("#catalog"); }
  if (e.target.id==="authForm") submitAuth(e);
  if (e.target.id==="profileForm"){ e.preventDefault();
    const errEl=$("#profileError"); errEl.hidden=true;
    try { me = await api("me",{method:"PUT", body:JSON.stringify({name:$("#pName").value, handle:$("#pHandle").value.toLowerCase(), bio:$("#pBio").value, favorites:me.favorites})});
      renderAuthSlot(); toast("Profile saved"); go(`#u-${me.handle}`); }
    catch(err){ errEl.textContent=err.message; errEl.hidden=false; }
  }
});
document.addEventListener("input", e=>{
  if (e.target.id==="catQ"){ catState.q=e.target.value; catState.limit=60; renderResults(); }
  if (e.target.id==="favQ"){ const q=e.target.value.trim().toLowerCase(); const el=$("#favResults");
    el.innerHTML = q.length<2 ? "" : DRAMAS.filter(d=>d.title.toLowerCase().includes(q) && !me.favorites.includes(d.id)).sort((a,b)=>b.pop-a.pop).slice(0,6)
      .map(d=>`<button type="button" class="fav-option" data-fav="${d.id}">${thumbHtml(d)}<span>${esc(d.title)} <small>${d.year}</small></span></button>`).join(""); }
});
document.addEventListener("change", async e=>{
  const t=e.target;
  if (t.id==="region"){ region=t.value; ls.set("nunchi:region",region); catState.plat="all"; route(); }
  if (t.id==="catGenre"){ catState.genre=t.value; catState.limit=60; renderResults(); }
  if (t.id==="catDecade"){ catState.decade=t.value; catState.limit=60; renderResults(); }
  if (t.id==="catSort"){ catState.sort=t.value; renderResults(); }
  if (t.dataset.listid){ try{ me = await api(`list/${encodeURIComponent(t.dataset.listid)}`,{method:"PUT",body:JSON.stringify({status:t.value})}); toast(t.value==="none"?"Removed from your list":`Moved to ${STATUS[t.value]}`); rerender(); }catch(err){ toast(err.message); } }
  if (t.dataset.img){ const f=t.files[0]; if(!f) return; const kind=t.dataset.img;
    try { toast("Uploading…"); const blob = await resizeImage(f, kind==="banner"?1800:480, kind==="banner"?700:480);
      me = await api(`me/image/${kind}`,{method:"POST", body:blob, headers:{"content-type":"image/jpeg"}}); renderAuthSlot(); toast(kind==="banner"?"Banner updated":"Photo updated"); viewEditProfile($("#app")); }
    catch(err){ toast(err.message); } }
});
document.addEventListener("click", async e=>{
  const b = e.target.closest("button"); if(!b) return;
  const id = decodeURIComponent(location.hash).startsWith("#drama-") ? decodeURIComponent(location.hash).slice(7) : null;
  const act = b.dataset.act;
  if (act==="login") openAuth("login");
  if (act==="signup") openAuth("signup");
  if (act==="logout"){ await logout(); me=null; renderAuthSlot(); toast("Logged out"); go("#home"); }
  if (act==="more"){ catState.limit+=60; renderResults(); }
  if (b.dataset.auth) openAuth(b.dataset.auth);
  if (b.dataset.oauth) oauthLogin(b.dataset.oauth);
  if (b.dataset.plat){ catState.plat=b.dataset.plat; catState.limit=60;
    if (location.hash!=="#catalog"){ catState.q=""; catState.genre="all"; go("#catalog"); return; }
    document.querySelectorAll("#platChips .chip").forEach(c=>c.setAttribute("aria-pressed", c.dataset.plat===catState.plat)); renderResults(); }
  if (b.dataset.genre){ Object.assign(catState,{genre:b.dataset.genre, q:"", plat:"all", limit:60}); go("#catalog"); }
  if (b.dataset.tab){ listTab=b.dataset.tab; route(); }
  if (b.dataset.ptab){ profileTab=b.dataset.ptab; rerender(); }
  if (b.dataset.status && id){
    if (!me) return requireLogin("Log in to save dramas to your list.");
    const cur = me.list[id]?.status; const next = cur===b.dataset.status ? "none" : b.dataset.status;
    try { me = await api(`list/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({status:next})}); toast(next==="none"?"Removed from your list":`Saved as ${STATUS[next]}`); rerender(); } catch(err){ toast(err.message); }
  }
  if (b.dataset.rate!==undefined && id){
    try { me = await api(`list/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({rating:+b.dataset.rate})}); toast(+b.dataset.rate?`Rated ${b.dataset.rate} stars`:"Rating cleared"); const txt=$("#reviewText")?.value; await rerender(); if(txt && $("#reviewText")) $("#reviewText").value=txt; } catch(err){ toast(err.message); }
  }
  if (act==="saveReview" && id){
    const text = $("#reviewText").value.trim();
    if (!text && !me.list[id]?.rating) return toast("Add a rating or write a few words first.");
    try { me = await api(`list/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({review:text})}); toast(text?"Review posted":"Review removed"); rerender(); } catch(err){ toast(err.message); }
  }
  if (b.dataset.fav || b.dataset.unfav){
    if (!me) return requireLogin("Log in to pick your favorites.");
    const fid = b.dataset.fav || b.dataset.unfav;
    const favorites = b.dataset.fav ? [...new Set([...me.favorites, fid])].slice(0,6) : me.favorites.filter(x=>x!==fid);
    if (b.dataset.fav && me.favorites.length>=6) return toast("You can pick up to 6 favorites. Remove one first.");
    try { me = await api("me",{method:"PUT",body:JSON.stringify({favorites})}); toast(b.dataset.fav?"Added to favorites":"Removed from favorites");
      if (location.hash==="#edit-profile"){ const keep={n:$("#pName").value,h:$("#pHandle").value,b:$("#pBio").value}; viewEditProfile($("#app")); $("#pName").value=keep.n; $("#pHandle").value=keep.h; $("#pBio").value=keep.b; $("#favQ")?.focus(); }
      else rerender(); } catch(err){ toast(err.message); }
  }
});

/* ---------- BOOT ---------- */
async function boot(){
  try { CAT = await (await fetch("/data/dramas.json")).json(); } catch { CAT = {source:"seed", regions:["US"], dramas:[]}; }
  DRAMAS = CAT.dramas; BYID = new Map(DRAMAS.map(d=>[d.id,d]));
  const guess = (navigator.language||"").split("-")[1]?.toUpperCase();
  region = ls.get("nunchi:region", CAT.regions.includes(guess) ? guess : CAT.regions[0]);
  if (!CAT.regions.includes(region)) region = CAT.regions[0];
  $("#region").innerHTML = CAT.regions.map(r=>`<option value="${r}" ${r===region?"selected":""}>${r}</option>`).join("");
  $("#region").title = "Streaming country";
  $("#dataNote").innerHTML = CAT.source==="tmdb"
    ? `Posters and data from <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>, streaming data by JustWatch. This product uses the TMDB API but is not endorsed or certified by TMDB.`
    : `${DRAMAS.length} K-dramas in the starter catalog · streaming availability for the US`;
  try {
    const cb = await handleAuthCallback();
    if (cb?.type==="invite" && cb.token){ pendingToken=cb.token; openAuth("invite"); }
    else if (cb?.type==="recovery") openAuth("reset");
    else if (cb) toast("You're in!");
  } catch(e){ if (e?.name==="MissingIdentityError") identityOn=false; }
  await loadMe();
  try { onAuthChange(()=>loadMe()); } catch {}
  lastHash = location.hash; await route();
}
boot();
