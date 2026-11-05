// Серия и ачивки считаются из истории, ничего отдельно не хранится: так они не
// разъедутся с тем, что человек реально делал, и переживут любую чистку.

import type { Entry } from "./history";

const WEEK = 7 * 24 * 3600 * 1000;

/** Понедельник недели, в которую попала дата, в полночь. */
function weekStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const shift = (x.getDay() + 6) % 7; // понедельник = 0
  x.setDate(x.getDate() - shift);
  return x.getTime();
}

export type Streak = {
  /** недель подряд с разбором, включая текущую */
  current: number;
  /** самая длинная серия за всю историю */
  best: number;
  /** разбор на этой неделе уже есть */
  doneThisWeek: boolean;
  /** всего разборов */
  total: number;
};

export function streak(items: Entry[], now = new Date()): Streak {
  const weeks = new Set(items.map((e) => weekStart(new Date(e.at))));
  const thisWeek = weekStart(now);
  const doneThisWeek = weeks.has(thisWeek);

  // серия не рвётся, пока идёт текущая неделя: считаем от последней недели с
  // разбором, если она эта или прошлая
  let start = doneThisWeek ? thisWeek : weeks.has(thisWeek - WEEK) ? thisWeek - WEEK : null;
  let current = 0;
  while (start !== null && weeks.has(start)) {
    current++;
    start -= WEEK;
  }

  const sorted = [...weeks].sort((a, b) => a - b);
  let best = 0, run = 0, prev: number | null = null;
  for (const w of sorted) {
    run = prev !== null && w - prev === WEEK ? run + 1 : 1;
    prev = w;
    if (run > best) best = run;
  }

  return { current, best, doneThisWeek, total: items.length };
}

export type Achievement = {
  id: string;
  title: string;
  sub: string;
  done: boolean;
  /** «3 из 4», когда до цели можно дойти по шагам */
  progress?: [number, number];
};

export function achievements(items: Entry[], s: Streak): Achievement[] {
  const byTime = [...items].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  // был разбор без Reels, а в следующем Reels уже есть
  let fixedReels = false;
  for (let i = 1; i < byTime.length; i++) {
    if (byTime[i - 1].metrics.reels === 0 && byTime[i].metrics.reels > 0) fixedReels = true;
  }
  // то же про частоту: мало публикаций, а дальше стало больше
  let postedMore = false;
  for (let i = 1; i < byTime.length; i++) {
    if (byTime[i - 1].metrics.posts <= 2 && byTime[i].metrics.posts >= 3) postedMore = true;
  }

  return [
    { id: "first", title: "Первый разбор", sub: "Разобрал охват хотя бы раз", done: items.length > 0 },
    { id: "connected", title: "На автомате", sub: "Подтянул цифры из Instagram", done: items.some((e) => e.source === "instagram") },
    { id: "two", title: "Неделя за неделей", sub: "Две недели подряд", done: s.best >= 2, progress: [Math.min(s.best, 2), 2] },
    { id: "four", title: "Месяц подряд", sub: "Четыре недели подряд", done: s.best >= 4, progress: [Math.min(s.best, 4), 4] },
    { id: "reels", title: "Выпустил Reels", sub: "После разбора «Нет Reels» выпустил их", done: fixedReels },
    { id: "posts", title: "Стал чаще", sub: "После разбора «Мало публикаций» стал публиковать чаще", done: postedMore },
    { id: "growth", title: "Охват вырос", sub: "Разбор с ростом больше 5%", done: items.some((e) => e.change > 5) },
    { id: "ten", title: "Десять разборов", sub: "Накопил десять разборов", done: items.length >= 10, progress: [Math.min(items.length, 10), 10] },
  ];
}

export const weeksWord = (n: number) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return "недель";
  if (b > 1 && b < 5) return "недели";
  if (b === 1) return "неделя";
  return "недель";
};
