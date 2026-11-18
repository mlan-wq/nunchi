// UI components and views for Nunchi. Imported by app.js.
import { S, $, esc, hash, starSvg, IMG, PLATFORMS, COUNTRY, GRADS, STATUS, plats, weighted, byWeighted, timeAgo, api, AVATARS, BANNERS } from "./core.js";
import { BADGE_ART } from "./icons.js";

/* ---------- small components ---------- */
export function posterHtml(d, tag){
  const [a,b] = GRADS[hash(d.id)%GRADS.length];
  const top = `<div class="p-top">${tag?`<span class="p-tag">${tag}</span>`:"<span></span>"}<span>${d.poster?"":d.year}</span></div>`;
  if (d.poster) return `<div class="poster" style="background:${b}"><img class="cover" src="${IMG(d.poster)}" alt="${esc(d.title)} poster" loading="lazy">${top}<span></span></div>`;
  return `<div class="poster" style="background:linear-gradient(170deg,${a} 0%,${b} 100%)"><img class="p-star" src="/star.png" alt="">${top}<div class="p-name">${esc(d.title)}</div></div>`;
}
export const platChips = d => `<div class="plats">${plats(d).map(p=>`<span class="plat" style="background:${PLATFORMS[p].color}">${PLATFORMS[p].name}</span>`).join("")}</div>`;
export function cardHtml(d, tag){
  return `<a class="card" href="#drama-${d.id}">${posterHtml(d, tag)}
    <div class="t-title">${esc(d.title)}</div>
    <div class="t-meta">${starSvg("var(--lavender)")}<span class="rating">${d.score.toFixed(1)}</span> · ${esc(d.genres[0]||"Drama")} · ${d.year}</div>
    ${platChips(d)}</a>`;
}
export function thumbHtml(d, cls="rank-thumb"){
  const [a,b] = GRADS[hash(d.id)%GRADS.length];
  return d.poster ? `<div class="${cls}"><img src="${IMG(d.poster,"w154")}" alt="" loading="lazy"></div>` : `<div class="${cls}" style="background:linear-gradient(160deg,${a},${b})"></div>`;
}
export function rankRows(list){
  return list.map((d,i)=>`<a class="rank-row" href="#drama-${d.id}">
    <div class="rank-num">${String(i+1).padStart(2,"0")}</div>${thumbHtml(d)}
    <div class="rank-body"><div class="rank-title">${esc(d.title)}</div><div class="rank-meta">${d.genres.slice(0,2).join(" · ")} · ${d.year}</div></div>
    ${platChips(d)}<div class="rank-score">${starSvg("#fff")}${d.score.toFixed(1)}</div></a>`).join("");
}
export const avatarSrc = u => u?.avatar || `/avatars/${AVATARS[hash(u?.handle||u?.uid||"x") % AVATARS.length]}.svg`;
export const avatarHtml = (u, size=42) => `<img class="avatar" src="${esc(avatarSrc(u))}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px">`;
export const starsRow = r => `<span class="mini-stars" aria-label="${r} out of 5">${[1,2,3,4,5].map(i=>starSvg(i<=r?"var(--lavender-dark)":i-0.5<=r?"var(--lavender)":"var(--line)")).join("")}</span>`;
export const followBtn = (handle, following) => S.me && S.me.handle!==handle ? `<button class="btn ${following?"ghost":""} small follow-btn" data-follow="${esc(handle)}" data-on="${following?1:0}">${following?"Following":"Follow"}</button>` : "";

// The review card: drama art, author, stars, text with spoiler shield, likes and an expandable comment thread.
export function reviewCard(r, {showDrama=true, big=false}={}){
  const d = S.BYID.get(r.dramaId);
  const art = d ? (d.backdrop ? IMG(d.backdrop,"w780") : d.poster ? IMG(d.poster,"w342") : null) : null;
  const long = (r.text||"").length > 260;
  const rid = `${r.dramaId}|${r.uid}`;
  return `<article class="rcard ${big?"big":""}" data-rid="${esc(rid)}">
    ${showDrama && d ? `<a class="rc-art" href="#drama-${d.id}" style="${art?`background-image:url('${art}')`:`background:linear-gradient(135deg,${GRADS[hash(d.id)%8].join(",")})`}">
       <span class="rc-drama">${d.poster?`<img src="${IMG(d.poster,"w92")}" alt="">`:""}<span><b>${esc(d.title)}</b><small>${d.year}</small></span></span></a>` : ""}
    <div class="rc-body">
      <div class="rc-head"><a href="#u-${esc(r.user.handle)}">${avatarHtml(r.user,40)}</a>
        <div class="rc-who"><a href="#u-${esc(r.user.handle)}"><b>${esc(r.user.name)}</b> <span class="handle">@${esc(r.user.handle)}</span></a>
        <div class="rc-meta">${r.rating?starsRow(r.rating):""}<span>${timeAgo(r.at)}</span></div></div></div>
      ${r.text ? `<div class="rc-text ${r.spoiler?"spoiler":""} ${long?"clamp":""}"><p>${esc(r.text)}</p>${r.spoiler?`<button class="spoiler-btn" data-act="reveal">Contains spoilers · tap to read</button>`:""}</div>${long?`<button class="link more-btn" data-act="expand">Read more</button>`:""}` : ""}
      <div class="rc-actions">
        <button class="pill-btn like ${r.liked?"on":""}" data-like="${esc(rid)}" aria-pressed="${!!r.liked}"><span class="heart">${r.liked?"♥":"♡"}</span> <span class="n">${r.likes||0}</span></button>
        <button class="pill-btn" data-comments="${esc(rid)}">💬 <span class="n">${r.comments||0}</span></button>
      </div>
      <div class="rc-thread" hidden></div>
    </div></article>`;
}
export function commentHtml(c, rid){
  const [dramaId, author] = rid.split("|");
  const canDelete = S.me && (S.me.uid===c.uid || S.me.uid===author);
  return `<div class="cmt">${avatarHtml(c.user,30)}<div class="cmt-body"><a href="#u-${esc(c.user.handle)}"><b>${esc(c.user.name)}</b></a> <span class="handle">${timeAgo(c.at)}</span><p>${esc(c.text)}</p></div>
    ${canDelete?`<button class="cmt-del" data-delcomment="${esc(rid)}|${esc(c.key)}" aria-label="Delete comment">×</button>`:""}</div>`;
}

