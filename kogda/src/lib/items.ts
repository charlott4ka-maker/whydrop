// То, что делаешь нерегулярно, и когда это было. Каждая отметка остаётся в
// истории: по ней видно, как часто ты это делаешь на самом деле, и приложение
// перестаёт спрашивать срок, который человек всё равно не знает.
//
// Всё лежит на устройстве: ни сервера, ни входа, ни чужих API.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { daysSince } from "./time";

export type CategoryId = "home" | "body" | "beauty" | "stuff" | "people" | "other";

export const CATEGORIES: { id: CategoryId; title: string }[] = [
  { id: "home", title: "Дом" },
  { id: "body", title: "Здоровье" },
  { id: "beauty", title: "Красота" },
  { id: "stuff", title: "Вещи" },
  { id: "people", title: "Люди" },
  { id: "other", title: "Разное" },
];

export type Item = {
  id: string;
  title: string;
  category: CategoryId;
  /** срок, заданный руками; пусто — приложение смотрит на привычку */
  everyDays?: number;
  /** отметки, новые первыми, ISO */
  marks: string[];
  createdAt: string;
};

/** ok — ещё рано, soon — вот-вот, due — пора, none — срока нет и привычки тоже */
export type Status = "none" | "ok" | "soon" | "due";

const KEY = "items";

export const lastMark = (i: Item): string | null => i.marks[0] ?? null;
export const daysOf = (i: Item, now?: Date): number | null =>
  i.marks[0] ? daysSince(i.marks[0], now) : null;

/**
 * Как часто человек делает это на самом деле: медиана промежутков между
 * отметками. Медиана, а не среднее, потому что один пропущенный год не должен
 * перечёркивать всю картину. Нужно хотя бы три отметки, иначе это не привычка,
 * а совпадение.
 */
export function typicalInterval(i: Item): number | null {
  if (i.marks.length < 3) return null;
  const times = i.marks.map((m) => new Date(m).getTime()).sort((a, b) => b - a);
  const gaps: number[] = [];
  for (let k = 1; k < times.length; k++) gaps.push(Math.round((times[k - 1] - times[k]) / 864e5));
  const clean = gaps.filter((g) => g > 0);
  if (clean.length < 2) return null;
  clean.sort((a, b) => a - b);
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : Math.round((clean[mid - 1] + clean[mid]) / 2);
}

/** Срок, по которому судим: заданный руками важнее подсмотренного. */
export const expected = (i: Item): number | null => i.everyDays ?? typicalInterval(i);

export function status(i: Item, now?: Date): Status {
  const every = expected(i);
  if (!every) return "none";
  const d = daysOf(i, now);
  if (d === null) return "due";
  if (d >= every) return "due";
  if (d >= every * 0.8) return "soon";
  return "ok";
}

/**
 * Сверху то, что просрочено сильнее всего, дальше просто давнее.
 * «Ещё ни разу» считаем бесконечно давним: это незакрытый вопрос.
 */
export function sortItems(items: Item[], now?: Date): Item[] {
  const days = (i: Item) => daysOf(i, now) ?? Infinity;
  const over = (i: Item) => {
    const e = expected(i);
    return e ? days(i) / e : 0;
  };
  return [...items].sort((a, b) => {
    const oa = over(a) >= 1 ? over(a) : 0;
    const ob = over(b) >= 1 ? over(b) : 0;
    if (oa !== ob) return ob - oa;
    return days(b) - days(a);
  });
}

export const dueCount = (items: Item[], now?: Date) =>
  items.filter((i) => status(i, now) === "due").length;

/* ------------------------------ хранилище ------------------------------ */

type Legacy = Item & { lastAt?: string | null };

/** Первая версия хранила одну дату вместо истории. */
function migrate(raw: Legacy[]): Item[] {
  return raw.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category ?? "other",
    everyDays: i.everyDays,
    marks: i.marks ?? (i.lastAt ? [i.lastAt] : []),
    createdAt: i.createdAt ?? new Date().toISOString(),
  }));
}

export async function readItems(): Promise<Item[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw) as Legacy[]) : [];
  } catch {
    return [];
  }
}

async function write(items: Item[]): Promise<Item[]> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  return items;
}

const newId = () => String(Date.now()) + Math.random().toString(36).slice(2, 6);

export async function addItem(
  title: string,
  opts: { category?: CategoryId; everyDays?: number; marks?: string[] } = {},
): Promise<Item[]> {
  const item: Item = {
    id: newId(),
    title: title.trim(),
    category: opts.category ?? "other",
    everyDays: opts.everyDays,
    marks: opts.marks ?? [],
    createdAt: new Date().toISOString(),
  };
  return write([item, ...(await readItems())]);
}

export async function updateItem(id: string, patch: Partial<Omit<Item, "id">>): Promise<Item[]> {
  const items = await readItems();
  return write(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

/** ISO для отметки задним числом: «три дня назад». */
export const daysAgoIso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 864e5).toISOString();

/**
 * Отметить. Момент передаётся явно, чтобы отмену можно было снять именно с той
 * отметки, которую поставили, а не с той, что оказалась сверху.
 */
export async function mark(id: string, when: string = daysAgoIso()): Promise<Item[]> {
  const items = await readItems();
  return write(
    items.map((i) =>
      i.id === id
        ? { ...i, marks: [when, ...i.marks].sort((a, b) => +new Date(b) - +new Date(a)).slice(0, 200) }
        : i,
    ),
  );
}

export async function unmark(id: string, iso: string): Promise<Item[]> {
  const items = await readItems();
  return write(items.map((i) => (i.id === id ? { ...i, marks: i.marks.filter((m) => m !== iso) } : i)));
}

export async function removeItem(id: string): Promise<Item[]> {
  const items = await readItems();
  return write(items.filter((i) => i.id !== id));
}

/** Вернуть удалённое на место: отмена из тоста. */
export async function restoreItem(item: Item): Promise<Item[]> {
  const items = await readItems();
  if (items.some((i) => i.id === item.id)) return items;
  return write([item, ...items]);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
