import { parseNumber, readInsights, type OcrLine } from "../insights";

const line = (text: string, y: number, x = 0.08, width = 0.4, height = 0.03): OcrLine => ({
  text,
  box: { x, y, width, height },
});

describe("parseNumber", () => {
  it("reads plain and grouped numbers", () => {
    expect(parseNumber("18420")?.value).toBe(18420);
    expect(parseNumber("18 420")?.value).toBe(18420);
    expect(parseNumber("18 420")?.value).toBe(18420);
    expect(parseNumber("18,420")?.value).toBe(18420);
    expect(parseNumber("1.234.567")?.value).toBe(1234567);
  });

  it("expands the abbreviations Instagram uses and marks them rounded", () => {
    expect(parseNumber("18,4 тыс.")).toEqual({ value: 18400, approximate: true });
    expect(parseNumber("1,2 млн")).toEqual({ value: 1200000, approximate: true });
    expect(parseNumber("18.4K")).toEqual({ value: 18400, approximate: true });
    expect(parseNumber("1.2M")).toEqual({ value: 1200000, approximate: true });
  });

  it("does not mark an exact number as rounded", () => {
    expect(parseNumber("4")).toEqual({ value: 4, approximate: false });
  });

  it("refuses anything that is not a number", () => {
    expect(parseNumber("Охваченные аккаунты")).toBeNull();
    expect(parseNumber("18 420 аккаунтов за неделю")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
});

describe("readInsights", () => {
  it("takes the number that sits under its own label", () => {
    const r = readInsights([
      line("18 420", 0.20),
      line("Охваченные аккаунты", 0.24),
      line("12 840", 0.40),
      line("Подписчики", 0.44),
    ]);
    expect(r.values.now).toBe(18420);
    expect(r.values.followers).toBe(12840);
  });

  it("takes the number that sits above its label too", () => {
    const r = readInsights([line("Публикации", 0.3), line("4", 0.34)]);
    expect(r.values.posts).toBe(4);
  });

  it("takes a number to the right on the same line", () => {
    const r = readInsights([
      { text: "Лайки", box: { x: 0.08, y: 0.5, width: 0.2, height: 0.03 } },
      { text: "210", box: { x: 0.7, y: 0.5, width: 0.15, height: 0.03 } },
    ]);
    expect(r.values.likes).toBe(210);
  });

  it("does not pull a number out of a neighbouring column", () => {
    const r = readInsights([
      { text: "Reels", box: { x: 0.08, y: 0.3, width: 0.2, height: 0.03 } },
      { text: "999", box: { x: 0.72, y: 0.9, width: 0.15, height: 0.03 } },
    ]);
    expect(r.values.reels).toBeUndefined();
  });

  it("derives the previous period from the comparison Instagram prints", () => {
    const r = readInsights([
      line("18 420", 0.20),
      line("Охваченные аккаунты", 0.24),
      line("-33% по сравнению с прошлой неделей", 0.28),
    ]);
    expect(r.changePercent).toBe(-33);
    expect(r.values.prev).toBe(27493);
  });

  it("understands the English comparison and the minus sign Instagram draws", () => {
    const r = readInsights([
      line("18,420", 0.20),
      line("Accounts reached", 0.24),
      line("−12% vs previous 7 days", 0.28),
    ]);
    expect(r.changePercent).toBe(-12);
    expect(r.values.prev).toBe(20932);
  });

  it("returns nothing from a screenshot of something else", () => {
    const r = readInsights([line("Сторис", 0.2), line("Вчера в 19:04", 0.3)]);
    expect(r.values).toEqual({});
    expect(r.changePercent).toBeUndefined();
  });

  it("flags rounded numbers so the screen can warn about them", () => {
    const r = readInsights([line("18,4 тыс.", 0.2), line("Охваченные аккаунты", 0.24)]);
    expect(r.values.now).toBe(18400);
    expect(r.approximate).toEqual(["now"]);
  });
});