/* ---------- badges ---------- */
export function badgesFor(p, reviewsCount){
  const list = Object.entries(p.list||{});
  const done = list.filter(([,e])=>e.status==="done").map(([id])=>S.BYID.get(id)).filter(Boolean);
  const genres = new Set(done.flatMap(d=>d.genres));
  const gems = done.filter(d=>d.votes<150 && d.score>=3.8).length;
  const hist = done.filter(d=>d.genres.includes("Historical")).length;
  const oldies = done.filter(d=>d.year<2010).length;
  const rated = list.filter(([,e])=>e.rating).length;
  return [
    ["first-finale","First finale","Finished your first K-drama", done.length>=1],
    ["binge","Binge royalty","Finished 10 K-dramas", done.length>=10],
    ["veteran","Drama veteran","Finished 50 K-dramas", done.length>=50],
    ["critic","Critic","Wrote your first review", reviewsCount>=1],
    ["pen-gold","Pen of gold","Wrote 10 reviews", reviewsCount>=10],
    ["star-giver","Star giver","Rated 25 dramas", rated>=25],
    ["gem","Hidden gem hunter","Finished 3 hidden gems", gems>=3],
    ["joseon","Joseon scholar","Finished 3 historical dramas", hist>=3],
    ["explorer","Genre explorer","Finished dramas in 6 genres", genres.size>=6],
    ["classic","Classic soul","Finished 3 dramas from before 2010", oldies>=3],
    ["social","Social butterfly","Following 5 people", (p.followingCount||0)>=5],
    ["fan-fav","Fan favorite","10 people follow you", (p.followers||0)>=10]
  ].map(([key,name,desc,got])=>({icon:BADGE_ART[key],name,desc,got}));
}

