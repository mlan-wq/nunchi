// Nunchi API: profiles, follows, watchlists, ratings, reviews, likes, comments, notifications and profile images, stored in Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { getUser, verifyRequestOrigin } from "@netlify/identity";
import type { Config, Context } from "@netlify/functions";

const store = () => getStore({ name: "nunchi", consistency: "strong" });
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const err = (status: number, message: string) => json({ error: message }, status);

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const PRESET_RE = /^\/(avatars\/a\d{2}\.svg|banners\/[a-z-]{3,40}\.jpg)$/;
const STATUSES = ["want", "watching", "done"];
const MAX_FAVORITES = 100;
const AVATAR_COUNT = 24;
const inv = () => String(9999999999999 - Date.now()).padStart(13, "0");

type Entry = { status?: string; rating?: number; at: number };
type Profile = {
  uid: string; handle: string; name: string; bio: string;
  avatar?: string; banner?: string; favorites: string[];
  list: Record<string, Entry>; createdAt: number;
};

const S = () => store();
async function getJSON<T = any>(key: string): Promise<T | null> { return (await S().get(key, { type: "json" })) as T | null; }
async function keys(prefix: string) { return (await S().list({ prefix })).blobs.map(b => b.key); }
async function loadProfile(uid: string) { return getJSON<Profile>(`profiles/${uid}`); }
async function saveProfile(p: Profile) { await S().setJSON(`profiles/${p.uid}`, p); }
async function uidForHandle(handle: string) { return (await S().get(`handles/${handle}`)) || null; }
const card = (p: Profile | null) => p && { uid: p.uid, handle: p.handle, name: p.name, avatar: p.avatar || null };
const cache = new Map<string, Promise<Profile | null>>();
const profileCached = (uid: string) => { if (!cache.has(uid)) cache.set(uid, loadProfile(uid)); return cache.get(uid)!; };

async function newProfile(user: { id: string; email?: string; name?: string }): Promise<Profile> {
  const base = (user.name || user.email?.split("@")[0] || "fan").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14) || "fan";
  let handle = base.length >= 3 ? base : `${base}fan`;
  for (let i = 0; i < 20; i++) {
    const { modified } = await S().set(`handles/${handle}`, user.id, { onlyIfNew: true });
    if (modified) break;
    handle = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  const avatar = `/avatars/a${String(Math.floor(Math.random() * AVATAR_COUNT) + 1).padStart(2, "0")}.svg`;
  const p: Profile = { uid: user.id, handle, name: user.name || handle, bio: "", avatar, banner: "/banners/canola-fields.jpg", favorites: [], list: {}, createdAt: Date.now() };
  await saveProfile(p);
  return p;
}

async function notify(to: string, from: string, type: string, extra: Record<string, unknown> = {}) {
  if (to === from) return;
  await S().setJSON(`notes/${to}/${inv()}-${from.slice(0, 8)}`, { type, from, at: Date.now(), ...extra });
}

// Adds author card, like count, whether I liked it, and comment count to each review.
async function enrich(revs: any[], meUid?: string) {
  return (await Promise.all(revs.map(async r => {
    if (!r) return null;
    const [user, likes, comments] = await Promise.all([profileCached(r.uid), keys(`likes/${r.dramaId}/${r.uid}/`), keys(`comments/${r.dramaId}/${r.uid}/`)]);
    if (!user) return null;
    return { ...r, user: card(user), likes: likes.length, liked: !!meUid && likes.some(k => k.endsWith(`/${meUid}`)), comments: comments.length };
  }))).filter(Boolean);
}

async function readBody(req: Request) { try { return await req.json(); } catch { return {}; } }

