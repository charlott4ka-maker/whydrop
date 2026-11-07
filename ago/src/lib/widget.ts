// Что видит виджет. Кладём только даты и сроки, а дни он считает сам: виджет
// обновляется по своему таймлайну, и готовое число замёрзло бы на дне
// последнего запуска приложения.

import { ExtensionStorage } from "@bacons/apple-targets";

import { expected, sortItems, type Item } from "./items";

const GROUP = "group.app.ago.ios";
const KEY = "widget";
/** Больше трёх строк не помещается даже в средний виджет. */
const LIMIT = 3;

let storage: ExtensionStorage | null | undefined;

function store(): ExtensionStorage | null {
  if (storage === undefined) {
    try {
      storage = new ExtensionStorage(GROUP);
    } catch {
      // на Android и в Expo Go общего контейнера нет, и это нормально
      storage = null;
    }
  }
  return storage;
}

export function widgetPayload(items: Item[]) {
  return {
    v: 1,
    items: sortItems(items)
      .slice(0, LIMIT)
      .map((i) => ({ t: i.title, a: i.marks[0]?.at ?? null, e: expected(i) })),
  };
}

/** Вызывается после каждой записи: без этого виджет живёт прошлым. */
export function syncWidget(items: Item[]): void {
  const s = store();
  if (!s) return;
  try {
    s.set(KEY, JSON.stringify(widgetPayload(items)));
    ExtensionStorage.reloadWidget();
  } catch {}
}