/* ---------- members-only gate ---------- */
export function lockedHtml(title, text, big=false){
  const ghost = ["a03","a08","a12","a19"].map((a,i)=>`<div class="ghost-card"><img src="/avatars/${a}.svg" alt=""><div><i style="width:${60+i*7}%"></i><i style="width:${85-i*9}%"></i><i style="width:${50+i*5}%"></i></div></div>`).join("");
  return `<div class="locked ${big?"big":""}"><div class="ghosts" aria-hidden="true">${ghost}</div>
    <div class="locked-body"><img src="/star.png" alt=""><h3>${title}</h3><p>${text}</p>
      <div class="locked-actions"><button class="btn" data-act="signup">Create my free profile</button><button class="btn ghost" data-act="login">Log in</button></div></div></div>`;
}
export function viewLocked(app, title, text){
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Members only</span><h1>${title}</h1></div>${lockedHtml("Profiles are private on Nunchi", text, true)}</div>`;
}

/* ---------- home ---------- */
export async function viewHome(app){
  const pop = [...S.DRAMAS].sort((a,b)=>b.pop-a.pop);
  const trending = (S.CAT.source==="tmdb" ? pop.filter(d=>d.year>=new Date().getFullYear()-2) : [...S.DRAMAS].sort((a,b)=>b.year-a.year||b.score-a.score)).slice(0,8);
  const ranking = [...S.DRAMAS].sort(byWeighted).slice(0,5);
  const counts = Object.fromEntries(Object.keys(PLATFORMS).map(p=>[p, S.DRAMAS.filter(d=>plats(d).includes(p)).length]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]));
  const day = new Date().toDateString();
  const gems = S.DRAMAS.filter(d=>d.score>=4.1 && d.votes>=15 && d.votes<200).sort((a,b)=>hash(a.id+day)-hash(b.id+day)).slice(0,8);
  const withProviders = S.DRAMAS.filter(d=>plats(d).length).length;
  app.innerHTML = `
  <section class="hero">
    <div class="hero-decoration"></div>
    <svg class="hero-sparkle" viewBox="0 0 40 40" aria-hidden="true"><use href="#sparkle" fill="currentColor"/></svg>
    <img class="hero-star" src="/star.png" alt="">
    <div class="wrap hero-inner">
      <span class="eyebrow">${S.me?`Hi ${esc(S.me.name.split(" ")[0])}!`:"Your K-drama space"}</span>
      <h1>Find your next<br><span class="accent">obsession.</span></h1>
      <p>Rate what you watch, discover what everyone is talking about, and find exactly where to stream every K-drama.</p>
      <form class="search-bar" id="heroSearch" role="search"><svg aria-hidden="true"><use href="#search"/></svg>
        <input id="heroQ" type="search" placeholder="Search for a K-drama..." aria-label="Search for a K-drama"><button class="btn" type="submit">Search</button></form>
      <div class="hero-stats">
        <div><b>${S.DRAMAS.length.toLocaleString()}</b>K-dramas</div>
        <div><b>${withProviders.toLocaleString()}</b>streaming in ${esc(COUNTRY[S.region]||S.region)}</div>
        <div><b>${Object.keys(counts).length}</b>platforms</div>
      </div>
    </div>
  </section>
  <div class="wrap">
    ${S.me?`<section class="block" id="friendsBlock" hidden><div class="block-head"><div><span class="eyebrow">Your people</span><h2>Friends' activity</h2></div><a href="#community" class="see-all">Find friends →</a></div><div class="activity-row" id="friendsAct"></div></section>`:""}
    <section class="block"><div class="block-head"><div><span class="eyebrow">Everyone's watching</span><h2>Trending now</h2></div><a href="#catalog" class="see-all">View all →</a></div>
      <div class="scroller">${trending.map((d,i)=>cardHtml(d, `#${i+1} Trending`)).join("")}</div></section>
    <section class="block"><div class="block-head"><div><span class="eyebrow">From the community</span><h2>What everyone's saying</h2></div><a href="#community" class="see-all">Meet the community →</a></div>
      <div class="review-scroller" id="feed"><div class="empty small">Loading reviews…</div></div></section>
    <div class="ranking"><div class="block-head"><div><span class="eyebrow">The nunchi ranking</span><h2>Top rated of all time</h2></div><a href="#ranking" class="see-all">See ranking →</a></div>${rankRows(ranking)}</div>
    <section class="block"><div class="block-head"><div><span class="eyebrow">Where to watch in ${esc(COUNTRY[S.region]||S.region)}</span><h2>Browse by platform</h2></div></div>
      <div class="plat-tiles">${Object.entries(counts).map(([k,n])=>`<button class="plat-tile" style="background:${PLATFORMS[k].color}" data-plat="${k}"><span class="pt-name">${PLATFORMS[k].name}</span><span class="pt-count">${n.toLocaleString()} K-dramas →</span></button>`).join("")}</div></section>
    ${gems.length?`<section class="block"><div class="block-head"><div><span class="eyebrow">Hidden gems</span><h2>Loved by few, adored by all</h2></div><a href="#catalog" class="see-all">Explore →</a></div>
      <div class="scroller">${gems.map(d=>cardHtml(d,"Hidden gem")).join("")}</div></section>`:""}
    <div class="cta"><div><span class="eyebrow">Your watchlist is waiting</span><h2>Never forget the drama someone told you to watch.</h2><p>Save it now. Obsess over it later.</p></div>
      ${S.me?`<a class="btn" href="#my-list">Open my list</a>`:`<button class="btn" data-act="signup">Create my profile</button>`}</div>
  </div>`;
  if (!S.me) { $("#feed").outerHTML = lockedHtml("Reviews are for members", "Create your free profile to read what fans are saying, see what your friends are watching and share your own reviews."); }
  else api("feed").then(f=>{ const el=$("#feed"); if(!el) return;
    el.innerHTML = f.length ? f.slice(0,12).map(r=>reviewCard(r,{big:true})).join("") : `<div class="empty small">No reviews yet. Open any drama and be the first to review it.</div>`;
  }).catch(()=>{ const el=$("#feed"); if(el) el.innerHTML=`<div class="empty small">Reviews will show here once the community starts writing.</div>`; });
  if (S.me) api("activity").then(items=>{ const el=$("#friendsAct"); if(!el) return;
    const shown = items.filter(it=>S.BYID.get(it.dramaId)).slice(0,12);
    if (!shown.length) { $("#friendsBlock").hidden = !(S.me.following?.length===0); el.innerHTML = `<div class="empty small">Follow people in the community to see what they're watching here. <a class="link" href="#community">Find friends</a></div>`; return; }
    $("#friendsBlock").hidden = false; el.innerHTML = shown.map(activityCard).join("");
  }).catch(()=>{});
}
export function activityCard(it){
  const d = S.BYID.get(it.dramaId);
  const verb = it.status==="done"?"finished":it.status==="watching"?"is watching":it.status==="want"?"wants to watch":"rated";
  return `<a class="act-card" href="#drama-${d.id}">${thumbHtml(d,"act-thumb")}<div class="act-body">
    <div class="act-who">${avatarHtml(it.user,24)}<b>${esc(it.user.name)}</b></div>
    <div class="act-what">${verb} <b>${esc(d.title)}</b></div>
    <div class="act-meta">${it.rating?starsRow(it.rating):""}<span>${timeAgo(it.at)}</span></div>
    ${it.text?`<p class="act-text">“${esc(it.text.slice(0,90))}${it.text.length>90?"…":""}”</p>`:""}</div></a>`;
}

