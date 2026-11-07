import {
  byCategory, dueCount, expected, orderBy, sortItems, status, typicalInterval, type Item,
} from "../items";

const now = new Date("2026-11-07T12:00:00");
const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString();

const item = (title: string, marks: number[], everyDays?: number): Item => ({
  id: title,
  title,
  category: "other",
  everyDays,
  marks: marks.map((d) => ({ at: ago(d) })),
  createdAt: ago(900),
});

describe("typicalInterval", () => {
  it("needs three marks before it calls anything a habit", () => {
    expect(typicalInterval(item("линзы", []))).toBeNull();
    expect(typicalInterval(item("линзы", [10]))).toBeNull();
    expect(typicalInterval(item("линзы", [10, 40]))).toBeNull();
    expect(typicalInterval(item("линзы", [10, 40, 70]))).toBe(30);
  });

  it("takes the median, so one skipped year does not ruin the picture", () => {
    // промежутки 30, 30, 400, 30
    const i = item("шторы", [0, 30, 60, 460, 490]);
    expect(typicalInterval(i)).toBe(30);
  });

  it("ignores two marks made on the same day", () => {
    expect(typicalInterval(item("щётка", [0, 0, 0]))).toBeNull();
  });
});

describe("expected", () => {
  it("prefers the interval set by hand over the one it guessed", () => {
    const i = item("линзы", [10, 40, 70], 90);
    expect(typicalInterval(i)).toBe(30);
    expect(expected(i)).toBe(90);
  });

  it("falls back to the habit when nothing was set", () => {
    expect(expected(item("линзы", [10, 40, 70]))).toBe(30);
  });

  it("is null when there is neither", () => {
    expect(expected(item("шторы", [212]))).toBeNull();
  });
});

describe("status", () => {
  it("has no opinion without an interval, however long it has been", () => {
    expect(status(item("шторы", [900]), now)).toBe("none");
  });

  it("warns shortly before the interval runs out", () => {
    expect(status(item("линзы", [20], 30), now)).toBe("ok");
    expect(status(item("линзы", [25], 30), now)).toBe("soon");
    expect(status(item("линзы", [31], 30), now)).toBe("due");
  });

  it("treats something never done as due once an interval exists", () => {
    expect(status(item("щётка", [], 90), now)).toBe("due");
    expect(status(item("щётка", []), now)).toBe("none");
  });

  it("uses the guessed interval too", () => {
    // привычка раз в 30 дней, последний раз 45 дней назад
    expect(status(item("линзы", [45, 75, 105]), now)).toBe("due");
  });
});

describe("sortItems", () => {
  it("puts the most overdue first, then the longest ago", () => {
    const list = [
      item("свежее", [2]),
      item("просрочено слегка", [35], 30),
      item("давнее", [300]),
      item("просрочено сильно", [200], 30),
    ];
    expect(sortItems(list, now).map((i) => i.title)).toEqual([
      "просрочено сильно",
      "просрочено слегка",
      "давнее",
      "свежее",
    ]);
  });

  it("counts never done as infinitely long ago", () => {
    expect(sortItems([item("давнее", [500]), item("ни разу", [])], now)[0].title).toBe("ни разу");
  });

  it("does not touch the array it was given", () => {
    const list = [item("a", [1]), item("b", [5])];
    sortItems(list, now);
    expect(list.map((i) => i.title)).toEqual(["a", "b"]);
  });
});

describe("dueCount", () => {
  it("counts only what is actually due", () => {
    expect(dueCount([item("a", [35], 30), item("b", [2], 30), item("c", [900])], now)).toBe(1);
  });
});

describe("orderBy", () => {
  const list = [
    item("бабушка", [9]),
    item("линзы", [26], 30),
    item("шторы", [212]),
    item("стоматолог", [408], 365),
  ];

  it("alpha sorts the Russian way", () => {
    expect(orderBy(list, "alpha", now).map((i) => i.title)).toEqual([
      "бабушка", "линзы", "стоматолог", "шторы",
    ]);
  });

  it("due puts the nearest deadline first and the dateless last", () => {
    // стоматологу просрочено 43 дня, линзам осталось 4
    expect(orderBy(list, "due", now).map((i) => i.title).slice(0, 2)).toEqual(["стоматолог", "линзы"]);
    expect(orderBy(list, "due", now).slice(2).every((i) => !i.everyDays)).toBe(true);
  });

  it("recent is the default order", () => {
    expect(orderBy(list, "recent", now)).toEqual(sortItems(list, now));
  });
});

describe("byCategory", () => {
  it("keeps only the categories that have something in them", () => {
    const a = { ...item("линзы", [1]), category: "body" as const };
    const b = { ...item("шторы", [2]), category: "home" as const };
    expect(byCategory([a, b]).map((g) => g.id)).toEqual(["home", "body"]);
  });

  it("keeps the order it was given inside a category", () => {
    const a = { ...item("раз", [1]), category: "home" as const };
    const b = { ...item("два", [2]), category: "home" as const };
    expect(byCategory([a, b])[0].items.map((i) => i.title)).toEqual(["раз", "два"]);
  });
});
