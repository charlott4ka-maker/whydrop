// Лента: отметки всех пунктов одной хронологией. Сегодня и вчера стоят
// отдельными заголовками, потому что про них спрашивают иначе, чем про
// «октябрь»: не «когда в октябре», а «сегодня уже или нет».

import type { Item, Mark } from "./items";
import { daysSince } from "./time";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export type FeedRow = Mark & { title: string; id: string };
export type FeedGroup = { key: string; title: string; rows: FeedRow[] };

/** Свежие сверху. `query` ищет и по названию, и по приписке к отметке. */
export function feedGroups(items: Item[], query = "", now: Date = new Date()): FeedGroup[] {
  const q = query.trim().toLowerCase();
  const all: FeedRow[] = [];
  for (const i of items) {
    for (const m of i.marks) {
      if (q && !`${i.title} ${m.note ?? ""}`.toLowerCase().includes(q)) continue;
      all.push({ ...m, title: i.title, id: i.id });
    }
  }
  all.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const out: FeedGroup[] = [];
  for (const r of all) {
    const d = new Date(r.at);
    const since = daysSince(r.at, now);
    const key = since === 0 ? "today" : since === 1 ? "yesterday" : `${d.getFullYear()}-${d.getMonth()}`;
    const title =
      since === 0
        ? "Сегодня"
        : since === 1
          ? "Вчера"
          : MONTHS[d.getMonth()] + (d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`);

    const g = out.find((x) => x.key === key);
    if (g) g.rows.push(r);
    else out.push({ key, title, rows: [r] });
  }
  return out;
}