/* ---------- catalog ---------- */
export const catState = {q:"", plat:"all", genre:"all", sort:"popular", decade:"all", limit:60};
function filtered(){
  const q = catState.q.trim().toLowerCase();
  let list = S.DRAMAS.filter(d=>
    (!q || d.title.toLowerCase().includes(q) || (d.original||"").includes(catState.q.trim()) || d.synopsis.toLowerCase().includes(q)) &&
    (catState.plat==="all" || plats(d).includes(catState.plat)) &&
    (catState.genre==="all" || d.genres.includes(catState.genre)) &&
    (catState.decade==="all" || String(Math.floor(d.year/10)*10)===catState.decade));
  const s = catState.sort;
  list.sort(s==="new"?(a,b)=>b.year-a.year||b.pop-a.pop : s==="az"?(a,b)=>a.title.localeCompare(b.title) : s==="old"?(a,b)=>a.year-b.year : s==="score"?byWeighted : (a,b)=>b.pop-a.pop||byWeighted(a,b));
  return list;
}
const allGenres = () => { const c={}; S.DRAMAS.forEach(d=>d.genres.forEach(g=>c[g]=(c[g]||0)+1)); return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]); };
export function viewCatalog(app){
  const decades = [...new Set(S.DRAMAS.map(d=>Math.floor(d.year/10)*10))].sort((a,b)=>b-a);
  const pc = Object.keys(PLATFORMS).map(k=>[k, S.DRAMAS.filter(d=>plats(d).includes(k)).length]).filter(([,n])=>n);
  app.innerHTML = `<div class="wrap">
    <div class="page-head"><span class="eyebrow">The catalog</span><h1>Every K-drama, and where to watch it</h1>
      <p>${S.DRAMAS.length.toLocaleString()} series. Platforms shown for ${esc(COUNTRY[S.region]||S.region)}; change the country at the top.</p></div>
    <div class="filters">
      <div class="search-bar"><svg aria-hidden="true"><use href="#search"/></svg><input id="catQ" type="search" placeholder="Search titles or plots..." aria-label="Search titles or plots" value="${esc(catState.q)}"></div>
      <div class="filter-row selects">
        <select class="chip" id="catGenre" aria-label="Genre"><option value="all">All genres</option>${allGenres().map(g=>`<option ${catState.genre===g?"selected":""}>${esc(g)}</option>`).join("")}</select>
        <select class="chip" id="catDecade" aria-label="Decade"><option value="all">Any year</option>${decades.map(d=>`<option value="${d}" ${catState.decade==String(d)?"selected":""}>${d}s</option>`).join("")}</select>
        <select class="chip" id="catSort" aria-label="Sort">${[["popular","Most popular"],["score","Top rated"],["new","Newest"],["old","Oldest"],["az","A–Z"]].map(([v,l])=>`<option value="${v}" ${catState.sort===v?"selected":""}>${l}</option>`).join("")}</select>
      </div>
      <div class="filter-row chips-scroll" id="platChips"><button class="chip" data-plat="all" aria-pressed="${catState.plat==="all"}">All</button>
        ${pc.map(([k,n])=>`<button class="chip" data-plat="${k}" aria-pressed="${catState.plat===k}">${PLATFORMS[k].name}<span class="n">${n.toLocaleString()}</span></button>`).join("")}</div>
    </div>
    <div id="catResults"></div></div>`;
  renderResults();
}
export function renderResults(){
  const list = filtered(), el = $("#catResults"); if(!el) return;
  el.innerHTML = list.length
    ? `<div class="result-count">${list.length.toLocaleString()} ${list.length===1?"drama":"dramas"}</div><div class="grid">${list.slice(0,catState.limit).map(d=>cardHtml(d)).join("")}</div>
       ${list.length>catState.limit?`<div class="more-row"><button class="btn ghost" data-act="more">Show more</button></div>`:""}`
    : `<div class="empty"><img src="/star.png" alt="">No K-dramas match those filters. Try another platform or clear the search.</div>`;
}

