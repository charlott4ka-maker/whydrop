// Разборы хранятся на устройстве, новые сверху. Ничего не уходит с телефона.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Diagnosis, Metrics } from "./diagnose";
import type { Period } from "./prefs";

export type Entry = {
  id: string;
  title: string;
  change: number;
  reach: number;
  /** ISO, форматируется там, где показывается */
  at: string;
  /** откуда взялись цифры */
  source: "manual" | "instagram";
  /** период, который сравнивался: записи с разными периодами несравнимы */
  period: Period;
  metrics: Metrics;
};

const KEY = "history";
const LIMIT = 100;
/** Повтор с теми же цифрами в пределах этого окна не плодит записей. */
const DEDUPE_MS = 10 * 60 * 1000;

export async function readHistory(): Promise<Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    // записи, сохранённые до того, как период стал частью записи
    return list.map((e) => ({ ...e, period: e.period ?? "7" }));
  } catch {
    return [];
  }
}

export async function getEntry(id: string): Promise<Entry | null> {
  return (await readHistory()).find((e) => e.id === id) ?? null;
}

const same = (a: Metrics, b: Metrics) =>
  a.now === b.now && a.prev === b.prev && a.posts === b.posts &&
  a.reels === b.reels && a.likes === b.likes && a.followers === b.followers;

export async function addEntry(d: Diagnosis, m: Metrics, source: Entry["source"], period: Period): Promise<Entry[]> {
  const list = await readHistory();

  // тот же разбор с теми же цифрами только что: обновляем время, а не плодим строки
  const top = list[0];
  if (top && top.period === period && same(top.metrics, m) && Date.now() - new Date(top.at).getTime() < DEDUPE_MS) {
    const next = [{ ...top, at: new Date().toISOString(), source }, ...list.slice(1)];
    await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    return next;
  }

  const entry: Entry = {
    id: String(Date.now()),
    title: d.title,
    change: d.change,
    reach: m.now,
    at: new Date().toISOString(),
    source,
    period,
    metrics: m,
  };
  const next = [entry, ...list].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function removeEntry(id: string): Promise<Entry[]> {
  const next = (await readHistory()).filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

/** Кладёт запись обратно на её место по времени: отмена удаления. */
export async function restoreEntry(e: Entry): Promise<Entry[]> {
  const list = await readHistory();
  if (list.some((x) => x.id === e.id)) return list;
  const next = [...list, e].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
