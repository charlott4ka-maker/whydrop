// Step 1 of the OAuth dance: send the user to Instagram.
//
// The app opens this URL rather than Instagram's directly, so the client id and
// the exact redirect_uri live in one place (Meta matches the redirect byte for
// byte). A random state goes out in a cookie and is checked on the way back.

import { randomBytes } from "node:crypto";

import { redirectUri, SCOPES } from "./_config.js";

export default function handler(req, res) {
  const clientId = process.env.IG_CLIENT_ID;
  if (!clientId) return res.status(500).send("IG_CLIENT_ID is not set");

  const state = randomBytes(16).toString("hex");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  // SameSite=Lax so it survives Instagram's redirect back to us
  res.setHeader("Set-Cookie", `ig_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  res.redirect(302, url.toString());
}
