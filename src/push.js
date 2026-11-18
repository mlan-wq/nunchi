// Home-screen notifications: service worker, permission prompt, app-icon badge and badge checks.
import { S, api, ls, toast } from "./core.js";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
// On iPhone, notifications only work once Nunchi is added to the home screen and opened from there.
export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

let reg = null;
export async function registerSW(){
  if (!("serviceWorker" in navigator)) return null;
  try { reg = await navigator.serviceWorker.register("/sw.js"); } catch { reg = null; }
  return reg;
}

function b64ToBytes(s){ const p = "=".repeat((4 - s.length % 4) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, c => c.charCodeAt(0)); }

// Which prompt (if any) to show: "ask" (can turn on), "install" (iPhone in Safari: add to home screen first), or null.
export function pushPromptState(){
  if (!S.me) return null;
  if (pushSupported()) return Notification.permission === "default" ? "ask" : null;
  return isIOS() && !standalone() ? "install" : null;
}

export async function enablePush(){
  if (!pushSupported()) return false;
  const perm = await Notification.requestPermission();
  ls.set("nunchi:pushAsked", 1);
  if (perm !== "granted") { toast("Notifications are off. You can turn them on later in your phone settings."); return false; }
  await syncPush(true);
  toast("Notifications on 🔔");
  return true;
}

// Make sure the server has this device's subscription (keys can change after an update).
export async function syncPush(force){
  if (!S.me || !pushSupported() || Notification.permission !== "granted") return;
  try {
    const r = reg || await navigator.serviceWorker.ready;
    let sub = await r.pushManager.getSubscription();
    if (!sub) { const { key } = await api("push/key"); sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }); }
    const id = sub.endpoint.slice(-24);
    if (force || ls.get("nunchi:pushSub") !== `${S.me.uid}:${id}`) { await api("push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) }); ls.set("nunchi:pushSub", `${S.me.uid}:${id}`); }
  } catch (e) { console.warn("push sync failed", e); }
}

export async function disablePushForThisDevice(){
  try { const r = reg || await navigator.serviceWorker.ready; const sub = await r.pushManager.getSubscription();
    if (sub) { await api("push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(()=>{}); await sub.unsubscribe(); }
    ls.set("nunchi:pushSub", ""); } catch {}
}

// Unread count on the home-screen icon.
export function setAppBadge(n){
  try { if (!("setAppBadge" in navigator)) return; (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(()=>{}); } catch {}
}

// Tell the server which badges this person has; it announces the new ones.
let badgeTimer = null;
export function scheduleBadgeCheck(badgesFor){
  if (!S.me) return;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(async () => {
    try {
      const p = await api(`u/${encodeURIComponent(S.me.handle)}`);
      const earned = badgesFor({ ...p, followingCount: p.following }, p.reviews.length).filter(b => b.got).map(b => b.key);
      const { fresh } = await api("me/badges", { method: "POST", body: JSON.stringify({ earned }) });
      if (fresh?.length) { S.me.unread = (S.me.unread || 0) + fresh.length; document.dispatchEvent(new Event("nunchi:me")); toast(`🏅 New badge: ${badgesFor(p, 0).find(b => b.key === fresh[0])?.name || "earned"}!`); }
    } catch {}
  }, 1500);
}
