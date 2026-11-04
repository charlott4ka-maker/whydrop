// TEMPORARY. Unified login is documented in pieces, so rather than guess which
// call returns the Instagram account id, this walks the candidates with a real
// token and reports what came back. Delete it once the client code is written.
//
// It never returns strings from the API: every string becomes "str", so the
// output shows field names and shapes but no account data and no token. Runs
// only while IG_TEST_TOKEN is set; unset the variable to turn it off.

import { GRAPH } from "./_config.js";

/** Values collapse to their type; numbers and booleans are kept, they are the
 *  ones worth seeing (counts, flags) and none of them identify anybody. */
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

async function probe(label, path, token) {
  const url = path.includes("?") ? `${GRAPH}${path}&access_token=${token}` : `${GRAPH}${path}?access_token=${token}`;
  try {
    const r = await fetch(url);
    const body = await r.json().catch(() => null);
    return { label, path, status: r.status, body: shape(body) };
  } catch (e) {
    return { label, path, status: "fetch failed", error: e.message };
  }
}

export default async function handler(req, res) {
  const token = process.env.IG_TEST_TOKEN;
  if (!token) return res.status(404).send("Not found");

  const day = 24 * 3600;
  const until = Math.floor(Date.now() / 1000);
  const since = until - 7 * day;

  const steps = [
    ["me", "/me?fields=id,name"],
    ["pages", "/me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url,followers_count}"],
    ["businesses", "/me/businesses?fields=id,name"],
    ["granted", "/me/permissions"],
  ];
  const out = [];
  for (const [label, path] of steps) out.push(await probe(label, path, token));

  // If a page carried an Instagram account, try what the diagnosis needs.
  let igId = null;
  try {
    const r = await fetch(`${GRAPH}/me/accounts?fields=instagram_business_account{id}&access_token=${token}`);
    const body = await r.json();
    igId = body?.data?.find((p) => p.instagram_business_account)?.instagram_business_account?.id ?? null;
  } catch {}

  if (igId) {
    out.push(await probe("ig profile", `/${igId}?fields=id,username,profile_picture_url,followers_count`, token));
    out.push(await probe("ig reach", `/${igId}/insights?metric=reach&period=day&since=${since}&until=${until}`, token));
    out.push(await probe("ig media", `/${igId}/media?fields=media_product_type,like_count,timestamp&limit=5`, token));
  }

  res.status(200).json({ foundInstagramAccount: Boolean(igId), steps: out });
}