export default async (req: Request, _context: Context) => {
  cache.clear();
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const method = req.method;
  const write = method !== "GET" && method !== "HEAD";
  try { if (write) verifyRequestOrigin(req); } catch { return err(403, "Request blocked: wrong origin."); }

  let meCache: Profile | null | undefined;
  const authed = async () => {
    if (meCache !== undefined) return meCache;
    const u = await getUser();
    meCache = u ? ((await loadProfile(u.id)) || (await newProfile({ id: u.id, email: u.email, name: u.name }))) : null;
    return meCache;
  };
  const [a, b, c, d] = parts;

  // ---------- me ----------
  if (a === "me" && !b && method === "GET") {
    const me = await authed(); if (!me) return err(401, "Log in to see your profile.");
    const [following, notes] = await Promise.all([keys(`follows/${me.uid}/`), keys(`notes/${me.uid}/`)]);
    const seen = (await S().get(`seen/${me.uid}`)) || "";
    return json({ ...me, following: following.map(k => k.split("/")[2]), unread: notes.filter(k => k.split("/")[2] < seen || !seen).length });
  }
  if (a === "me" && !b && method === "PUT") {
    const me = await authed(); if (!me) return err(401, "Log in to edit your profile.");
    const body = await readBody(req);
    if (typeof body.name === "string") me.name = body.name.trim().slice(0, 40) || me.handle;
    if (typeof body.bio === "string") me.bio = body.bio.trim().slice(0, 280);
    if (Array.isArray(body.favorites)) me.favorites = [...new Set(body.favorites.map(String))].slice(0, MAX_FAVORITES) as string[];
    for (const k of ["avatar", "banner"] as const) if (typeof body[k] === "string") {
      if (body[k] === "") delete me[k];
      else if (PRESET_RE.test(body[k])) me[k] = body[k];
      else return err(400, "Pick one of the illustrations or upload your own image.");
    }
    if (typeof body.handle === "string" && body.handle !== me.handle) {
      const h = body.handle.toLowerCase().trim();
      if (!HANDLE_RE.test(h)) return err(400, "Usernames use 3–20 letters, numbers or underscores.");
      const { modified } = await S().set(`handles/${h}`, me.uid, { onlyIfNew: true });
      if (!modified) return err(409, `@${h} is taken. Try another username.`);
      await S().delete(`handles/${me.handle}`);
      me.handle = h;
    }
    await saveProfile(me);
    return json(me);
  }
  if (a === "me" && b === "image" && method === "POST") {
    if (c !== "avatar" && c !== "banner") return err(400, "Unknown image type.");
    const me = await authed(); if (!me) return err(401, "Log in to change your photo.");
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return err(415, "Use a JPG, PNG or WebP image.");
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 3 * 1024 * 1024) return err(413, "That image is over 3 MB.");
    await S().set(`media/${me.uid}/${c}`, buf, { metadata: { type } });
    me[c] = `/api/media/${me.uid}/${c}?v=${Date.now()}`;
    await saveProfile(me);
    return json(me);
  }
  if (a === "media" && b && c && method === "GET") {
    const entry = await S().getWithMetadata(`media/${b}/${c}`, { type: "arrayBuffer" });
    if (entry === null) return new Response("Not found", { status: 404 });
    return new Response(entry.data as ArrayBuffer, { headers: { "content-type": String(entry.metadata?.type || "image/jpeg"), "cache-control": "public, max-age=31536000, immutable" } });
  }

  // ---------- list, ratings, reviews ----------
  if (a === "list" && b && method === "PUT") {
    const me = await authed(); if (!me) return err(401, "Log in to save dramas to your list.");
    const id = b.slice(0, 40);
    const body = await readBody(req);
    const cur: Entry = me.list[id] || { at: Date.now() };
    if (body.status !== undefined) {
      if (body.status === "none") delete cur.status;
      else if (STATUSES.includes(body.status)) cur.status = body.status;
      else return err(400, "Unknown status.");
    }
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (r === 0) delete cur.rating;
      else if (r >= 0.5 && r <= 5) cur.rating = Math.round(r * 2) / 2;
      else return err(400, "Ratings go from 0.5 to 5 stars.");
    }
    cur.at = Date.now();
    if (cur.status || cur.rating) me.list[id] = cur; else delete me.list[id];
    const rkey = `reviews/${id}/${me.uid}`;
    const old = await getJSON(rkey);
    if (typeof body.review === "string" || (old && body.rating !== undefined)) {
      const text = typeof body.review === "string" ? body.review.trim().slice(0, 2000) : old?.text || "";
      const spoiler = typeof body.spoiler === "boolean" ? body.spoiler : !!old?.spoiler;
      if (old?.feedKey) await S().delete(old.feedKey);
      if (text || cur.rating) {
        const feedKey = `feed/${inv()}-${me.uid}`;
        const rev = { uid: me.uid, dramaId: id, rating: cur.rating || null, text, spoiler, at: old?.at && old.text === text ? old.at : Date.now(), editedAt: Date.now(), feedKey };
        await S().setJSON(rkey, rev);
        if (text) await S().setJSON(feedKey, { uid: me.uid, dramaId: id });
      } else await S().delete(rkey);
    }
    await saveProfile(me);
    return json(me);
  }
  if (a === "reviews" && b && method === "GET") {
    const me = await authed();
    const revs = await Promise.all((await keys(`reviews/${b}/`)).slice(0, 200).map(k => getJSON(k)));
    return json((await enrich(revs, me?.uid)).sort((x: any, y: any) => (y.likes - x.likes) || (y.at - x.at)));
  }
  if (a === "feed" && method === "GET") {
    const me = await authed();
    const ks = (await keys("feed/")).sort().slice(0, 24);
    const ptrs = await Promise.all(ks.map(k => getJSON(k)));
    const revs = await Promise.all(ptrs.filter(Boolean).map((p: any) => getJSON(`reviews/${p.dramaId}/${p.uid}`)));
    return json(await enrich(revs.filter((r: any) => r?.text), me?.uid));
  }

  // ---------- likes & comments ----------
  if (a === "like" && b && c && (method === "POST" || method === "DELETE")) {
    const me = await authed(); if (!me) return err(401, "Log in to like reviews.");
    const review = await getJSON(`reviews/${b}/${c}`); if (!review) return err(404, "That review no longer exists.");
    const k = `likes/${b}/${c}/${me.uid}`;
    if (method === "POST") { const { modified } = await S().set(k, "1", { onlyIfNew: true }); if (modified) await notify(c, me.uid, "like", { dramaId: b }); }
    else await S().delete(k);
    const likes = await keys(`likes/${b}/${c}/`);
    return json({ likes: likes.length, liked: method === "POST" });
  }
  if (a === "comments" && b && c && method === "GET") {
    const cs = await Promise.all((await keys(`comments/${b}/${c}/`)).sort().slice(0, 200).map(async k => {
      const cm = await getJSON(k); return cm && { ...cm, key: k.split("/").pop(), user: card(await profileCached(cm.uid)) };
    }));
    return json(cs.filter((x: any) => x?.user));
  }
  if (a === "comments" && b && c && method === "POST") {
    const me = await authed(); if (!me) return err(401, "Log in to comment.");
    const review = await getJSON(`reviews/${b}/${c}`); if (!review) return err(404, "That review no longer exists.");
    const text = String((await readBody(req)).text || "").trim().slice(0, 600);
    if (!text) return err(400, "Write something first.");
    const key = `${String(Date.now()).padStart(13, "0")}-${me.uid.slice(0, 8)}`;
    await S().setJSON(`comments/${b}/${c}/${key}`, { uid: me.uid, text, at: Date.now() });
    await notify(c, me.uid, "comment", { dramaId: b, text: text.slice(0, 80) });
    return json({ key, uid: me.uid, text, at: Date.now(), user: card(me) });
  }
  if (a === "comments" && b && c && d && method === "DELETE") {
    const me = await authed(); if (!me) return err(401, "Log in first.");
    const k = `comments/${b}/${c}/${d}`; const cm = await getJSON(k);
    if (!cm) return json({ ok: true });
    if (cm.uid !== me.uid && c !== me.uid) return err(403, "You can only delete your own comments, or comments on your review.");
    await S().delete(k);
    return json({ ok: true });
  }

  // ---------- follows ----------
  if (a === "follow" && b && (method === "POST" || method === "DELETE")) {
    const me = await authed(); if (!me) return err(401, "Log in to follow people.");
    const them = await uidForHandle(b.toLowerCase()); if (!them) return err(404, "We couldn't find that profile.");
    if (them === me.uid) return err(400, "You can't follow yourself.");
    if (method === "POST") {
      const { modified } = await S().set(`follows/${me.uid}/${them}`, "1", { onlyIfNew: true });
      await S().set(`followers/${them}/${me.uid}`, "1");
      if (modified) await notify(them, me.uid, "follow");
    } else { await S().delete(`follows/${me.uid}/${them}`); await S().delete(`followers/${them}/${me.uid}`); }
    return json({ following: method === "POST", followers: (await keys(`followers/${them}/`)).length });
  }
  if (a === "u" && b && (c === "followers" || c === "following") && method === "GET") {
    const uid = await uidForHandle(b.toLowerCase()); if (!uid) return err(404, "We couldn't find that profile.");
    const ids = (await keys(`${c === "followers" ? "followers" : "follows"}/${uid}/`)).map(k => k.split("/")[2]);
    return json((await Promise.all(ids.slice(0, 500).map(profileCached))).filter(Boolean).map(p => ({ ...card(p), bio: p!.bio })));
  }

  // ---------- activity & notifications ----------
  if (a === "activity" && method === "GET") {
    const me = await authed(); if (!me) return err(401, "Log in to see your friends' activity.");
    const ids = (await keys(`follows/${me.uid}/`)).map(k => k.split("/")[2]);
    const items: any[] = [];
    for (const p of (await Promise.all(ids.slice(0, 200).map(profileCached))).filter(Boolean) as Profile[])
      for (const [dramaId, e] of Object.entries(p.list)) items.push({ user: card(p), dramaId, status: e.status || null, rating: e.rating || null, at: e.at });
    items.sort((x, y) => y.at - x.at);
    const top = items.slice(0, 40);
    const withText = await Promise.all(top.map(async it => { const r = await getJSON(`reviews/${it.dramaId}/${it.user.uid}`); return { ...it, text: r?.text || "" }; }));
    return json(withText);
  }
  if (a === "notifications" && method === "GET") {
    const me = await authed(); if (!me) return err(401, "Log in to see notifications.");
    const ks = (await keys(`notes/${me.uid}/`)).sort().slice(0, 30);
    const seen = (await S().get(`seen/${me.uid}`)) || "";
    const ns = await Promise.all(ks.map(async k => { const n = await getJSON(k); const key = k.split("/")[2]; return n && { ...n, unread: !seen || key < seen, user: card(await profileCached(n.from)) }; }));
    if (ks[0]) await S().set(`seen/${me.uid}`, ks[0]);
    return json(ns.filter((n: any) => n?.user));
  }

  // ---------- profiles & members ----------
  if (a === "u" && b && !c && method === "GET") {
    const uid = await uidForHandle(b.toLowerCase());
    const p = uid && (await loadProfile(uid));
    if (!p) return err(404, "We couldn't find that profile.");
    const me = await authed();
    const reviewKeys = (await keys("reviews/")).filter(k => k.endsWith(`/${p.uid}`)).slice(0, 200);
    const [reviews, followers, following] = await Promise.all([
      enrich(await Promise.all(reviewKeys.map(k => getJSON(k))), me?.uid),
      keys(`followers/${p.uid}/`), keys(`follows/${p.uid}/`)
    ]);
    return json({ ...p, reviews, followers: followers.length, following: following.length, isFollowing: !!me && followers.some(k => k.endsWith(`/${me.uid}`)), followsYou: !!me && following.some(k => k.endsWith(`/${me.uid}`)) });
  }
  if (a === "members" && method === "GET") {
    const me = await authed();
    const myFollows = me ? new Set((await keys(`follows/${me.uid}/`)).map(k => k.split("/")[2])) : new Set();
    const ps = (await Promise.all((await keys("profiles/")).slice(0, 500).map(k => getJSON<Profile>(k)))).filter(Boolean) as Profile[];
    const counts = await Promise.all(ps.map(p => keys(`followers/${p.uid}/`)));
    return json(ps.map((p, i) => ({
      ...card(p), bio: p.bio, banner: p.banner || null, favorites: p.favorites.slice(0, 6), followers: counts[i].length, isFollowing: myFollows.has(p.uid),
      finished: Object.values(p.list).filter(e => e.status === "done").length,
      ratings: Object.values(p.list).filter(e => e.rating).length, createdAt: p.createdAt
    })).sort((x, y) => y.followers - x.followers || y.createdAt - x.createdAt));
  }

  return err(404, "Unknown API route.");
};

export const config: Config = { path: "/api/*" };
