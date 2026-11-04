// Step 2: Instagram sends the user back here with a code. The code is swapped
// for a short lived token and then for a long lived one (60 days), both of
// which need the app secret, which is why this runs on a server and not in the
// app. The result goes to the app over its own scheme; from then on the app
// talks to Instagram itself and refreshes the token without any secret.

import { appRedirect, redirectUri } from "./_config.js";

const fail = (res, message) => res.redirect(302, appRedirect({ error: message }));

export default async function handler(req, res) {
  const { code, state, error, error_description: desc } = req.query;

  if (error) return fail(res, desc || "Доступ не выдан");
  if (!code) return fail(res, "Instagram не вернул код");

  const cookie = (req.headers.cookie || "").match(/ig_state=([^;]+)/)?.[1];
  if (!cookie || cookie !== state) return fail(res, "Сессия входа устарела, попробуй ещё раз");

  const clientId = process.env.IG_CLIENT_ID;
  const clientSecret = process.env.IG_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(res, "Сервер не настроен");

  try {
    // code -> short lived token
    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(req),
      code: String(code),
    });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const short = await shortRes.json();
    if (!shortRes.ok) throw new Error(short?.error_message || "Обмен кода не удался");

    // short lived -> long lived (60 days)
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", clientSecret);
    longUrl.searchParams.set("access_token", short.access_token);
    const longRes = await fetch(longUrl);
    const long = await longRes.json();
    if (!longRes.ok) throw new Error(long?.error?.message || "Не удалось продлить токен");

    res.setHeader("Set-Cookie", "ig_state=; Path=/; Max-Age=0");
    return res.redirect(302, appRedirect({ token: long.access_token, expires: String(long.expires_in) }));
  } catch (e) {
    return fail(res, e.message || "Что-то пошло не так");
  }
}
