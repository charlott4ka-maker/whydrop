// Meta closed "Instagram API with Instagram Login" to new apps, so this is the
// unified login: Facebook Login for Business with a configuration id. The
// configuration, not the request, decides which permissions are asked for and
// which business assets the user hands over, so there is no scope parameter
// here any more.

/** Graph version. Bump deliberately, never silently: field names move. */
export const GRAPH = "https://graph.facebook.com/v23.0";

export const AUTH_DIALOG = "https://www.facebook.com/v23.0/dialog/oauth";

/** Must match a redirect URI registered on the configuration, byte for byte. */
export function redirectUri(req) {
  if (process.env.IG_REDIRECT_URI) return process.env.IG_REDIRECT_URI;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}/api/instagram/callback`;
}

/** Back into the app over its own scheme. */
export function appRedirect(params) {
  const scheme = process.env.APP_SCHEME || "whydrop";
  const q = new URLSearchParams(params).toString();
  return `${scheme}://auth?${q}`;
}
