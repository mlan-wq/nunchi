// Nunchi API: profiles, watchlists, ratings, reviews and profile images, stored in Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { getUser, verifyRequestOrigin } from "@netlify/identity";
import type { Config, Context } from "@netlify/functions";

const store = () => getStore({ name: "nunchi", consistency: "strong" });
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const err = (status: number, message: string) => json({ error: message }, status);

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const STATUSES = ["want", "watching", "done"];
const MAX_FAVORITES = 6;

type Entry = { status?: string; rating?: number; at: number };
type Profile = {
  uid: string; handle: string; name: string; bio: string;
  avatar?: string; banner?: string; favorites: string[];
  list: Record<string, Entry>; createdAt: number;
};

async function loadProfile(uid: string): Promise<Profile | null> {
  return (await store().get(`profiles/${uid}`, { type: "json" })) as Profile | null;
}
async function saveProfile(p: Profile) { await store().setJSON(`profiles/${p.uid}`, p); }
async function uidForHandle(handle: string) { return (await store().get(`handles/${handle}`)) || null; }
const publicProfile = (p: Profile) => ({ ...p });
const card = (p: Profile | null) => p && { handle: p.handle, name: p.name, avatar: p.avatar || null };

async function newProfile(user: { id: string; email?: string; name?: string }): Promise<Profile> {
  const base = (user.name || user.email?.split("@")[0] || "fan").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14) || "fan";
  let handle = base.length >= 3 ? base : `${base}fan`;
  for (let i = 0; i < 20; i++) {
    const { modified } = await store().set(`handles/${handle}`, user.id, { onlyIfNew: true });
    if (modified) break;
    handle = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  const p: Profile = { uid: user.id, handle, name: user.name || handle, bio: "", favorites: [], list: {}, createdAt: Date.now() };
  await saveProfile(p);
  return p;
}

