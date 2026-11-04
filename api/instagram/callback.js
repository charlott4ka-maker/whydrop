// Step 2: Meta sends the user back here with a code. The code is swapped for a
// token, which needs the app secret, which is why this runs on a server and
// not in the app. The result goes to the app over its own scheme; from then on
// the app talks to the Graph API itself.

import { GRAPH, appRedirect, redirectUri } from "./_config.js";

const fail = (res, message) => res.redirect(302, appRedirect({ error: message }));

async function getJson(url) {
  const r = await fetch(url);
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.error?.message || `Meta ответила ${r.status}`);
  return body;
}

export default async function handler(req, res) {
  const { code, state, error, error_description: desc } = req.query;

  if (error) return fail(res, desc || "Доступ не выдан");
  if (!code) return fail(res, "Meta не вернула код");

  const cookie = (req.headers.cookie || "").match(/ig_state=([^;]+)/)?.[1];
  if (!cookie || cookie !== state) return fail(res, "Сессия входа устарела, попробуй ещё раз");

  const clientId = process.env.IG_CLIENT_ID;
  const clientSecret = process.env.IG_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(res, "Сервер не настроен");

  try {
    const exchange = new URL(`${GRAPH}/oauth/access_token`);
    exchange.searchParams.set("client_id", clientId);
    exchange.searchParams.set("client_secret", clientSecret);
    exchange.searchParams.set("redirect_uri", redirectUri(req));
    exchange.searchParams.set("code", String(code));
    const token = await getJson(exchange);

    // A system user token from a business configuration never expires and
    // cannot be extended; a plain user token lasts an hour, so trade it for the
    // 60 day one. expires_in missing or 0 means the first case.
    let accessToken = token.access_token;
    let expiresIn = Number(token.expires_in || 0);
    if (expiresIn > 0) {
      try {
        const long = new URL(`${GRAPH}/oauth/access_token`);
        long.searchParams.set("grant_type", "fb_exchange_token");
        long.searchParams.set("client_id", clientId);
        long.searchParams.set("client_secret", clientSecret);
        long.searchParams.set("fb_exchange_token", accessToken);
        const extended = await getJson(long);
        accessToken = extended.access_token;
        expiresIn = Number(extended.expires_in || 0);
      } catch {
        // keep the short lived token: better a session that works for an hour
        // than an error the user can do nothing about
      }
    }

    res.setHeader("Set-Cookie", "ig_state=; Path=/; Max-Age=0");
    return res.redirect(302, appRedirect({ token: accessToken, expires: String(expiresIn) }));
  } catch (e) {
    return fail(res, e.message || "Что-то пошло не так");
  }
}