/* ---------- drama page ---------- */
export async function viewDetail(app, id){
  const d = S.BYID.get(id);
  if(!d){ app.innerHTML = `<div class="wrap"><a class="back" href="#catalog">← Back to catalog</a><div class="empty">We couldn't find that drama.</div></div>`; return; }
  const qs = encodeURIComponent(d.title), e = S.me?.list?.[id] || {}, ps = plats(d);
  const similar = S.DRAMAS.filter(x=>x!==d && x.genres.some(g=>d.genres.includes(g))).map(x=>[x, x.genres.filter(g=>d.genres.includes(g)).length*2 + weighted(x) + Math.min(x.pop,200)/200]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);
  const others = Object.entries(d.providers||{}).filter(([r])=>r!==S.region);
  const isFav = S.me?.favorites?.includes(id);
  app.innerHTML = `
  ${d.backdrop?`<div class="backdrop" style="background-image:url('${IMG(d.backdrop,"w1280")}')"></div>`:""}
  <div class="wrap">
    <a class="back" href="#catalog">← Back to catalog</a>
    <div class="detail">
      <div class="detail-poster">${posterHtml(d)}</div>
      <div style="min-width:0">
        <span class="eyebrow">K-drama · ${d.year}</span>
        <h1>${esc(d.title)}</h1>${d.original?`<div class="original">${esc(d.original)}</div>`:""}
        <div class="d-meta"><span class="score-big">${starSvg("var(--lavender-dark)")}${d.score.toFixed(1)} <small>/ 5 · ${d.votes.toLocaleString()} votes</small></span>
          <span id="communityScore"></span><span>${d.year}</span>${d.eps?`<span class="dot">•</span><span>${d.eps} episodes</span>`:""}</div>
        <div class="genre-row">${d.genres.map(g=>`<button class="genre" data-genre="${esc(g)}">${esc(g)}</button>`).join("")}</div>
        <p class="synopsis">${esc(d.synopsis || "No synopsis yet.")}</p>
        <div class="status-row">${Object.entries(STATUS).map(([k,v])=>`<button class="chip" data-status="${k}" aria-pressed="${e.status===k}">${e.status===k?"✓ ":""}${v}</button>`).join("")}
          <button class="chip fav ${isFav?"on":""}" data-${isFav?"unfav":"fav"}="${id}" aria-pressed="${!!isFav}">${isFav?"♥ Favorite":"♡ Favorite"}</button></div>
        <div class="quick-rate">
          <span class="qr-label">${e.rating?"Your rating":"Rate it"}</span>
          <div class="rate" role="radiogroup" aria-label="Your rating">${[1,2,3,4,5].map(i=>`<button class="rate-star" ${S.me?`data-rate="${i}"`:`data-act="login"`} role="radio" aria-checked="${e.rating===i}" aria-label="${i} star${i>1?"s":""}">${starSvg(i<=(e.rating||0)?"var(--lavender-dark)":"var(--line)","star big")}</button>`).join("")}</div>
          ${S.flash?.id===id && S.flash.kind==="rate" ? `<span class="saved-note">✓ ${esc(S.flash.msg)}</span>` : ""}${e.rating ? `<a class="link" href="#reviewsBlock" data-jump="reviewsBlock">${e.review?"Edit your review":"Write a review"} ↓</a>` : ""}
        </div>
        <div class="where"><h2>Where to watch in ${esc(COUNTRY[S.region]||S.region)}</h2>
          ${ps.length?`<div class="where-list">${ps.map(p=>{const P=PLATFORMS[p]; return `<a class="where-item" href="${P.url(qs)}" target="_blank" rel="noopener">
            <span class="wi-left"><span class="logo-dot" style="background:${P.color}">${P.letter}</span><span>${P.name}<small>Included with subscription</small></span></span><span class="go">Open ↗</span></a>`}).join("")}</div>`
            :`<p class="where-note">Not streaming in ${esc(COUNTRY[S.region]||S.region)} right now.</p>`}
          ${others.length?`<p class="where-note">Also streaming in ${others.map(([r,l])=>`${esc(COUNTRY[r]||r)} (${l.map(p=>PLATFORMS[p].name).join(", ")})`).join(" · ")}.</p>`:""}
          <p class="where-note">${/^\d+$/.test(d.id)?`<a href="https://www.themoviedb.org/tv/${d.id}/watch?locale=${S.region}" target="_blank" rel="noopener">See every option on TMDB</a> · `:""}Streaming data by JustWatch.</p>
        </div>
      </div>
    </div>
    <section class="block" id="reviewsBlock">
      <div class="block-head"><div><span class="eyebrow">Community</span><h2>Ratings & reviews</h2></div></div>
      <div class="my-review">${S.me?`
        <div class="mr-head">${avatarHtml(S.me,40)}<div><b>Your take on ${esc(d.title)}</b><div class="rate" role="radiogroup" aria-label="Your rating">${[1,2,3,4,5].map(i=>`<button class="rate-star" data-rate="${i}" role="radio" aria-checked="${e.rating===i}" aria-label="${i} star${i>1?"s":""}">${starSvg(i<=(e.rating||0)?"var(--lavender-dark)":"var(--line)","star big")}</button>`).join("")}${e.rating?`<button class="link" data-rate="0">Clear</button>`:""}</div></div></div>
        <textarea id="reviewText" maxlength="2000" rows="3" placeholder="What did you think? Which scene got you?"></textarea>
        <div class="review-actions"><label class="check"><input type="checkbox" id="spoiler"> Contains spoilers</label><button class="btn" data-act="saveReview">${e.review?"Update review":"Post review"}</button></div>
        ${S.flash?.id===id && S.flash.kind==="review" ? `<div class="saved-banner" role="status">✓ ${esc(S.flash.msg)}</div>` : ""}`
        : `<div class="login-prompt">${avatarHtml(null)}<div><b>Rate and review ${esc(d.title)}</b><br><span>Log in to add it to your profile and your list.</span></div><button class="btn" data-act="login">Log in</button></div>`}</div>
      <div class="review-grid" id="dramaReviews"><div class="empty small">Loading reviews…</div></div>
    </section>
    <section class="block"><div class="block-head"><div><span class="eyebrow">If you liked this</span><h2>You might also love</h2></div></div>
      <div class="scroller">${similar.map(x=>cardHtml(x)).join("")}</div></section>
  </div>`;
  try {
    const revs = await api(`reviews/${encodeURIComponent(id)}`);
    if (revs.locked) {
      if (revs.rated) $("#communityScore").innerHTML = `<span class="score-big community">${starSvg("var(--pink)")}${revs.avg.toFixed(1)} <small>Nunchi · ${revs.rated}</small></span>`;
      $("#dramaReviews").outerHTML = lockedHtml(revs.count ? `${revs.count} review${revs.count===1?"":"s"} from the community` : "Be the first to review it", "Reviews and profiles are only visible to members. Create your free profile to read them and add your own.");
      return;
    }
    const mine = S.me && revs.find(r=>r.uid===S.me.uid);
    if (mine && $("#reviewText")) { $("#reviewText").value = mine.text || ""; $("#spoiler").checked = !!mine.spoiler; }
    const rated = revs.filter(r=>r.rating);
    if (rated.length) $("#communityScore").innerHTML = `<span class="score-big community">${starSvg("var(--pink)")}${(rated.reduce((s,r)=>s+r.rating,0)/rated.length).toFixed(1)} <small>Nunchi · ${rated.length}</small></span>`;
    const withText = revs.filter(r=>r.text);
    $("#dramaReviews").innerHTML = withText.length ? withText.map(r=>reviewCard(r,{showDrama:false})).join("") : `<div class="empty small">No reviews yet. Yours could be the first.</div>`;
  } catch { const el=$("#dramaReviews"); if(el) el.innerHTML=`<div class="empty small">Reviews couldn't load right now.</div>`; }
}

export function viewRanking(app){
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">The nunchi ranking</span><h1>Top 50 K-dramas</h1><p>Ranked by score, weighted by how many people voted, so a show with five perfect votes doesn't top the list.</p></div>
    <div class="ranking" style="margin-top:28px">${rankRows([...S.DRAMAS].sort(byWeighted).slice(0,50))}</div></div>`;
}

/* ---------- community ---------- */
export async function viewCommunity(app){
  if (!S.me) return viewLocked(app, "Find your drama people", "Create your free profile to meet other fans, follow friends, and see their reviews and what they've watched.");
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">The community</span><h1>Find your drama people</h1><p>Follow fans to see what they're watching, like their reviews and join the conversation.</p></div>
    <div class="search-bar member-search"><svg aria-hidden="true"><use href="#search"/></svg><input id="memberQ" type="search" placeholder="Search by name or @username" aria-label="Search members"></div>
    <div class="tabs member-sort">${[["new","Newest members"],["popular","Most followed"]].map(([k,v])=>`<button class="chip" data-msort="${k}" aria-pressed="${(S.memberSort||"new")===k}">${v}</button>`).join("")}</div>
    <div id="members" class="members"><div class="empty small">Loading members…</div></div></div>`;
  try { S.members = await api("members"); renderMembers(); }
  catch { $("#members").innerHTML = `<div class="empty small">Profiles couldn't load right now.</div>`; }
}
export function renderMembers(){
  const q = ($("#memberQ")?.value||"").trim().toLowerCase().replace(/^@/,"");
  const sort = S.memberSort || "new";
  const ms = (S.members||[]).filter(m=>!q || m.name.toLowerCase().includes(q) || m.handle.includes(q))
    .sort((a,b)=> sort==="new" ? (b.createdAt||0)-(a.createdAt||0) : (b.followers-a.followers) || (b.createdAt||0)-(a.createdAt||0));
  const isNew = m => Date.now()-(m.createdAt||0) < 7*864e5;
  $("#members").innerHTML = ms.length ? ms.map(m=>`<div class="member">
      <a href="#u-${esc(m.handle)}" class="m-banner" style="background-image:url('${esc(m.banner||"/banners/canola-fields.jpg")}')" aria-label="${esc(m.name)}'s profile"></a>
      <div class="m-body"><div class="m-top"><a href="#u-${esc(m.handle)}">${avatarHtml(m,60)}</a>${followBtn(m.handle,m.isFollowing)}</div>
      <a href="#u-${esc(m.handle)}" class="m-name">${esc(m.name)}</a>${isNew(m)?`<span class="new-pill">New</span>`:""}<div class="handle">@${esc(m.handle)}${m.createdAt?` · joined ${timeAgo(m.createdAt)}`:""}</div>
      ${m.bio?`<p class="m-bio">${esc(m.bio)}</p>`:""}<div class="m-stats"><span><b>${m.followers}</b> follower${m.followers===1?"":"s"}</span><span><b>${m.finished}</b> finished</span><span><b>${m.ratings}</b> rated</span></div>
      <div class="m-favs">${m.favorites.slice(0,5).map(id=>S.BYID.get(id)).filter(Boolean).map(d=>thumbHtml(d)).join("")}</div></div></div>`).join("")
    : `<div class="empty small">${q?"No one matches that search.":"No profiles yet."}</div>`;
}

