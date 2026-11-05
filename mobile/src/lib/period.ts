// Формулировки периода в одном месте: подписи формы, строка «что с чем
// сравнивали» в результате и подпись в истории должны совпадать слово в слово.

import type { Metrics } from "./diagnose";
import type { Period } from "./prefs";

export const PERIODS: [Period, string][] = [
  ["7", "Неделя"],
  ["14", "2 недели"],
  ["30", "Месяц"],
];

export const WORDS: Record<Period, { now: string; prev: string; short: string }> = {
  "7": { now: "эту неделю", prev: "прошлую неделю", short: "неделя" },
  "14": { now: "2 недели", prev: "прошлые 2 недели", short: "2 недели" },
  "30": { now: "месяц", prev: "прошлый месяц", short: "месяц" },
};

export type Key = keyof Metrics;

export function rows(period: Period): { key: Key; label: string; hint?: string }[] {
  const w = WORDS[period];
  return [
    { key: "now", label: "Охват за " + w.now },
    { key: "prev", label: "Охват за " + w.prev },
    { key: "posts", label: "Постов за " + w.now },
    { key: "reels", label: "Из них Reels", hint: "Не больше, чем постов" },
    { key: "likes", label: "Лайков за пост", hint: "В среднем, не всего" },
    { key: "followers", label: "Подписчиков" },
  ];
}

/** «неделя против прошлой недели» — под большой цифрой в результате. */
export const compared = (period: Period) => WORDS[period].short + " против прошлой";
