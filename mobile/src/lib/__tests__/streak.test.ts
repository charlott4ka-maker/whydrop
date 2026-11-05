import type { Entry } from "../history";
import { achievements, streak } from "../streak";

const M = { now: 100, prev: 100, posts: 3, reels: 1, likes: 10, followers: 1000 };

const entry = (iso: string, over: Partial<Entry> = {}): Entry => ({
  id: iso,
  title: "Нет Reels",
  change: -20,
  reach: 100,
  at: iso,
  source: "manual",
  period: "7",
  metrics: { ...M },
  ...over,
});

// среда, 5 ноября 2025
const now = new Date("2025-11-05T12:00:00Z");

describe("streak", () => {
  it("counts this week and the weeks right before it", () => {
    const s = streak(
      [entry("2025-11-04T10:00:00Z"), entry("2025-10-29T10:00:00Z"), entry("2025-10-22T10:00:00Z")],
      now,
    );
    expect(s.current).toBe(3);
    expect(s.doneThisWeek).toBe(true);
  });

  it("keeps the streak alive until this week is over", () => {
    // разбора на этой неделе ещё нет, но прошлая закрыта
    const s = streak([entry("2025-10-29T10:00:00Z"), entry("2025-10-22T10:00:00Z")], now);
    expect(s.current).toBe(2);
    expect(s.doneThisWeek).toBe(false);
  });

  it("breaks the streak when a week was skipped", () => {
    const s = streak([entry("2025-11-04T10:00:00Z"), entry("2025-10-15T10:00:00Z")], now);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });

  it("several analyses in one week count once", () => {
    const s = streak([entry("2025-11-04T10:00:00Z"), entry("2025-11-05T09:00:00Z")], now);
    expect(s.current).toBe(1);
    expect(s.total).toBe(2);
  });

  it("is empty without history", () => {
    expect(streak([], now)).toEqual({ current: 0, best: 0, doneThisWeek: false, total: 0 });
  });
});

describe("achievements", () => {
  it("notices Reels released after a no-Reels analysis", () => {
    const items = [
      entry("2025-10-29T10:00:00Z", { metrics: { ...M, reels: 0 } }),
      entry("2025-11-04T10:00:00Z", { metrics: { ...M, reels: 2 } }),
    ];
    const got = achievements(items, streak(items, now));
    expect(got.find((a) => a.id === "reels")?.done).toBe(true);
  });

  it("gives nothing on an empty history", () => {
    expect(achievements([], streak([], now)).every((a) => !a.done)).toBe(true);
  });
});
