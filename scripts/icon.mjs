// Generates the app icon with OpenAI's image model.
//
// The key is read from the environment and never printed, never committed and
// never passed as an argument: put it in .env.local at the repo root, which is
// gitignored, as OPENAI_API_KEY=sk-...
//
//   node scripts/icon.mjs                     the default prompt below
//   node scripts/icon.mjs "a red balloon"     your own prompt
//   node scripts/icon.mjs --out splash.png    somewhere other than the default
//   node scripts/icon.mjs --quality high      low by default, cheap for picking
//   node scripts/icon.mjs --model <id>        the account decides what exists
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

const DEFAULT_PROMPT = `Square app icon, full bleed, no border, no frame, no text, no outline.
Background: a smooth saturated diagonal gradient, deep near-black at the
bottom right lifting to a rich lime green at the top left, soft and airbrushed.
Centred on it, one single bold silhouette of a chubby rounded cloud, filling
most of the square, filled with one flat solid bright lime green #C8FF4A, no
internal shading, no gloss, no highlights, no texture, just a clean solid
shape. A soft diffuse glow bleeds from the silhouette into the background.
On the cloud, two simple eyes and nothing else: two plain dark oval eyes,
evenly spaced, calm. No mouth, no eyebrows, no nose, no other detail.
Minimal, graphic, soft and atmospheric, high resolution.`;

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
  const qFlag = args.indexOf("--quality");
  // low is a fraction of the price and plenty for choosing a direction;
  // regenerate the chosen one at high once it is settled
  const quality = qFlag >= 0 ? args[qFlag + 1] : "low";
  const mFlag = args.indexOf("--model");
  // the image models get replaced often and old ids stop being accepted even
  // while they still show up in /v1/models, so this is worth being a flag
  const model = mFlag >= 0 ? args[mFlag + 1] : "gpt-image-2.5-flare";
  // a reference image goes to a different endpoint: describing a look in words
  // only gets so close, showing it gets much closer. --ref can repeat, e.g. one
  // image for the character and another for the treatment around it
  const refs = [];
  const refIdx = [];
  args.forEach((a, i) => {
    if (a === "--ref") {
      refs.push(args[i + 1]);
      refIdx.push(i, i + 1);
    }
  });
  const ref = refs[0] ?? null;
  const rFlag = -1;
  const nFlag = args.indexOf("--n");
  const n = nFlag >= 0 ? Number(args[nFlag + 1]) : 1;
  const skip = new Set(
    [outFlag, outFlag + 1, qFlag, qFlag + 1, mFlag, mFlag + 1, nFlag, nFlag + 1, ...refIdx].filter((i) => i >= 0),
  );
  const prompt = args.filter((_, i) => !skip.has(i)).join(" ") || DEFAULT_PROMPT;

  console.log(`Генерирую ${n} шт. (${model}, качество: ${quality}${ref ? ", реф: " + ref : ""})...`);

  let res;
  if (ref) {
    const files = refs.map((r) => (path.isAbsolute(r) ? r : path.join(ROOT, r)));
    for (const f of files) {
      if (!fs.existsSync(f)) {
        console.error("Нет такого файла: " + f);
        process.exit(1);
      }
    }
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("quality", quality);
    form.append("n", String(n));
    // one reference goes as "image", several as "image[]"
    const field = files.length > 1 ? "image[]" : "image";
    for (const f of files) {
      form.append(field, new Blob([fs.readFileSync(f)], { type: "image/png" }), path.basename(f));
    }
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, size: "1024x1024", quality, n }),
    });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // the message can quote the request, so print only what OpenAI says is wrong
    console.error("OpenAI ответил " + res.status + ": " + (body?.error?.message || "без подробностей"));
    process.exit(1);
  }

  const images = body?.data ?? [];
  if (!images.length) {
    console.error("В ответе нет картинок.");
    process.exit(1);
  }

  if (images.length > 1) {
    const stem = outName.replace(/\.png$/i, "");
    images.forEach((img, i) => {
      const p = path.join(ROOT, "mobile", "assets", `${stem}-${i + 1}.png`);
      fs.writeFileSync(p, Buffer.from(img.b64_json, "base64"));
    });
    console.log(`Готово: mobile/assets/${stem}-1..${images.length}.png`);
    return;
  }

  const b64 = images[0].b64_json;
  const out = path.join(ROOT, "mobile", "assets", outName);
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  console.log("Готово: mobile/assets/" + outName);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
