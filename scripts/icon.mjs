// Generates the app icon with OpenAI's image model.
//
// The key is read from the environment and never printed, never committed and
// never passed as an argument: put it in .env.local at the repo root, which is
// gitignored, as OPENAI_API_KEY=sk-...
//
//   node scripts/icon.mjs                     the default prompt below
//   node scripts/icon.mjs "a red balloon"     your own prompt
//   node scripts/icon.mjs --out splash.png    somewhere other than the default
//
// Output lands in mobile/assets/ as a 1024x1024 PNG.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** .env.local, if it exists, without pulling in a dependency for it. */
function loadEnvFile() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const DEFAULT_PROMPT = `Square app icon, full bleed, no border, no frame, no text.
Soft airbrushed gradient background in green: bright yellow-green at the top
fading to a deeper green at the bottom.
One huge soft billowy cloud rises from the bottom and fills the lower two
thirds, cropped by the left, right and bottom edges so only its top silhouette
shows, as if peeking into frame. The cloud is a soft gradient, almost white at
its centre fading to pale mint green at its edges, gentle blurred shading, no
outline, no plastic gloss.
On the cloud, left of centre, two large eyes: each is a solid black oval inside
a thick opaque white rounded lozenge, both lozenges tilted at the same diagonal
angle like a pair of sunglasses lenses, the black ovals pushed toward the outer
edge so the character glances sideways.
Crisp graphic eyes against the soft cloud. Clean, minimal, high resolution.`;

async function main() {
  loadEnvFile();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("Нет OPENAI_API_KEY.\nПоложи его в .env.local в корне репозитория одной строкой:\n\n  OPENAI_API_KEY=sk-...\n\nФайл в .gitignore, в репозиторий не попадёт.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const outFlag = args.indexOf("--out");
  const outName = outFlag >= 0 ? args[outFlag + 1] : "icon.png";
  const prompt = args.filter((a, i) => a !== "--out" && i !== outFlag + 1).join(" ") || DEFAULT_PROMPT;

  console.log("Генерирую " + outName + "...");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // the message can quote the request, so print only what OpenAI says is wrong
    console.error("OpenAI ответил " + res.status + ": " + (body?.error?.message || "без подробностей"));
    process.exit(1);
  }

  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) {
    console.error("В ответе нет картинки.");
    process.exit(1);
  }

  const out = path.join(ROOT, "mobile", "assets", outName);
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  console.log("Готово: mobile/assets/" + outName);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
