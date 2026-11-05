// Разбор скриншота Insights: из распознанного текста достаём те же шесть
// чисел, что человек иначе вводил бы руками.
//
// Работает не с голой строкой, а с координатами: Instagram рисует число и его
// подпись рядом, и только по расположению понятно, что «18 420» относится к
// охвату, а не к подписчикам. Поэтому OCR должен отдавать рамки строк.
//
// Файл ничего не знает про библиотеку распознавания: на вход идёт простая
// структура, и её легко собрать из любой.

import type { Metrics } from "./diagnose";

export type Box = {
  /** 0..1 от ширины и высоты картинки, начало координат слева сверху */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrLine = { text: string; box: Box };

export type Key = keyof Metrics;

export type Read = {
  values: Partial<Record<Key, number>>;
  /** изменение охвата, если Instagram сам показал сравнение с прошлым периодом */
  changePercent?: number;
  /** числа, которые Instagram показал округлённо: «18,4 тыс.» */
  approximate: Key[];
};

/* ------------------------------ числа ------------------------------ */

const MULT: [RegExp, number][] = [
  [/^(тыс|тис|k|к)\.?$/i, 1e3],
  [/^(млн|m|м)\.?$/i, 1e6],
  [/^(млрд|b|b)\.?$/i, 1e9],
];

/**
 * «18 420», «18,420», «18,4 тыс.», «1.2M», «18,4K» -> число.
 * Второе значение говорит, что число округлённое: по нему нельзя считать
 * проценты с точностью до единиц, и мы честно помечаем его в интерфейсе.
 */
export function parseNumber(raw: string): { value: number; approximate: boolean } | null {
  const s = raw.replace(/[    ]/g, " ").trim();
  const m = s.match(/^([+-]?\d[\d  .,]*?)\s*([a-zA-Zа-яА-Я]{1,4}\.?)?$/);
  if (!m) return null;

  const digits = m[1].trim();
  const suffix = m[2];
  const mult = suffix ? MULT.find(([re]) => re.test(suffix))?.[1] : undefined;
  if (suffix && !mult) return null;

  let value: number;
  if (mult) {
    // с суффиксом запятая и точка это дробная часть: «18,4 тыс.»
    const n = Number(digits.replace(/\s/g, "").replace(",", "."));
    if (!isFinite(n)) return null;
    value = n * mult;
  } else {
    // без суффикса пробел и запятая это разделители разрядов, но только
    // когда за ними ровно три цифры: «18,420» это 18420, а «18,4» это 18,4
    const cleaned = digits.replace(/\s/g, "");
    const grouped = /^[+-]?\d{1,3}([.,]\d{3})+$/.test(cleaned);
    const n = grouped ? Number(cleaned.replace(/[.,]/g, "")) : Number(cleaned.replace(",", "."));
    if (!isFinite(n)) return null;
    value = n;
  }
  return { value: Math.round(value), approximate: Boolean(mult) };
}

const isNumberLine = (t: string) => parseNumber(t) !== null;

/* ------------------------------ подписи ------------------------------ */

/** Подписи так, как их пишет Instagram по-русски и по-английски. */
// \w в JavaScript это только латиница, поэтому окончания перечислены явно:
// «Подписчики» не совпадёт с «подписчик\w*», и это стоило бы нам половины чисел
const RU = "[а-яё]*";
const LABELS: [Key, RegExp][] = [
  ["now", new RegExp(`^(охваченны[ей] аккаунт${RU}|охват${RU}|accounts? reached|reach)$`, "i")],
  ["followers", new RegExp(`^(подписчик${RU}|всего подписчиков|followers|total followers)$`, "i")],
  ["posts", new RegExp(`^(публикац${RU}|пост${RU}|posts?)$`, "i")],
  ["reels", new RegExp(`^(reels|рилс${RU})$`, "i")],
  ["likes", new RegExp(`^(лайк${RU}|отметк${RU} «?нравится»?|likes?)$`, "i")],
];

/** «-33% по сравнению с прошлой неделей», «+12% vs previous 7 days» */
const CHANGE = /([+-−–]?\s?\d{1,3})\s?%\s*(по сравнению|vs\.?|versus|меньше|больше|less|more)/i;

const centerX = (b: Box) => b.x + b.width / 2;
const centerY = (b: Box) => b.y + b.height / 2;

/** Колонки должны пересекаться: число под чужой подписью нам не нужно. */
function sameColumn(a: Box, b: Box): boolean {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = right - left;
  return overlap > 0.3 * Math.min(a.width, b.width) || Math.abs(centerX(a) - centerX(b)) < 0.12;
}

/**
 * Ближайшее к подписи число. Instagram ставит его то над подписью, то под
 * ней, поэтому смотрим в обе стороны, но сначала направо по той же строке:
 * так свёрстаны списки.
 */
function numberFor(label: OcrLine, numbers: OcrLine[]): OcrLine | null {
  const sameLine = numbers
    .filter((n) => Math.abs(centerY(n.box) - centerY(label.box)) < label.box.height * 0.8 && n.box.x > label.box.x)
    .sort((a, b) => a.box.x - b.box.x);
  if (sameLine.length) return sameLine[0];

  const near = numbers
    .filter((n) => sameColumn(n.box, label.box))
    .map((n) => ({ n, d: Math.abs(centerY(n.box) - centerY(label.box)) }))
    .filter(({ d }) => d < 0.12)
    .sort((a, b) => a.d - b.d);
  return near.length ? near[0].n : null;
}

/* ------------------------------ разбор ------------------------------ */

export function readInsights(lines: OcrLine[]): Read {
  const clean = lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text.length > 0);

  const numbers = clean.filter((l) => isNumberLine(l.text));
  const values: Partial<Record<Key, number>> = {};
  const approximate: Key[] = [];

  for (const line of clean) {
    const label = LABELS.find(([, re]) => re.test(line.text));
    if (!label) continue;
    const [key] = label;
    if (values[key] !== undefined) continue;
    const hit = numberFor(line, numbers);
    if (!hit) continue;
    const parsed = parseNumber(hit.text);
    if (!parsed || parsed.value < 0) continue;
    values[key] = parsed.value;
    if (parsed.approximate) approximate.push(key);
  }

  // сравнение с прошлым периодом Instagram показывает сам: из него берётся
  // прошлый охват, который иначе пришлось бы искать во втором скриншоте
  let changePercent: number | undefined;
  for (const line of clean) {
    const m = line.text.match(CHANGE);
    if (!m) continue;
    const n = Number(m[1].replace(/[−–]/g, "-").replace(/\s/g, ""));
    if (!isFinite(n) || n === 0) continue;
    changePercent = /меньше|less/i.test(m[2]) && n > 0 ? -n : n;
    break;
  }

  if (values.now !== undefined && changePercent !== undefined && changePercent > -100) {
    values.prev = Math.round(values.now / (1 + changePercent / 100));
  }

  return { values, changePercent, approximate };
}