/* ---------- my list ---------- */
export function listRows(entries, editable){
  return entries.map(([id,e])=>{ const d=S.BYID.get(id); if(!d) return ""; return `<div class="list-row">${thumbHtml(d)}
    <a class="lr-body" href="#drama-${d.id}"><div class="lr-title">${esc(d.title)}</div><div class="t-meta">${e.rating?starsRow(e.rating):`${starSvg("var(--lavender)")}<span class="rating">${d.score.toFixed(1)}</span>`} · ${d.year}</div>${platChips(d)}</a>
    ${editable?`<select class="chip" data-listid="${d.id}" aria-label="Status for ${esc(d.title)}">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${e.status===k?"selected":""}>${v}</option>`).join("")}<option value="none">Remove</option></select>`:e.status?`<span class="status-pill">${STATUS[e.status]}</span>`:""}</div>`; }).join("");
}
export function viewMyList(app){
  if (!S.me){ app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Your watchlist</span><h1>My list</h1></div><div class="empty"><img src="/star.png" alt="">Log in to keep your watchlist, ratings and progress on every device.<div class="more-row"><button class="btn" data-act="login">Log in</button> <button class="btn ghost" data-act="signup">Create a profile</button></div></div></div>`; return; }
  const items = Object.entries(S.me.list).filter(([,e])=>e.status).sort((a,b)=>b[1].at-a[1].at);
  const shown = items.filter(([,e])=>S.listTab==="all"||e.status===S.listTab);
  const n = k => items.filter(([,e])=>k==="all"||e.status===k).length;
  app.innerHTML = `<div class="wrap"><div class="page-head"><span class="eyebrow">Your watchlist</span><h1>My list</h1><p>Track what you want to watch, what you're watching and what you've finished. It shows on <a class="link" href="#u-${esc(S.me.handle)}">your profile</a>.</p></div>
    <div class="tabs">${[["all","All"],...Object.entries(STATUS)].map(([k,v])=>`<button class="chip" data-tab="${k}" aria-pressed="${S.listTab===k}">${v}<span class="n">${n(k)}</span></button>`).join("")}</div>
    <div style="margin-top:14px">${shown.length?listRows(shown,true):`<div class="empty"><img src="/star.png" alt="">Nothing here yet. Open any drama and tap “Want to watch”.<div class="more-row"><a class="btn" href="#catalog">Browse the catalog</a></div></div>`}</div></div>`;
}

