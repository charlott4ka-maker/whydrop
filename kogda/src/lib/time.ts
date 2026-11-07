// Сколько прошло. Считаем по календарным дням, а не по суткам: если отметили
// вчера вечером, а смотрим утром, должно быть «вчера», а не «сегодня».

const DAY = 24 * 3600 * 1000;

const midnight = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.round((midnight(now) - midnight(new Date(iso))) / DAY));
}

const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

export const daysWord = (n: number) => plural(n, "день", "дня", "дней");
export const monthsWord = (n: number) => plural(n, "месяц", "месяца", "месяцев");
export const timesWord = (n: number) => plural(n, "раз", "раза", "раз");
export const marksWord = (n: number) => plural(n, "отметка", "отметки", "отметок");

/**
 * Крупная цифра на карточке и слово под ней. Сама цифра всегда в днях: в этом
 * вся соль приложения, «228» бьёт сильнее, чем «7 месяцев».
 */
export function ago(days: number | null): { value: string; unit: string } {
  if (days === null) return { value: "—", unit: "ещё ни разу" };
  if (days === 0) return { value: "0", unit: "сегодня" };
  return { value: String(days), unit: daysWord(days) + " назад" };
}

/** Подпись помельче, чтобы большие числа читались: «это 7 месяцев». */
export function rough(days: number | null): string | null {
  if (days === null || days < 60) return null;
  const years = Math.floor(days / 365);
  if (years >= 1) {
    const rest = Math.round((days - years * 365) / 30);
    const y = plural(years, "год", "года", "лет");
    return rest > 0 ? `это ${years} ${y} и ${rest} ${monthsWord(rest)}` : `это ${years} ${y}`;
  }
  const months = Math.round(days / 30);
  return `это ${months} ${monthsWord(months)}`;
}

/** «раз в 34 дня», «раз в месяц», «раз в год» — для подсмотренной привычки. */
export function everyLabel(days: number): string {
  if (days >= 330 && days <= 400) return "раз в год";
  if (days >= 170 && days <= 200) return "раз в полгода";
  if (days >= 85 && days <= 95) return "раз в 3 месяца";
  if (days >= 28 && days <= 32) return "раз в месяц";
  if (days === 7) return "раз в неделю";
  if (days === 14) return "раз в 2 недели";
  return `раз в ${days} ${daysWord(days)}`;
}

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

/** «4 ноября», с годом, если это был не этот год. */
export function dateLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
