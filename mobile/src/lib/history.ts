// Diagnoses are kept on the device, newest first. Nothing leaves the phone.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Diagnosis, Metrics } from "./diagnose";

export type Entry = {
  id: string;
  title: string;
  change: number;
  reach: number;
  /** ISO, formatted for display where it is shown */
  at: string;
  /** where the numbers came from */
  source: "manual" | "instagram";
  metrics: Metrics;
};

const KEY = "history";
const LIMIT = 100;

export async function readHistory(): Promise<Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

export async function addEntry(d: Diagnosis, m: Metrics, source: Entry["source"]): Promise<Entry[]> {
  const entry: Entry = {
    id: String(Date.now()),
    title: d.title,
    change: d.change,
    reach: m.now,
    at: new Date().toISOString(),
    source,
    metrics: m,
  };
  const next = [entry, ...(await readHistory())].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function removeEntry(id: string): Promise<Entry[]> {
  const next = (await readHistory()).filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
