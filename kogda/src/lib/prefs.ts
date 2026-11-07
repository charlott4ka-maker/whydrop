// Настройки живут только на устройстве. Читаются синхронно (haptic() не может
// ждать), поэтому один раз грузятся при запуске и держатся в памяти.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

/** Как показывать список. Крупно — по умолчанию, строки — когда пунктов много. */
export type View = "big" | "rows" | "tiles";
export type Sort = "recent" | "alpha" | "due";

export type Prefs = {
  /** приветствие показывается один раз */
  onboarded: boolean;
  haptics: boolean;
  view: View;
  /** раскладывать по категориям */
  group: boolean;
  sort: Sort;
};

const DEFAULTS: Prefs = { onboarded: false, haptics: true, view: "big", group: false, sort: "recent" };
const KEY = "prefs";

let prefs: Prefs = DEFAULTS;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const getPrefs = (): Prefs => prefs;

export async function loadPrefs(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  emit();
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs = { ...prefs, [key]: value };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
}

export const usePrefs = (): Prefs =>
  useSyncExternalStore((f) => {
    subs.add(f);
    return () => subs.delete(f);
  }, getPrefs);
