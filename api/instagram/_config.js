/** Insights need the manage_insights scope; basic covers the username, the
 *  picture, the follower count and the media list. */
export const SCOPES = "instagram_business_basic,instagram_business_manage_insights";

/** Must match the redirect URI saved in the Meta app byte for byte. */
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
