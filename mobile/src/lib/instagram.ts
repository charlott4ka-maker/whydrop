// Instagram API with Instagram Login (Business and Creator accounts only; a
// personal account has no insights through the API at all, so manual entry
// stays the other way in). The app holds a long lived token in SecureStore and
// refreshes it itself: refresh_access_token takes no app secret. Only the code
// exchange does, and that is what the backend is for.

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useSyncExternalStore } from "react";

import { API_URL } from "./api";
import type { Metrics } from "./diagnose";

const GRAPH = "https://graph.instagram.com/v23.0";
const KEY = "ig_token";
const REDIRECT = "whydrop://auth";
/** Refresh once the token is inside a week of running out (they last 60 days). */
const REFRESH_WINDOW = 7 * 24 * 3600 * 1000;

export type Account = {
  id: string;
  username: string;
  avatar: string | null;
  followers: number;
};

type Session = { token: string; expiresAt: number; account: Account };

let session: Session | null = null;
let loaded = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function getAccount(): Account | null {
  return session?.account ?? null;
}

export function useAccount(): Account | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getAccount,
  );
}

export async function loadSession(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) session = JSON.parse(raw) as Session;
  } catch {}
  emit();
  if (session) refreshIfStale().catch(() => {});
}

async function save(next: Session | null): Promise<void> {
  session = next;
  emit();
  if (next) await SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  else await SecureStore.deleteItemAsync(KEY).catch(() => {});
}

export async function disconnect(): Promise<void> {
  await save(null);
}

/** Opens the Instagram sheet and comes back with an account, or null if the
 *  user closed it. Throws with a readable message when Instagram refuses. */
export async function connect(): Promise<Account | null> {
  if (!API_URL) throw new Error("Бэкенд не настроен: нет EXPO_PUBLIC_API_URL.");
  const res = await WebBrowser.openAuthSessionAsync(`${API_URL}/api/instagram/start`, REDIRECT);
  if (res.type !== "success") return null;

  const params = new URLSearchParams(res.url.split("?")[1] || "");
  const error = params.get("error");
  if (error) throw new Error(decodeURIComponent(error));
  const token = params.get("token");
  const expires = Number(params.get("expires") || 0);
  if (!token) throw new Error("Instagram не вернул токен.");

  const account = await fetchAccount(token);
  await save({ token, expiresAt: Date.now() + expires * 1000, account });
  return account;
}

async function refreshIfStale(): Promise<void> {
  if (!session) return;
  if (session.expiresAt - Date.now() > REFRESH_WINDOW) return;
  const r = await get<{ access_token: string; expires_in: number }>(
    `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${session.token}`,
  );
  await save({ ...session, token: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 });
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = body?.error?.message || `Instagram ответил ${r.status}`;
    throw new Error(msg);
  }
  return body as T;
}

async function fetchAccount(token: string): Promise<Account> {
  const r = await get<{ id: string; username: string; profile_picture_url?: string; followers_count?: number }>(
    `${GRAPH}/me?fields=id,username,profile_picture_url,followers_count&access_token=${token}`,
  );
  return {
    id: r.id,
    username: r.username,
    avatar: r.profile_picture_url ?? null,
    followers: r.followers_count ?? 0,
  };
}

const day = 24 * 3600 * 1000;
const stamp = (d: Date) => Math.floor(d.getTime() / 1000);

/** Reach is a daily metric, so a period is the sum of its days. */
async function reach(token: string, from: Date, to: Date): Promise<number> {
  const r = await get<{ data: { values: { value: number }[] }[] }>(
    `${GRAPH}/me/insights?metric=reach&period=day&since=${stamp(from)}&until=${stamp(to)}&access_token=${token}`,
  );
  const values = r.data?.[0]?.values ?? [];
  return values.reduce((sum, v) => sum + (v.value || 0), 0);
}

/**
 * Everything the diagnosis needs, for the chosen number of days and the same
 * stretch before it. Instagram only keeps daily insights for about 30 days,
 * so a 30 day period cannot reach far enough back for its own comparison.
 */
export async function fetchMetrics(days: number): Promise<Metrics> {
  if (!session) throw new Error("Instagram не подключён.");
  await refreshIfStale();
  const token = session.token;

  const now = new Date();
  const start = new Date(now.getTime() - days * day);
  const prevStart = new Date(now.getTime() - days * 2 * day);

  const [reachNow, reachPrev, media] = await Promise.all([
    reach(token, start, now),
    reach(token, prevStart, start),
    get<{ data: { media_product_type?: string; like_count?: number; timestamp: string }[] }>(
      `${GRAPH}/me/media?fields=media_product_type,like_count,timestamp&limit=100&access_token=${token}`,
    ),
  ]);

  const inPeriod = (media.data ?? []).filter((m) => new Date(m.timestamp).getTime() >= start.getTime());
  const likes = inPeriod.reduce((sum, m) => sum + (m.like_count || 0), 0);

  return {
    now: reachNow,
    prev: reachPrev,
    posts: inPeriod.length,
    reels: inPeriod.filter((m) => m.media_product_type === "REELS").length,
    likes: inPeriod.length ? Math.round(likes / inPeriod.length) : 0,
    followers: session.account.followers,
  };
}
