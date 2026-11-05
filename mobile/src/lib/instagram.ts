// Unified login (Facebook Login for Business). Meta closed the older
// "Instagram API with Instagram Login" to new apps, so the host is
// graph.facebook.com and the account is reached through the business assets
// the user granted, not through a Facebook Page: there is no Page here and
// /me/accounts comes back empty.
//
// Business and Creator accounts only. A personal account has no insights
// through the API at all, so typing the numbers in by hand stays a first class
// path. The token lives in SecureStore; the backend exists only for the code
// exchange, which needs the app secret.

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useSyncExternalStore } from "react";

import { API_URL } from "./api";
import type { Metrics } from "./diagnose";

const GRAPH = "https://graph.facebook.com/v23.0";
const KEY = "ig_session";
const REDIRECT = "whydrop://auth";

export type Account = {
  /** the Instagram professional account, not the Meta user */
  id: string;
  username: string;
  avatar: string | null;
  followers: number;
};

/** `expiresAt` 0 means a system user token, which does not expire. */
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

/** Токен отозвали или он протух: сессию держать нет смысла. */
export class RevokedError extends Error {
  constructor() {
    super("Доступ к Instagram отозван. Подключи аккаунт заново в профиле.");
    this.name = "RevokedError";
  }
}

/** Meta отвечает по-английски; показываем человеку то, что можно прочитать. */
function readable(err: { code?: number; type?: string; message?: string } | null, status: number): Error {
  if (err?.code === 190 || err?.type === "OAuthException") return new RevokedError();
  if (err?.code === 4 || err?.code === 17 || err?.code === 32) {
    return new Error("Instagram ограничил частоту запросов. Попробуй через несколько минут.");
  }
  if (err?.code === 10 || err?.code === 200) {
    return new Error("Не хватает разрешений. Переподключи аккаунт в профиле.");
  }
  if (status >= 500) return new Error("Instagram сейчас не отвечает. Попробуй позже.");
  return new Error("Не получилось забрать статистику. Попробуй ещё раз.");
}

async function get<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  let r: Response;
  try {
    r = await fetch(`${GRAPH}${path}${sep}access_token=${token}`);
  } catch {
    throw new Error("Нет связи с интернетом.");
  }
  const body = await r.json().catch(() => null);
  if (!r.ok) throw readable(body?.error ?? null, r.status);
  return body as T;
}

/** The granted business assets hold the Instagram account; there is no Page. */
async function fetchAccount(token: string): Promise<Account> {
  const assigned = await get<{ data?: { id: string }[] }>("/me/assigned_instagram_accounts", token);
  const id = assigned.data?.[0]?.id;
  if (!id) throw new Error("Instagram не передал аккаунт. Проверь, что он профессиональный.");

  const p = await get<{ username?: string; profile_picture_url?: string; followers_count?: number }>(
    `/${id}?fields=id,username,profile_picture_url,followers_count`,
    token,
  );
  return {
    id,
    username: p.username ?? "",
    avatar: p.profile_picture_url ?? null,
    followers: p.followers_count ?? 0,
  };
}

/** Opens the Meta sheet and comes back with an account, or null if the user
 *  closed it. Throws with a readable message when Meta refuses. */
export async function connect(): Promise<Account | null> {
  if (!API_URL) throw new Error("Бэкенд не настроен: нет EXPO_PUBLIC_API_URL.");
  const res = await WebBrowser.openAuthSessionAsync(`${API_URL}/api/instagram/start`, REDIRECT);
  if (res.type !== "success") return null;

  const params = new URLSearchParams(res.url.split("?")[1] || "");
  const error = params.get("error");
  if (error) throw new Error(decodeURIComponent(error));
  const token = params.get("token");
  if (!token) throw new Error("Meta не вернула токен.");
  const expires = Number(params.get("expires") || 0);

  const account = await fetchAccount(token);
  await save({ token, expiresAt: expires ? Date.now() + expires * 1000 : 0, account });
  return account;
}

const day = 24 * 3600 * 1000;
const stamp = (d: Date) => Math.floor(d.getTime() / 1000);

/**
 * Unique reach over a period.
 *
 * Deliberately `metric_type=total_value` and not the sum of the daily values:
 * someone who looked on Monday and again on Wednesday is in both days, so
 * adding days up inflates the figure. total_value is the number Instagram
 * itself shows in Insights, which is the number the user will compare against.
 */
async function reach(id: string, token: string, from: Date, to: Date): Promise<number> {
  const r = await get<{ data?: { total_value?: { value?: number } }[] }>(
    `/${id}/insights?metric=reach&period=day&metric_type=total_value&since=${stamp(from)}&until=${stamp(to)}`,
    token,
  );
  return r.data?.[0]?.total_value?.value ?? 0;
}

/**
 * Everything the diagnosis needs, for the chosen number of days and the same
 * stretch before it. Instagram keeps daily insights for about 30 days, so a 30
 * day period cannot reach far enough back for its own comparison; the request
 * goes out anyway and whatever comes back is what the user sees.
 */
export async function fetchMetrics(days: number): Promise<Metrics> {
  if (!session) throw new Error("Instagram не подключён.");
  const { token, account } = session;
  try {
    return await load(days, token, account);
  } catch (e) {
    // отозванный токен больше ничего не откроет: гасим сессию, чтобы профиль
    // не показывал подключённый аккаунт, которым нельзя пользоваться
    if (e instanceof RevokedError) await save(null);
    throw e;
  }
}

async function load(days: number, token: string, account: Account): Promise<Metrics> {

  const now = new Date();
  const start = new Date(now.getTime() - days * day);
  const prevStart = new Date(now.getTime() - days * 2 * day);

  const [reachNow, reachPrev, media, profile] = await Promise.all([
    reach(account.id, token, start, now),
    reach(account.id, token, prevStart, start),
    get<{ data?: { media_product_type?: string; like_count?: number; timestamp: string }[] }>(
      `/${account.id}/media?fields=media_product_type,like_count,timestamp&limit=100`,
      token,
    ),
    get<{ followers_count?: number }>(`/${account.id}?fields=followers_count`, token),
  ]);

  const inPeriod = (media.data ?? []).filter((m) => new Date(m.timestamp).getTime() >= start.getTime());
  const likes = inPeriod.reduce((sum, m) => sum + (m.like_count || 0), 0);
  const followers = profile.followers_count ?? account.followers;

  // the follower count moves, so keep the stored account in step with it
  if (followers !== account.followers && session) await save({ ...session, account: { ...account, followers } });

  return {
    now: reachNow,
    prev: reachPrev,
    posts: inPeriod.length,
    reels: inPeriod.filter((m) => m.media_product_type === "REELS").length,
    likes: inPeriod.length ? Math.round(likes / inPeriod.length) : 0,
    followers,
  };
}

/**
 * Instagram держит дневные инсайты около 30 дней, а разбору нужен ещё такой же
 * период перед выбранным. Значит из API можно честно сравнить только периоды,
 * удвоенная длина которых укладывается в это окно.
 */
export const INSIGHTS_WINDOW_DAYS = 30;
export const comparableFromApi = (days: number) => days * 2 <= INSIGHTS_WINDOW_DAYS;
