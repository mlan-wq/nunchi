import { restoreSessionCookies, hasSavedSession } from "./session.js";
import { getUser, login, signup, logout, oauthLogin, handleAuthCallback, getSettings, requestPasswordRecovery, updateUser, acceptInvite, onAuthChange, refreshSession } from "@netlify/identity";
import { S, $, esc, ls, toast, api, setRefresher, COUNTRY, STATUS } from "./core.js";
import { avatarHtml, commentHtml, reviewCard, thumbHtml, viewHome, viewCatalog, renderResults, catState, viewDetail, viewRanking, viewCommunity, renderMembers, viewMyList, viewProfile, openPeople, viewEditProfile, viewNotifications } from "./views.js";
import { TAB_ICONS } from "./icons.js";

/* ---------- AUTH UI ---------- */
function renderAuthSlot(){
  const slot = $("#authSlot");
  if (S.me) slot.innerHTML = `<a class="icon-btn bell" href="#notifications" aria-label="Notifications">${TAB_ICONS.bell}${S.me.unread?`<span class="dot">${S.me.unread>9?"9+":S.me.unread}</span>`:""}</a><a class="me-pill" href="#u-${esc(S.me.handle)}" title="Your profile">${avatarHtml(S.me,34)}<span>${esc(S.me.name)}</span></a>`;
  else slot.innerHTML = `<button class="list-pill" data-act="login">Log in</button>`;
  const tab = $("#tabMe"); if (tab) { tab.href = S.me ? `#u-${S.me.handle}` : "#login"; tab.querySelector(".tab-ic").innerHTML = S.me ? avatarHtml(S.me,26) : TAB_ICONS.me; tab.querySelector(".tab-label").textContent = S.me ? "Profile" : "Log in"; }
}
document.addEventListener("nunchi:me", renderAuthSlot);
let authMode = "login", settings = null;
async function openAuth(mode="login", note=""){
  authMode = mode;
  if (!S.identityOn){ toast("Accounts aren't switched on for this site yet."); return; }
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
    await loadMe(); toast(`Hi ${S.me?.name || "there"}!`);
    if (authMode==="signup" || authMode==="invite") location.hash = "#edit-profile"; else route();
  } catch (err) {
    errEl.textContent = /invalid|credentials|password/i.test(err.message) ? "That email and password don't match. Try again or reset your password." : err.message;
    errEl.hidden = false;
  } finally { btn.disabled = false; }
}
let pendingToken = null;
async function loadMe(){
  try {
    restoreSessionCookies();
    const u = await getUser();
    if (u) { try { await refreshSession(); } catch {} }
    S.me = u ? await api("me").catch(async e => { if (e.status!==401 || !hasSavedSession()) throw e; await refreshSession().catch(()=>{}); return api("me"); }) : null;
  }
  catch(e){ S.me = null; if (e?.name==="MissingIdentityError") S.identityOn = false; }
  renderAuthSlot();
}
function requireLogin(why){ openAuth("login", why); return null; }

