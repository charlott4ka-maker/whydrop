// Список того, что делаешь нерегулярно, и когда это было в последний раз.
// Всё лежит на устройстве: ни сервера, ни входа, ни чужих API.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { daysSince } from "./time";

export type Item = {
  id: string;
  title: string;
  /** ISO последнего раза; null — ещё ни разу */
  lastAt: string | null;
  /** как часто это обычно делают; без него карточка просто считает дни */
  everyDays?: number;
  createdAt: string;
};

/** ok — ещё рано, soon — вот-вот, due — пора. Без интервала всегда ok. */
export type Status = "ok" | "soon" | "due";

const KEY = "items";

export function status(item: Item, now: Date = new Date()): Status {
  if (!item.everyDays) return "ok";
  if (item.lastAt === null) return "due";
  const d = daysSince(item.lastAt, now);
  if (d >= item.everyDays) return "due";
  if (d >= item.everyDays * 0.8) return "soon";
  return "ok";
}

/**
 * Сверху то, что просрочено сильнее всего, дальше просто давнее.
 * «Ещё ни разу» считаем бесконечно давним: это незакрытый вопрос.
 */
export function sortItems(items: Item[], now: Date = new Date()): Item[] {
  const days = (i: Item) => (i.lastAt === null ? Infinity : daysSince(i.lastAt, now));
  const overdue = (i: Item) => (i.everyDays ? days(i) / i.everyDays : 0);
  return [...items].sort((a, b) => {
    const oa = overdue(a) >= 1 ? overdue(a) : 0;
    const ob = overdue(b) >= 1 ? overdue(b) : 0;
    if (oa !== ob) return ob - oa;
    return days(b) - days(a);
  });
}

export async function readItems(): Promise<Item[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
}

async function write(items: Item[]): Promise<Item[]> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  return items;
}

export async function addItem(title: string, everyDays?: number): Promise<Item[]> {
  const item: Item = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    lastAt: null,
    everyDays,
    createdAt: new Date().toISOString(),
  };
  return write([item, ...(await readItems())]);
}

export async function updateItem(id: string, patch: Partial<Omit<Item, "id">>): Promise<Item[]> {
  const items = await readItems();
  return write(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

/** Отметить, что это сделано сегодня. */
export const markDone = (id: string) => updateItem(id, { lastAt: new Date().toISOString() });

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