/* ---------- profile ---------- */
const STAR_FILTERS = [["all","All"],["5","★★★★★"],["4","★★★★"],["3","★★★"],["2","★★"],["1","★"],["none","Not rated"]];
const SORTS = [["recent","Most recent"],["high","Most stars first"],["low","Fewest stars first"],["title","Title A–Z"],["newest","Newest dramas"],["oldest","Oldest dramas"],["score","Highest community score"]];
function sortProfile(items, keepOrder=false){
  const f = S.profileStars, r = x => x.e?.rating || 0;
  // exact match on the profile owner's own rating: "4" shows 4 and 4.5, never 5
  let out = items.filter(x => f==="all" || (f==="none" ? !r(x) : r(x) && Math.floor(r(x))===+f || (+f===1 && r(x)===0.5)));
  const by = {
    recent: (a,b)=>(b.e?.at||0)-(a.e?.at||0),
    high: (a,b)=>r(b)-r(a) || (b.e?.at||0)-(a.e?.at||0),
    low: (a,b)=>(r(a)||9)-(r(b)||9) || (b.e?.at||0)-(a.e?.at||0),
    title: (a,b)=>(a.d?.title||"").localeCompare(b.d?.title||""),
    newest: (a,b)=>(b.d?.year||0)-(a.d?.year||0),
    oldest: (a,b)=>(a.d?.year||0)-(b.d?.year||0),
    score: (a,b)=>(b.d?.score||0)-(a.d?.score||0)
  }[S.profileSort];
  if (by && !(keepOrder && S.profileSort==="recent")) out = [...out].sort(by);
  return out;
}
function profileTools(tab, total){
  if (!total) return "";
  return `<div class="p-tools">
    <div class="chips-scroll star-filter" role="group" aria-label="Filter by stars">${STAR_FILTERS.filter(([k])=>!(tab==="rated"||tab==="reviews") || k!=="none").map(([k,v])=>`<button class="chip ${/★/.test(v)?"star-chip":""}" data-pstars="${k}" aria-pressed="${S.profileStars===k}" aria-label="${k==="all"||k==="none"?v:`${k} star${k==="1"?"":"s"}`}">${v}</button>`).join("")}</div>
    <label class="sort-sel"><span>Sort</span><select class="chip" id="pSort">${SORTS.map(([k,v])=>`<option value="${k}" ${S.profileSort===k?"selected":""}>${v}</option>`).join("")}</select></label>
  </div>`;
}
function profileCard(d, e, who){
  const r = e?.rating;
  return `<a class="card" href="#drama-${d.id}">${posterHtml(d)}
    <div class="t-title">${esc(d.title)}</div>
    <div class="their-rating ${r?"":"none"}">${r?`${starsRow(r)}<b>${r % 1 ? r.toFixed(1) : r}</b>`:`<span>Not rated yet</span>`}</div>
    <div class="t-meta">${esc(d.genres[0]||"Drama")} · ${d.year} · ${starSvg("var(--line)")}<span>${d.score.toFixed(1)}</span></div></a>`;
}
export async function viewProfile(app, handle){
  if (!S.me) return viewLocked(app, "This profile is private", "Only members can see other people's profiles, reviews and lists. It's free and takes a minute.");
  app.innerHTML = `<div class="wrap"><div class="empty small">Loading profile…</div></div>`;
  let p; try { p = await api(`u/${encodeURIComponent(handle)}`); } catch(e){ app.innerHTML = `<div class="wrap"><div class="empty"><img src="/star.png" alt="">${esc(e.message)}</div></div>`; return; }
  const mine = S.me && S.me.handle === p.handle;
  if (mine) Object.assign(S.me, {list:p.list, favorites:p.favorites});
  const entries = Object.entries(p.list||{});
  const cnt = s => entries.filter(([,e])=>e.status===s).length;
  const written = p.reviews.filter(r=>r.text);
  const badges = badgesFor({...p, followingCount:p.following}, written.length);
  const favs = p.favorites.map(id=>S.BYID.get(id)).filter(Boolean);
  const rated = entries.filter(([,e])=>e.rating);
  const tabs = [["favorites",`Favorites`,favs.length],["rated","Ratings",rated.length],["reviews","Reviews",written.length],["done","Finished",cnt("done")],["watching","Watching",cnt("watching")],["want","Want to watch",cnt("want")],["badges","Badges",badges.filter(b=>b.got).length]];
  const tab = tabs.some(t=>t[0]===S.profileTab) ? S.profileTab : "favorites";
  const who = mine ? "You" : esc(p.name.split(" ")[0]);
  let body = "";
  if (tab==="reviews") {
    const rs = sortProfile(written.map(r=>({r, d:S.BYID.get(r.dramaId), e:{rating:r.rating, at:r.at}})));
    body = profileTools(tab, written.length) + (rs.length?`<div class="review-grid">${rs.map(x=>reviewCard(x.r)).join("")}</div>`:`<div class="empty small">${S.profileStars==="all"?"No reviews yet.":"No reviews match this filter."}</div>`);
  }
  else if (tab!=="badges") {
    const base = tab==="favorites" ? p.favorites.map(id=>[id, p.list?.[id]||{}]) : tab==="rated" ? rated : entries.filter(([,e])=>e.status===tab);
    const items = sortProfile(base.map(([id,e])=>({d:S.BYID.get(id), e})).filter(x=>x.d), tab==="favorites");
    const emptyMsg = base.length && !items.length ? "Nothing matches this filter." : tab==="favorites" ? (mine?"Tap ♡ Favorite on any drama to add it here.":"No favorites picked yet.") : tab==="rated" ? "No ratings yet." : "Nothing here yet.";
    body = profileTools(tab, base.length) + (items.length?`<div class="grid">${items.map(x=>profileCard(x.d, x.e, who)).join("")}</div>`:`<div class="empty small">${emptyMsg}</div>`);
  }
  else body = `<div class="badges">${badges.map(b=>`<div class="badge ${b.got?"got":""}"><span class="b-icon">${b.icon}</span><div><b>${b.name}</b><span>${b.desc}</span></div></div>`).join("")}</div>`;
  app.innerHTML = `
    <div class="profile-banner" style="background-image:url('${esc(p.banner||"/banners/canola-fields.jpg")}')"></div>
    <div class="wrap">
      <div class="profile-head">
        <img class="avatar big-avatar" src="${esc(avatarSrc(p))}" alt="">
        <div class="ph-body"><h1>${esc(p.name)}</h1><div class="handle">@${esc(p.handle)}${p.followsYou?` · <span class="follows-you">Follows you</span>`:""}</div>
          ${p.bio?`<p class="bio">${esc(p.bio)}</p>`:""}
          <div class="p-stats">
            <button class="stat" data-people="followers|${esc(p.handle)}"><b>${p.followers}</b> follower${p.followers===1?"":"s"}</button>
            <button class="stat" data-people="following|${esc(p.handle)}"><b>${p.following}</b> following</button>
            <span class="stat"><b>${cnt("done")}</b> finished</span><span class="stat"><b>${written.length}</b> reviews</span></div></div>
        <div class="ph-actions">${mine?`<a class="btn" href="#edit-profile">Edit profile</a><button class="btn ghost" data-act="logout">Log out</button>`:S.me?followBtn(p.handle,p.isFollowing):`<button class="btn" data-act="login">Log in to follow</button>`}</div>
      </div>
      ${badges.some(b=>b.got)?`<div class="earned">${badges.filter(b=>b.got).map(b=>`<span class="badge-pill" title="${esc(b.desc)}">${b.icon}${b.name}</span>`).join("")}</div>`:""}
      <div class="tabs chips-scroll">${tabs.map(([k,v,n])=>`<button class="chip" data-ptab="${k}" aria-pressed="${tab===k}">${v}<span class="n">${n}</span></button>`).join("")}</div>
      <div class="profile-body">${body}</div>
    </div>`;
}
export async function openPeople(kind, handle){
  const dlg = $("#authDialog");
  dlg.innerHTML = `<div class="auth people"><button class="close" data-act="closeDialog" aria-label="Close">×</button><h2>${kind==="followers"?"Followers":"Following"}</h2><div id="peopleList"><div class="empty small">Loading…</div></div></div>`;
  if (!dlg.open) dlg.showModal();
  try { const ps = await api(`u/${encodeURIComponent(handle)}/${kind}`);
    const mineF = new Set(S.me?.following||[]);
    $("#peopleList").innerHTML = ps.length ? ps.map(u=>`<div class="person"><a href="#u-${esc(u.handle)}" data-act="closeDialog">${avatarHtml(u,44)}</a><a class="p-who" href="#u-${esc(u.handle)}" data-act="closeDialog"><b>${esc(u.name)}</b><span class="handle">@${esc(u.handle)}</span></a>${followBtn(u.handle, mineF.has(u.uid))}</div>`).join("") : `<div class="empty small">No one yet.</div>`;
  } catch(e){ $("#peopleList").innerHTML = `<div class="empty small">${esc(e.message)}</div>`; }
}

