// Сколько прошло. Считаем по календарным дням, а не по суткам: если отметили
// вчера вечером, а смотрим утром, должно быть «вчера», а не «сегодня».

const DAY = 24 * 3600 * 1000;

const midnight = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export function daysSince(iso: string, now: Date = new Date()): number {
  const diff = midnight(now) - midnight(new Date(iso));
  return Math.max(0, Math.round(diff / DAY));
}

/** день / дня / дней */
export function daysWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b > 1 && b < 5) return "дня";
  if (b === 1) return "день";
  return "дней";
}

export function monthsWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "месяцев";
  if (b > 1 && b < 5) return "месяца";
  if (b === 1) return "месяц";
  return "месяцев";
}

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
    const y = years === 1 ? "год" : years < 5 ? "года" : "лет";
    return rest > 0 ? `это ${years} ${y} и ${rest} ${monthsWord(rest)}` : `это ${years} ${y}`;
  }
  const months = Math.round(days / 30);
  return `это ${months} ${monthsWord(months)}`;
}