/* ---------- ROUTER ---------- */
async function route(){
  const h = decodeURIComponent(location.hash.slice(1)) || "home";
  const app = $("#app"); let v = h;
  if (h==="login") { if (S.me) { location.replace(`#u-${S.me.handle}`); return; } openAuth("login"); history.replaceState(null,"","#home"); await viewHome(app); v="home"; }
  else if (h.startsWith("drama-")) { await viewDetail(app, h.slice(6)); v="catalog"; }
  else if (h.startsWith("u-")) { await viewProfile(app, h.slice(2)); v = S.me && h.slice(2)===S.me.handle ? "me" : "community"; }
  else if (h==="catalog") viewCatalog(app);
  else if (h==="ranking") viewRanking(app);
  else if (h==="community") await viewCommunity(app);
  else if (h==="my-list") viewMyList(app);
  else if (h==="notifications") { if (!S.me) { requireLogin("Log in to see notifications."); await viewHome(app); } else await viewNotifications(app); v="me"; }
  else if (h==="edit-profile") { if (!S.me) { requireLogin("Log in to edit your profile."); await viewHome(app); } else viewEditProfile(app); v="me"; }
  else { await viewHome(app); v="home"; }
  document.querySelectorAll("[data-v]").forEach(a=>a.classList.toggle("active", a.dataset.v===v));
}
// Remember where you were on each page, so "back" returns to the same spot (catalog, home, lists…).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const scrollMemory = new Map();
let prevHash = location.hash, fromHash = "", goingBack = false;
window.addEventListener("popstate", ()=>{ goingBack = true; });
window.addEventListener("hashchange", async ()=>{
  scrollMemory.set(prevHash, lastScrollY);
  const back = goingBack; goingBack = false; fromHash = prevHash; prevHash = location.hash;
  await route();
  const y = back ? scrollMemory.get(location.hash) : 0;
  if (y) { // images and lists can take a moment to lay out; retry until the page is tall enough
    for (let i = 0; i < 20 && document.documentElement.scrollHeight < y + innerHeight; i++) await new Promise(r => setTimeout(r, 50));
    window.scrollTo(0, y);
  } else window.scrollTo(0, 0);
});
let lastScrollY = 0;
window.addEventListener("scroll", ()=>{ lastScrollY = scrollY; }, {passive:true});
const go = h => { if (location.hash===h) route(); else location.hash = h; };
async function rerender(){ const y = scrollY; await route(); scrollTo(0,y); }

