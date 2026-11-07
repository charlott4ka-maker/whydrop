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

/** Отметка: когда это было и, если есть что сказать, что именно было. */
export type Mark = { at: string; note?: string };

export type Item = {
  id: string;
  title: string;
  category: CategoryId;
  /** срок, заданный руками; пусто — приложение смотрит на привычку */
  everyDays?: number;
  /** что помнить к следующему разу: модель фильтра, телефон мастера */
  note?: string;
  /** отметки, новые первыми */
  marks: Mark[];
  createdAt: string;
};

/** ok — ещё рано, soon — вот-вот, due — пора, none — срока нет и привычки тоже */
export type Status = "none" | "ok" | "soon" | "due";

const KEY = "items";

export const lastMark = (i: Item): Mark | null => i.marks[0] ?? null;
export const daysOf = (i: Item, now?: Date): number | null =>
  i.marks[0] ? daysSince(i.marks[0].at, now) : null;

/**
 * Как часто человек делает это на самом деле: медиана промежутков между
 * отметками. Медиана, а не среднее, потому что один пропущенный год не должен
 * перечёркивать всю картину. Нужно хотя бы три отметки, иначе это не привычка,
 * а совпадение.
 */
export function typicalInterval(i: Item): number | null {
  if (i.marks.length < 3) return null;
  const times = i.marks.map((m) => new Date(m.at).getTime()).sort((a, b) => b - a);
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

/** Сортировки из шита «Вид». «recent» — та же, что по умолчанию. */
export function orderBy(items: Item[], sort: "recent" | "alpha" | "due", now?: Date): Item[] {
  if (sort === "alpha") return [...items].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  if (sort === "due") {
    const left = (i: Item) => {
      const e = expected(i);
      if (!e) return Infinity; // без срока торопиться некуда
      return e - (daysOf(i, now) ?? e * 10);
    };
    return [...items].sort((a, b) => left(a) - left(b));
  }
  return sortItems(items, now);
}

/** Пункты по категориям, пустые категории опущены, порядок внутри сохранён. */
export function byCategory(items: Item[]): { id: CategoryId; title: string; items: Item[] }[] {
  return CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.id) })).filter(
    (g) => g.items.length > 0,
  );
}

export const dueCount = (items: Item[], now?: Date) =>
  items.filter((i) => status(i, now) === "due").length;

/* ------------------------------ хранилище ------------------------------ */

type Legacy = Omit<Item, "marks"> & { lastAt?: string | null; marks?: (string | Mark)[] };

/**
 * Первая версия хранила одну дату вместо истории, вторая — список строк.
 * Обе читаются: терять чужие данные при обновлении нельзя.
 */
function migrate(raw: Legacy[]): Item[] {
  return raw.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category ?? "other",
    everyDays: i.everyDays,
    note: i.note,
    marks: (i.marks ?? (i.lastAt ? [i.lastAt] : [])).map((m) =>
      typeof m === "string" ? { at: m } : m,
    ),
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
  opts: { category?: CategoryId; everyDays?: number; note?: string; marks?: Mark[] } = {},
): Promise<Item[]> {
  const item: Item = {
    id: newId(),
    title: title.trim(),
    category: opts.category ?? "other",
    everyDays: opts.everyDays,
    note: opts.note,
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
export async function mark(id: string, when: string = daysAgoIso(), note?: string): Promise<Item[]> {
  const items = await readItems();
  return write(
    items.map((i) =>
      i.id === id
        ? {
            ...i,
            marks: [{ at: when, note }, ...i.marks]
              .sort((a, b) => +new Date(b.at) - +new Date(a.at))
              .slice(0, 200),
          }
        : i,
    ),
  );
}

export async function unmark(id: string, at: string): Promise<Item[]> {
  const items = await readItems();
  return write(items.map((i) => (i.id === id ? { ...i, marks: i.marks.filter((m) => m.at !== at) } : i)));
}

/** Приписка к конкретной отметке: что было в тот раз. */
export async function setMarkNote(id: string, at: string, note: string): Promise<Item[]> {
  const items = await readItems();
  return write(
    items.map((i) =>
      i.id === id
        ? { ...i, marks: i.marks.map((m) => (m.at === at ? { ...m, note: note.trim() || undefined } : m)) }
        : i,
    ),
  );
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
