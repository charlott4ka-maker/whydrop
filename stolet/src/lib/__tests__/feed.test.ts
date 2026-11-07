import { feedGroups } from "../feed";
import type { Item } from "../items";

const now = new Date("2026-11-07T12:00:00");
const ago = (days: number, h = 10) => {
  const d = new Date(now.getTime() - days * 864e5);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

const item = (title: string, marks: { at: string; note?: string }[]): Item => ({
  id: title,
  title,
  category: "other",
  marks,
  createdAt: ago(900),
});

describe("feedGroups", () => {
  it("gives today and yesterday their own headings", () => {
    const g = feedGroups([item("Линзы", [{ at: ago(0) }, { at: ago(1) }, { at: ago(20) }])], "", now);
    expect(g.map((x) => x.title)).toEqual(["Сегодня", "Вчера", "Октябрь"]);
  });

  it("keeps older marks together by month and adds the year when it differs", () => {
    const g = feedGroups([item("Шторы", [{ at: ago(40) }, { at: ago(400) }])], "", now);
    expect(g.map((x) => x.title)).toEqual(["Сентябрь", "Октябрь 2025"]);
  });

  it("mixes every item into one timeline, newest first", () => {
    const g = feedGroups(
      [item("Линзы", [{ at: ago(30) }]), item("Шторы", [{ at: ago(10) }])],
      "",
      now,
    );
    expect(g[0].rows[0].title).toBe("Шторы");
  });

  it("searches the note as well as the title", () => {
    const list = [item("Стригла волосы", [{ at: ago(5), note: "У Иры" }, { at: ago(60) }])];
    expect(feedGroups(list, "иры", now)).toHaveLength(1);
    expect(feedGroups(list, "иры", now)[0].rows).toHaveLength(1);
    expect(feedGroups(list, "волосы", now)[0].rows).toHaveLength(1);
    expect(feedGroups(list, "ноутбук", now)).toEqual([]);
  });

  it("is empty when nothing was ever marked", () => {
    expect(feedGroups([item("Щётка", [])], "", now)).toEqual([]);
  });
});