/* ---------- ACTIONS ---------- */
async function setList(id, body, msg){
  if (!S.me) return requireLogin("Log in to save dramas to your list.");
  try { S.me = {...S.me, ...await api(`list/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify(body)})}; if (msg) toast(msg); return true; } catch(err){ toast(err.message); return false; }
}
async function saveMe(body, msg){
  try { S.me = {...S.me, ...await api("me",{method:"PUT",body:JSON.stringify(body)})}; renderAuthSlot(); if (msg) toast(msg); return true; }
  catch(err){ toast(err.message); return false; }
}
async function toggleFav(id, add){
  if (!S.me) return requireLogin("Log in to pick your favorites.");
  const favorites = add ? [...new Set([...S.me.favorites, id])] : S.me.favorites.filter(x=>x!==id);
  return saveMe({favorites}, add ? "Added to favorites ♥" : "Removed from favorites");
}
async function toggleThread(article){
  const th = article.querySelector(".rc-thread"), rid = article.dataset.rid, [dramaId, author] = rid.split("|");
  if (!th.hidden) { th.hidden = true; return; }
  th.hidden = false; th.innerHTML = `<div class="empty small">Loading comments…</div>`;
  try { const cs = await api(`comments/${encodeURIComponent(dramaId)}/${author}`);
    th.innerHTML = `<div class="cmts">${cs.map(c=>commentHtml(c,rid)).join("")}</div>` + (S.me ? `<form class="cmt-form" data-rid="${esc(rid)}">${avatarHtml(S.me,30)}<input name="text" maxlength="600" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off"><button class="btn small" type="submit">Send</button></form>` : `<button class="link" data-act="login">Log in to comment</button>`);
  } catch(e){ th.innerHTML = `<div class="empty small">${esc(e.message)}</div>`; }
}

document.addEventListener("submit", async e=>{
  const f = e.target;
  if (f.id==="heroSearch"){ e.preventDefault(); Object.assign(catState,{q:$("#heroQ").value, plat:"all", genre:"all", limit:60}); go("#catalog"); }
  if (f.id==="authForm") submitAuth(e);
  if (f.classList.contains("cmt-form")){ e.preventDefault();
    const text = f.text.value.trim(); if (!text) return; const rid = f.dataset.rid, [dramaId, author] = rid.split("|");
    f.querySelector("button").disabled = true;
    try { const c = await api(`comments/${encodeURIComponent(dramaId)}/${author}`,{method:"POST",body:JSON.stringify({text})});
      f.previousElementSibling.insertAdjacentHTML("beforeend", commentHtml(c, rid)); f.text.value="";
      const n = f.closest(".rcard").querySelector(`[data-comments] .n`); n.textContent = +n.textContent+1; }
    catch(err){ toast(err.message); } finally { f.querySelector("button").disabled = false; f.text.focus(); }
  }
  if (f.id==="profileForm"){ e.preventDefault();
    const errEl=$("#profileError"); errEl.hidden=true;
    try { S.me = {...S.me, ...await api("me",{method:"PUT", body:JSON.stringify({name:$("#pName").value, handle:$("#pHandle").value.toLowerCase(), bio:$("#pBio").value})})};
      renderAuthSlot(); toast("Profile saved"); go(`#u-${S.me.handle}`); }
    catch(err){ errEl.textContent=err.message; errEl.hidden=false; }
  }
});
document.addEventListener("input", e=>{
  const t = e.target;
  if (t.id==="catQ"){ catState.q=t.value; catState.limit=60; renderResults(); }
  if (t.id==="memberQ") renderMembers();
  if (t.id==="favQ"){ const q=t.value.trim().toLowerCase(); const el=$("#favResults");
    el.innerHTML = q.length<2 ? "" : S.DRAMAS.filter(d=>d.title.toLowerCase().includes(q) && !S.me.favorites.includes(d.id)).sort((a,b)=>b.pop-a.pop).slice(0,6)
      .map(d=>`<button type="button" class="fav-option" data-fav="${d.id}">${thumbHtml(d)}<span>${esc(d.title)} <small>${d.year}</small></span><b>＋</b></button>`).join(""); }
});
document.addEventListener("change", async e=>{
  const t=e.target;
  if (t.id==="pSort"){ S.profileSort=t.value; rerender(); return; }
  if (t.id==="region"){ S.region=t.value; ls.set("nunchi:region",S.region); catState.plat="all"; route(); }
  if (t.id==="catGenre"){ catState.genre=t.value; catState.limit=60; renderResults(); }
  if (t.id==="catDecade"){ catState.decade=t.value; catState.limit=60; renderResults(); }
  if (t.id==="catSort"){ catState.sort=t.value; renderResults(); }
  if (t.dataset.listid){ if (await setList(t.dataset.listid,{status:t.value}, t.value==="none"?"Removed from your list":`Moved to ${STATUS[t.value]}`)) rerender(); }
  if (t.dataset.img){ const f=t.files[0]; if(!f) return; const kind=t.dataset.img;
    try { toast("Uploading…"); const blob = await resizeImage(f, kind==="banner"?1800:480, kind==="banner"?700:480);
      S.me = {...S.me, ...await api(`me/image/${kind}`,{method:"POST", body:blob, headers:{"content-type":"image/jpeg"}})}; renderAuthSlot(); toast(kind==="banner"?"Banner updated":"Photo updated"); keepFormRerender(); }
    catch(err){ toast(err.message); } }
});
function keepFormRerender(){
  const keep = {n:$("#pName")?.value, h:$("#pHandle")?.value, b:$("#pBio")?.value}, y = scrollY;
  viewEditProfile($("#app")); if (keep.n!==undefined){ $("#pName").value=keep.n; $("#pHandle").value=keep.h; $("#pBio").value=keep.b; } scrollTo(0,y);
}
document.addEventListener("click", async e=>{
  const back = e.target.closest("a.back");
  if (back && fromHash && (fromHash===back.getAttribute("href") || fromHash==="#catalog")) { e.preventDefault(); history.back(); return; }
  const b = e.target.closest("button, a[data-act], a[data-jump]"); if(!b) return;
  const id = decodeURIComponent(location.hash).startsWith("#drama-") ? decodeURIComponent(location.hash).slice(7) : null;
  const act = b.dataset.act;
  if (b.dataset.jump){ e.preventDefault(); document.getElementById(b.dataset.jump)?.scrollIntoView({behavior:"smooth"}); setTimeout(()=>$("#reviewText")?.focus({preventScroll:true}), 500); return; }
  if (act==="closeDialog") { $("#authDialog").close(); return; }
  if (act==="login") openAuth("login");
  if (act==="signup") openAuth("signup");
  if (act==="logout"){ await logout(); S.me=null; renderAuthSlot(); toast("Logged out"); go("#home"); }
  if (act==="more"){ catState.limit+=60; renderResults(); }
  if (act==="reveal"){ b.closest(".rc-text").classList.remove("spoiler"); b.remove(); }
  if (act==="expand"){ b.previousElementSibling.classList.remove("clamp"); b.remove(); }
  if (b.dataset.auth) openAuth(b.dataset.auth);
  if (b.dataset.oauth) oauthLogin(b.dataset.oauth);
  if (b.dataset.plat){ catState.plat=b.dataset.plat; catState.limit=60;
    if (location.hash!=="#catalog"){ catState.q=""; catState.genre="all"; go("#catalog"); return; }
    document.querySelectorAll("#platChips .chip").forEach(c=>c.setAttribute("aria-pressed", c.dataset.plat===catState.plat)); renderResults(); }
  if (b.dataset.genre){ Object.assign(catState,{genre:b.dataset.genre, q:"", plat:"all", limit:60}); go("#catalog"); }
  if (b.dataset.tab){ S.listTab=b.dataset.tab; route(); }
  if (b.dataset.avtab){ S.avatarTab=b.dataset.avtab; keepFormRerender(); return; }
  if (b.dataset.msort){ S.memberSort=b.dataset.msort; document.querySelectorAll("[data-msort]").forEach(c=>c.setAttribute("aria-pressed", c===b)); renderMembers(); }
  if (b.dataset.ptab){ S.profileTab=b.dataset.ptab; S.profileStars="all"; rerender(); }
  if (b.dataset.pstars){ S.profileStars=b.dataset.pstars; rerender(); }
  if (b.dataset.people){ const [kind, h] = b.dataset.people.split("|"); openPeople(kind, h); }
  if (b.dataset.status && id){
    const cur = S.me?.list?.[id]?.status; const next = cur===b.dataset.status ? "none" : b.dataset.status;
    if (await setList(id,{status:next}, next==="none"?"Removed from your list":`Saved as ${STATUS[next]}`)) rerender();
  }
  if (b.dataset.rate!==undefined && id){
    const txt=$("#reviewText")?.value;
    const n = +b.dataset.rate, msg = n ? `Saved! You gave it ${n} star${n===1?"":"s"}` : "Rating cleared";
    if (await setList(id,{rating:n}, n ? null : msg)) { S.flash = {id, kind:"rate", msg}; await rerender(); S.flash = null; if(txt && $("#reviewText")) $("#reviewText").value=txt; }
  }
  if (act==="saveReview" && id){
    const text = $("#reviewText").value.trim();
    if (!text && !S.me.list[id]?.rating) return toast("Add a rating or write a few words first.");
    const msg = text ? "Your review is posted ✨ Everyone in the community can read it now." : "Review removed";
    if (await setList(id,{review:text, spoiler:$("#spoiler").checked}, text?"Review posted ✨":"Review removed")) { S.flash = {id, kind:"review", msg}; await rerender(); S.flash = null; }
  }
  if (b.dataset.fav || b.dataset.unfav){
    const ok = await toggleFav(b.dataset.fav || b.dataset.unfav, !!b.dataset.fav);
    if (ok) { if (location.hash==="#edit-profile") { keepFormRerender(); $("#favQ")?.focus(); } else rerender(); }
  }
  if (b.dataset.avatar){ if (await saveMe({avatar:b.dataset.avatar},"Profile picture updated")) keepFormRerender(); }
  if (b.dataset.banner){ if (await saveMe({banner:b.dataset.banner},"Banner updated")) keepFormRerender(); }
  if (b.dataset.follow){
    if (!S.me) return requireLogin("Log in to follow people.");
    const on = b.dataset.on==="1", h = b.dataset.follow; b.disabled = true;
    try { await api(`follow/${encodeURIComponent(h)}`,{method:on?"DELETE":"POST"});
      document.querySelectorAll(`[data-follow="${CSS.escape(h)}"]`).forEach(x=>{ x.dataset.on=on?"0":"1"; x.textContent=on?"Follow":"Following"; x.classList.toggle("ghost",!on); });
      const m = (S.members||[]).find(x=>x.handle===h); if (m) m.isFollowing = !on;
      S.me = {...S.me, ...await api("me")};
      toast(on?`Unfollowed @${h}`:`Following @${h} 💜`); if (location.hash===`#u-${h}`) rerender(); }
    catch(err){ toast(err.message); } finally { b.disabled = false; }
  }
  if (b.dataset.like){
    if (!S.me) return requireLogin("Log in to like reviews.");
    const [dramaId, author] = b.dataset.like.split("|"), on = b.classList.contains("on");
    b.classList.toggle("on", !on); b.querySelector(".heart").textContent = on?"♡":"♥"; const n = b.querySelector(".n"); n.textContent = +n.textContent + (on?-1:1);
    try { const r = await api(`like/${encodeURIComponent(dramaId)}/${author}`,{method:on?"DELETE":"POST"}); n.textContent = r.likes; }
    catch(err){ toast(err.message); b.classList.toggle("on", on); b.querySelector(".heart").textContent = on?"♥":"♡"; }
  }
  if (b.dataset.comments) toggleThread(b.closest(".rcard"));
  if (b.dataset.delcomment){
    const [dramaId, author, key] = b.dataset.delcomment.split("|");
    try { await api(`comments/${encodeURIComponent(dramaId)}/${author}/${key}`,{method:"DELETE"}); const card=b.closest(".rcard"); b.closest(".cmt").remove(); const n=card.querySelector("[data-comments] .n"); n.textContent=Math.max(0,+n.textContent-1); }
    catch(err){ toast(err.message); }
  }
});

async function resizeImage(file, maxW, maxH){
  const img = await createImageBitmap(file);
  const s = Math.min(1, maxW/img.width, maxH/img.height);
  const c = Object.assign(document.createElement("canvas"), {width:Math.round(img.width*s), height:Math.round(img.height*s)});
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r=>c.toBlob(r, "image/jpeg", 0.86));
}

/* ---------- BOOT ---------- */
async function boot(){
  document.querySelectorAll(".tabbar a").forEach(a=>{ const ic=a.querySelector(".tab-ic"); if (ic && !ic.innerHTML) ic.innerHTML = TAB_ICONS[a.dataset.v] || ""; });
  try { S.CAT = await (await fetch("/data/dramas.json")).json(); } catch { S.CAT = {source:"seed", regions:["US"], dramas:[]}; }
  S.DRAMAS = S.CAT.dramas; S.BYID = new Map(S.DRAMAS.map(d=>[d.id,d]));
  const guess = (navigator.language||"").split("-")[1]?.toUpperCase();
  S.region = ls.get("nunchi:region", S.CAT.regions.includes(guess) ? guess : S.CAT.regions[0]);
  if (!S.CAT.regions.includes(S.region)) S.region = S.CAT.regions[0];
  $("#region").innerHTML = S.CAT.regions.map(r=>`<option value="${r}" ${r===S.region?"selected":""}>${r}</option>`).join("");
  $("#region").title = "Streaming country";
  $("#dataNote").innerHTML = S.CAT.source==="tmdb"
    ? `Posters and data from <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>, streaming data by JustWatch. This product uses the TMDB API but is not endorsed or certified by TMDB.`
    : `${S.DRAMAS.length} K-dramas in the starter catalog · streaming availability for the US`;
  try {
    const cb = await handleAuthCallback();
    if (cb?.type==="invite" && cb.token){ pendingToken=cb.token; openAuth("invite"); }
    else if (cb?.type==="recovery") openAuth("reset");
    else if (cb) toast("You're in!");
  } catch(e){ if (e?.name==="MissingIdentityError") S.identityOn=false; }
  await loadMe();
  try { onAuthChange(ev=>{ if (ev!=="token_refresh") loadMe(); }); } catch {}
  // force a fresh token (the stored one may have expired while the app slept) and retry once
  setRefresher(async ()=>{ restoreSessionCookies(); const u = await getUser(); if (!u) return null; await refreshSession().catch(()=>{}); return true; });
  document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="visible" && S.me) refreshSession().catch(()=>{}); });
  await route();
  setInterval(async ()=>{ if (S.me && document.visibilityState==="visible") { try { const m = await api("me"); if (m.unread!==S.me.unread) { S.me.unread = m.unread; renderAuthSlot(); } } catch {} } }, 60000);
}
boot();
