// Step 1 of the OAuth dance: send the user to Meta.
//
// The app opens this URL rather than Meta's directly, so the client id, the
// configuration id and the exact redirect_uri live in one place (Meta matches
// the redirect byte for byte). A random state goes out in a cookie and is
// checked on the way back.

import { randomBytes } from "node:crypto";

import { AUTH_DIALOG, redirectUri } from "./_config.js";

export default function handler(req, res) {
  const clientId = process.env.IG_CLIENT_ID;
  const configId = process.env.IG_CONFIG_ID;
  if (!clientId) return res.status(500).send("IG_CLIENT_ID is not set");
  if (!configId) return res.status(500).send("IG_CONFIG_ID is not set");

  const state = randomBytes(16).toString("hex");
  const url = new URL(AUTH_DIALOG);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("config_id", configId);
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("state", state);
  // a configuration defaults to returning a token to the browser; we want the
  // code, so it can be swapped for a token server side where the secret is
  url.searchParams.set("response_type", "code");
  url.searchParams.set("override_default_response_type", "true");

  // SameSite=Lax so it survives Meta's redirect back to us
  res.setHeader("Set-Cookie", `ig_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  res.redirect(302, url.toString());
}
