import { sortItems, status, type Item } from "../items";

const now = new Date("2026-11-05T12:00:00");
const ago = (days: number) => new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();

const item = (title: string, days: number | null, everyDays?: number): Item => ({
  id: title,
  title,
  lastAt: days === null ? null : ago(days),
  everyDays,
  createdAt: ago(400),
});

describe("status", () => {
  it("is always ok without an interval, however long it has been", () => {
    expect(status(item("шторы", 900), now)).toBe("ok");
  });

  it("warns shortly before the interval runs out", () => {
    expect(status(item("линзы", 20, 30), now)).toBe("ok");
    expect(status(item("линзы", 25, 30), now)).toBe("soon");
    expect(status(item("линзы", 31, 30), now)).toBe("due");
  });

  it("treats something never done as due", () => {
    expect(status(item("щётка", null, 90), now)).toBe("due");
  });
});

describe("sortItems", () => {
  it("puts the most overdue first, then the longest ago", () => {
    const list = [
      item("свежее", 2),
      item("просрочено слегка", 35, 30),
      item("давнее", 300),
      item("просрочено сильно", 200, 30),
    ];
    expect(sortItems(list, now).map((i) => i.title)).toEqual([
      "просрочено сильно",
      "просрочено слегка",
      "давнее",
      "свежее",
    ]);
  });

  it("counts never done as infinitely long ago", () => {
    const list = [item("давнее", 500), item("ни разу", null)];
    expect(sortItems(list, now)[0].title).toBe("ни разу");
  });

  it("does not touch the array it was given", () => {
    const list = [item("a", 1), item("b", 5)];
    sortItems(list, now);
    expect(list.map((i) => i.title)).toEqual(["a", "b"]);
  });
});
