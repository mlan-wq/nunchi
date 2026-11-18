// Keeps people logged in until they press "Log out".
// Netlify Identity stores the session in localStorage ("gotrue.user") but mirrors it into
// browser-session cookies, and it drops the session whenever those cookies are gone
// (closing Safari or the home-screen app clears them). Here we make the cookies last a year
// and put them back from the saved session before Identity looks for them.
const KEY = "gotrue.user", YEAR = 60 * 60 * 24 * 365;
const AUTH_COOKIE = /^\s*nf_(jwt|refresh)=[^;]+/;

try {
  const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() { return desc.get.call(document); },
    set(v) {
      if (AUTH_COOKIE.test(v) && !/expires=|max-age=/i.test(v)) v += `; max-age=${YEAR}`;
      desc.set.call(document, v);
    }
  });
} catch {}

const hasCookie = name => new RegExp(`(?:^|;\\s*)${name}=`).test(document.cookie);
export function restoreSessionCookies() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || "null")?.token;
    if (!t?.access_token) return false;
    const opts = "; path=/; secure; samesite=lax";
    if (!hasCookie("nf_jwt")) document.cookie = `nf_jwt=${encodeURIComponent(t.access_token)}${opts}`;
    if (t.refresh_token && !hasCookie("nf_refresh")) document.cookie = `nf_refresh=${encodeURIComponent(t.refresh_token)}${opts}`;
    return true;
  } catch { return false; }
}
export const hasSavedSession = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
