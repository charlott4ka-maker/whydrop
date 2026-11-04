// Prefs live on the device only. Read synchronously (haptic() can't await), so
// they are loaded once at boot and kept in memory; writes go straight to disk.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

/** Days a diagnosis compares: this period against the one before it. */
export type Period = "7" | "14" | "30";

export type Prefs = {
  period: Period;
  saveHistory: boolean;
  haptics: boolean;
};

const DEFAULTS: Prefs = { period: "7", saveHistory: true, haptics: true };
const KEY = "prefs";

let prefs: Prefs = DEFAULTS;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function getPrefs(): Prefs {
  return prefs;
}

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

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getPrefs,
  );
}
