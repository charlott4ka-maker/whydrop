import type { Item } from "../items";
import { widgetPayload } from "../widget";

const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString();

const item = (title: string, days: number | null, everyDays?: number): Item => ({
  id: title,
  title,
  category: "other",
  everyDays,
  marks: days === null ? [] : [{ at: ago(days) }],
  createdAt: ago(900),
});

describe("widgetPayload", () => {
  it("sends dates, not days: the widget counts them itself", () => {
    const p = widgetPayload([item("Линзы", 10, 30)]);
    expect(p.items[0]).toEqual({ t: "Линзы", a: expect.any(String), e: 30 });
  });

  it("keeps the same order the list shows, overdue first", () => {
    const p = widgetPayload([item("свежее", 2), item("просрочено", 200, 30), item("давнее", 300)]);
    expect(p.items.map((i) => i.t)).toEqual(["просрочено", "давнее", "свежее"]);
  });

  it("sends at most three: more does not fit even in the medium widget", () => {
    const many = Array.from({ length: 9 }, (_, k) => item("пункт " + k, k + 1));
    expect(widgetPayload(many).items).toHaveLength(3);
  });

  it("marks something never done with a null date", () => {
    expect(widgetPayload([item("щётка", null, 90)]).items[0]).toEqual({ t: "щётка", a: null, e: 90 });
  });

  it("survives an empty list", () => {
    expect(widgetPayload([])).toEqual({ v: 1, items: [] });
  });
});