async function readBody(req: Request) { try { return await req.json(); } catch { return {}; } }

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const method = req.method;
  const write = method !== "GET" && method !== "HEAD";

  try {
    if (write) verifyRequestOrigin(req);
  } catch { return err(403, "Request blocked: wrong origin."); }

  const authed = async () => {
    const u = await getUser();
    if (!u) return null;
    return (await loadProfile(u.id)) || newProfile({ id: u.id, email: u.email, name: u.name });
  };

  // GET /api/me
  if (parts[0] === "me" && parts.length === 1 && method === "GET") {
    const me = await authed(); if (!me) return err(401, "Log in to see your profile.");
    return json(me);
  }

  // PUT /api/me  {name, handle, bio, favorites}
  if (parts[0] === "me" && parts.length === 1 && method === "PUT") {
    const me = await authed(); if (!me) return err(401, "Log in to edit your profile.");
    const b = await readBody(req);
    if (typeof b.name === "string") me.name = b.name.trim().slice(0, 40) || me.handle;
    if (typeof b.bio === "string") me.bio = b.bio.trim().slice(0, 280);
    if (Array.isArray(b.favorites)) me.favorites = b.favorites.map(String).slice(0, MAX_FAVORITES);
    if (typeof b.handle === "string" && b.handle !== me.handle) {
      const h = b.handle.toLowerCase().trim();
      if (!HANDLE_RE.test(h)) return err(400, "Usernames use 3–20 letters, numbers or underscores.");
      const { modified } = await store().set(`handles/${h}`, me.uid, { onlyIfNew: true });
      if (!modified) return err(409, `@${h} is taken. Try another username.`);
      await store().delete(`handles/${me.handle}`);
      me.handle = h;
    }
    await saveProfile(me);
    return json(me);
  }

  // POST /api/me/image/avatar|banner  (raw image body, resized client-side)
  if (parts[0] === "me" && parts[1] === "image" && method === "POST") {
    const kind = parts[2];
    if (kind !== "avatar" && kind !== "banner") return err(400, "Unknown image type.");
    const me = await authed(); if (!me) return err(401, "Log in to change your photo.");
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return err(415, "Use a JPG, PNG or WebP image.");
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 3 * 1024 * 1024) return err(413, "That image is over 3 MB.");
    const v = Date.now();
    await store().set(`media/${me.uid}/${kind}`, buf, { metadata: { type } });
    me[kind] = `/api/media/${me.uid}/${kind}?v=${v}`;
    await saveProfile(me);
    return json(me);
  }

  // GET /api/media/:uid/:kind
  if (parts[0] === "media" && parts.length === 3 && method === "GET") {
    const entry = await store().getWithMetadata(`media/${parts[1]}/${parts[2]}`, { type: "arrayBuffer" });
    if (entry === null) return new Response("Not found", { status: 404 });
    return new Response(entry.data as ArrayBuffer, { headers: { "content-type": String(entry.metadata?.type || "image/jpeg"), "cache-control": "public, max-age=31536000, immutable" } });
  }

  // PUT /api/list/:dramaId  {status?, rating?, review?}   status "none" removes from list
  if (parts[0] === "list" && parts.length === 2 && method === "PUT") {
    const me = await authed(); if (!me) return err(401, "Log in to save dramas to your list.");
    const id = parts[1].slice(0, 40);
    const b = await readBody(req);
    const cur: Entry = me.list[id] || { at: Date.now() };
    if (b.status !== undefined) {
      if (b.status === "none") delete cur.status;
      else if (STATUSES.includes(b.status)) cur.status = b.status;
      else return err(400, "Unknown status.");
    }
    if (b.rating !== undefined) {
      const r = Number(b.rating);
      if (r === 0) delete cur.rating;
      else if (r >= 0.5 && r <= 5) cur.rating = Math.round(r * 2) / 2;
      else return err(400, "Ratings go from 0.5 to 5 stars.");
    }
    cur.at = Date.now();
    if (cur.status || cur.rating) me.list[id] = cur; else delete me.list[id];

    // Reviews: one per person per drama, plus a time-ordered feed entry for the home page.
    const rkey = `reviews/${id}/${me.uid}`;
    const old = (await store().get(rkey, { type: "json" })) as any;
    if (typeof b.review === "string" || (old && b.rating !== undefined)) {
      const text = typeof b.review === "string" ? b.review.trim().slice(0, 2000) : old?.text || "";
      if (old?.feedKey) await store().delete(old.feedKey);
      if (text || cur.rating) {
        const feedKey = `feed/${String(9999999999999 - Date.now()).padStart(13, "0")}-${me.uid}`;
        const rev = { uid: me.uid, dramaId: id, rating: cur.rating || null, text, at: Date.now(), feedKey };
        await store().setJSON(rkey, rev);
        if (text) await store().setJSON(feedKey, rev);
      } else await store().delete(rkey);
    }
    await saveProfile(me);
    return json(me);
  }

  // GET /api/reviews/:dramaId
  if (parts[0] === "reviews" && parts.length === 2 && method === "GET") {
    const { blobs } = await store().list({ prefix: `reviews/${parts[1]}/` });
    const revs = await Promise.all(blobs.slice(0, 200).map(async b => {
      const r = (await store().get(b.key, { type: "json" })) as any;
      return r && { ...r, user: card(await loadProfile(r.uid)) };
    }));
    return json(revs.filter((r: any) => r?.user).sort((a: any, b: any) => b.at - a.at));
  }

  // GET /api/feed  latest written reviews across the site
  if (parts[0] === "feed" && method === "GET") {
    const out: any[] = [];
    for await (const page of store().list({ prefix: "feed/", paginate: true })) {
      for (const b of page.blobs) { if (out.length >= 12) break; out.push(b.key); }
      break;
    }
    const revs = await Promise.all(out.sort().map(async k => {
      const r = (await store().get(k, { type: "json" })) as any;
      return r && { ...r, user: card(await loadProfile(r.uid)) };
    }));
    return json(revs.filter((r: any) => r?.user));
  }

  // GET /api/u/:handle  public profile
  if (parts[0] === "u" && parts.length === 2 && method === "GET") {
    const uid = await uidForHandle(parts[1].toLowerCase());
    const p = uid && (await loadProfile(uid));
    if (!p) return err(404, "We couldn't find that profile.");
    const { blobs } = await store().list({ prefix: "reviews/" });
    const mine = blobs.filter(b => b.key.endsWith(`/${p.uid}`)).slice(0, 100);
    const reviews = (await Promise.all(mine.map(b => store().get(b.key, { type: "json" })))).filter(Boolean);
    return json({ ...publicProfile(p), reviews });
  }

  // GET /api/members  everyone, newest first
  if (parts[0] === "members" && method === "GET") {
    const { blobs } = await store().list({ prefix: "profiles/" });
    const ps = (await Promise.all(blobs.slice(0, 300).map(b => store().get(b.key, { type: "json" })))) as Profile[];
    return json(ps.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt).map(p => ({
      ...card(p), bio: p.bio, banner: p.banner || null, favorites: p.favorites,
      finished: Object.values(p.list).filter(e => e.status === "done").length,
      ratings: Object.values(p.list).filter(e => e.rating).length
    })));
  }

  return err(404, "Unknown API route.");
};

export const config: Config = { path: "/api/*" };
