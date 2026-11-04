// TEMPORARY. Unified login is documented in pieces, so rather than guess which
// call reaches the Instagram account, this walks the candidates with a real
// token and reports what came back. Delete it once the client code is written.
//
// It returns no free-form strings from the API: names, usernames and the token
// never appear. Permission names and object ids do, because they come from our
// own configuration and are what the client code has to be written against.
// Runs only while IG_TEST_TOKEN is set; unset the variable to turn it off.

import { GRAPH } from "./_config.js";

function shape(v, depth = 0) {
  if (v === null) return null;
  if (Array.isArray(v)) return depth > 4 ? "[...]" : { array: v.length, of: v.length ? shape(v[0], depth + 1) : null };
  if (typeof v === "object") {
    if (depth > 4) return "{...}";
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, shape(val, depth + 1)]));
  }
  if (typeof v === "string") return "str";
  return v;
}

async function get(url) {
  try {
    const r = await fetch(url);
    const body = await r.json().catch(() => null);
    return { status: r.status, body };
  } catch (e) {
    return { status: "fetch failed", body: { message: e.message } };
  }
}

const probe = async (label, path, token) => {
  const sep = path.includes("?") ? "&" : "?";
  const { status, body } = await get(`${GRAPH}${path}${sep}access_token=${token}`);
  // Meta's own error text says what is wrong and carries no account data
  if (body?.error) return { label, path, status, error: body.error.message, code: body.error.code };
  return { label, path, status, body: shape(body) };
};

export default async function handler(req, res) {
  const token = process.env.IG_TEST_TOKEN;
  const clientId = process.env.IG_CLIENT_ID;
  const clientSecret = process.env.IG_CLIENT_SECRET;
  if (!token) return res.status(404).send("Not found");

  const out = [];

  // What is this token, and which objects did the user actually grant? The
  // granular scopes carry the target ids, which is the thing we are missing.
  let targets = [];
  let tokenInfo = null;
  if (clientId && clientSecret) {
    const appToken = `${clientId}|${clientSecret}`;
    const { status, body } = await get(`${GRAPH}/debug_token?input_token=${token}&access_token=${appToken}`);
    const d = body?.data;
    tokenInfo = {
      status,
      type: d?.type ?? null,
      isValid: d?.is_valid ?? null,
      expiresAt: d?.expires_at ?? null,
      scopes: d?.scopes ?? null,
      granular: (d?.granular_scopes ?? []).map((g) => ({ scope: g.scope, targets: g.target_ids ?? [] })),
      error: body?.error ? { message: body.error.message, code: body.error.code, sub: body.error.error_subcode } : undefined,
    };
    targets = [...new Set(tokenInfo.granular.flatMap((g) => g.targets))];
  } else {
    tokenInfo = { error: "IG_CLIENT_ID or IG_CLIENT_SECRET missing, cannot debug the token" };
  }

  // Enough of each value to spot the usual mistakes (stray whitespace, a token
  // pasted where a secret belongs) without printing the values themselves.
  const look = (v) =>
    v == null
      ? null
      : {
          length: v.length,
          head: v.slice(0, 4),
          tail: v.slice(-4),
          trimmedDiffers: v !== v.trim(),
          allDigits: /^[0-9]+$/.test(v),
          looksLikeToken: v.startsWith("EAA"),
        };
  const envLook = {
    IG_CLIENT_ID: look(process.env.IG_CLIENT_ID),
    IG_CONFIG_ID: look(process.env.IG_CONFIG_ID),
    IG_CLIENT_SECRET: look(process.env.IG_CLIENT_SECRET),
    IG_TEST_TOKEN: look(process.env.IG_TEST_TOKEN),
  };

  // Is the app secret right? Ask for a token with a code that cannot be valid:
  // a wrong secret complains about the secret, a right one about the code. The
  // two messages are different, which is the whole point of asking.
  let secretCheck = { note: "IG_CLIENT_ID or IG_CLIENT_SECRET missing" };
  if (clientId && clientSecret) {
    const u = new URL(`${GRAPH}/oauth/access_token`);
    u.searchParams.set("client_id", clientId.trim());
    u.searchParams.set("client_secret", clientSecret.trim());
    u.searchParams.set("redirect_uri", `https://${req.headers["x-forwarded-host"] || req.headers.host}/api/instagram/callback`);
    u.searchParams.set("code", "deliberately-invalid");
    const { status, body } = await get(u.toString());
    secretCheck = {
      status,
      message: body?.error?.message ?? null,
      code: body?.error?.code ?? null,
      // Meta blames the code, not the secret: the secret is accepted
      secretLooksRight: /verification code|authorization code/i.test(body?.error?.message || ""),
    };
  }

  // Which permissions are actually granted, by name.
  const perms = await get(`${GRAPH}/me/permissions?access_token=${token}`);
  out.push({
    label: "permissions",
    status: perms.status,
    granted: (perms.body?.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission),
    declined: (perms.body?.data ?? []).filter((p) => p.status !== "granted").map((p) => p.permission),
  });

  out.push(await probe("me metadata", "/me?metadata=1", token));
  out.push(await probe("owned ig", "/me/owned_instagram_accounts", token));
  out.push(await probe("assigned ig", "/me/assigned_instagram_accounts", token));

  // Every object the token was granted: what is it, and does it behave like an
  // Instagram account (profile, insights, media)?
  const day = 24 * 3600;
  const until = Math.floor(Date.now() / 1000);
  const since = until - 7 * day;

  const assigned = await get(`${GRAPH}/me/assigned_instagram_accounts?access_token=${token}`);
  const igIds = (assigned.body?.data ?? []).map((a) => a.id);

  for (const id of [...new Set([...igIds, ...targets])].slice(0, 3)) {
    out.push(await probe(`target ${id}`, `/${id}?fields=id,username,followers_count,media_count`, token));
    out.push(await probe(`target ${id} reach`, `/${id}/insights?metric=reach&period=day&since=${since}&until=${until}`, token));
    out.push(await probe(`${id} reach total`, `/${id}/insights?metric=reach&period=day&metric_type=total_value&since=${since}&until=${until}`, token));
    out.push(await probe(`${id} views`, `/${id}/insights?metric=views&period=day&since=${since}&until=${until}`, token));
    out.push(await probe(`${id} media`, `/${id}/media?fields=media_product_type,like_count,timestamp&limit=3`, token));
  }

  res.status(200).json({ envLook, secretCheck, tokenInfo, targets, instagramAccounts: igIds.length, steps: out });
}