/* ---------- edit profile ---------- */
export function viewEditProfile(app){
  const me = S.me;
  const favs = me.favorites.map(id=>S.BYID.get(id)).filter(Boolean);
  app.innerHTML = `<div class="wrap narrow">
    <div class="page-head"><span class="eyebrow">Your profile</span><h1>Edit profile</h1></div>
    <form id="profileForm" class="edit-form">
      <div class="img-edit">
        <div class="banner-edit" style="background-image:url('${esc(me.banner||"/banners/canola-fields.jpg")}')"></div>
        <img class="avatar avatar-edit" src="${esc(avatarSrc(me))}" alt="">
      </div>
      <fieldset><legend>Profile picture</legend>
        <div class="avatar-grid">${AVATARS.map(a=>`<button type="button" class="pick ${me.avatar===`/avatars/${a}.svg`?"on":""}" data-avatar="/avatars/${a}.svg" aria-label="Avatar ${a}"><img src="/avatars/${a}.svg" alt=""></button>`).join("")}
          <label class="pick upload" title="Upload your own photo"><span>＋<small>Upload</small></span><input type="file" accept="image/*" data-img="avatar" hidden></label></div></fieldset>
      <fieldset><legend>Banner</legend>
        <div class="banner-grid">${BANNERS.map(b=>`<button type="button" class="pick-banner ${me.banner===`/banners/${b.id}.jpg`?"on":""}" data-banner="/banners/${b.id}.jpg"><img src="/banners/${b.id}.jpg" alt="" loading="lazy"><span>${b.name}</span></button>`).join("")}
          <label class="pick-banner upload"><span>＋ Upload your own</span><input type="file" accept="image/*" data-img="banner" hidden></label></div></fieldset>
      <label>Name<input id="pName" maxlength="40" value="${esc(me.name)}" required></label>
      <label>Username<div class="prefix"><span>@</span><input id="pHandle" maxlength="20" pattern="[a-z0-9_]{3,20}" value="${esc(me.handle)}" required autocapitalize="off"></div><small>3–20 lowercase letters, numbers or underscores.</small></label>
      <label>Bio<textarea id="pBio" maxlength="280" rows="3" placeholder="Second lead syndrome survivor. Will cry at any airport scene.">${esc(me.bio)}</textarea></label>
      <fieldset><legend>Favorite dramas <small>(${favs.length})</small></legend>
        <div class="search-bar fav-search"><svg aria-hidden="true"><use href="#search"/></svg><input id="favQ" type="search" placeholder="Add a favorite…" aria-label="Search a drama to add to favorites" autocomplete="off"></div>
        <div id="favResults" class="fav-results"></div>
        <div class="fav-edit" id="favEdit">${favs.map(d=>`<div class="fav-chip">${thumbHtml(d)}<span>${esc(d.title)}</span><button type="button" data-unfav="${d.id}" aria-label="Remove ${esc(d.title)}">×</button></div>`).join("")}</div>
      </fieldset>
      <p class="auth-error" id="profileError" hidden></p>
      <div class="review-actions sticky-save"><a class="btn ghost" href="#u-${esc(me.handle)}">Cancel</a><button class="btn" type="submit">Save profile</button></div>
    </form></div>`;
}

/* ---------- notifications ---------- */
export async function viewNotifications(app){
  app.innerHTML = `<div class="wrap narrow"><div class="page-head"><span class="eyebrow">Activity</span><h1>Notifications</h1></div><div id="notes"><div class="empty small">Loading…</div></div></div>`;
  try { const ns = await api("notifications"); S.me.unread = 0; document.dispatchEvent(new Event("nunchi:me"));
    $("#notes").innerHTML = ns.length ? ns.map(n=>{ const d = n.dramaId && S.BYID.get(n.dramaId);
      const what = n.type==="follow" ? "started following you" : n.type==="like" ? `liked your review of <b>${esc(d?.title||"a drama")}</b>` : `commented on your review of <b>${esc(d?.title||"a drama")}</b>: “${esc(n.text||"")}”`;
      const href = n.type==="follow" ? `#u-${esc(n.user.handle)}` : `#drama-${esc(n.dramaId)}`;
      return `<a class="note ${n.unread?"unread":""}" href="${href}">${avatarHtml(n.user,44)}<div><b>${esc(n.user.name)}</b> ${what}<div class="handle">${timeAgo(n.at)}</div></div>${d?thumbHtml(d,"note-thumb"):""}</a>`; }).join("")
      : `<div class="empty"><img src="/star.png" alt="">No notifications yet. When someone follows you, likes or comments on your reviews, you'll see it here.</div>`;
  } catch(e){ $("#notes").innerHTML = `<div class="empty small">${esc(e.message)}</div>`; }
}
