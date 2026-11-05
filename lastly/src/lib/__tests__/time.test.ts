import { ago, daysSince, daysWord, rough } from "../time";

const at = (s: string) => new Date(s).toISOString();

describe("daysSince", () => {
  it("counts calendar days, not 24 hour blocks", () => {
    // отметили вчера поздно вечером, смотрим сегодня утром
    const now = new Date("2026-11-05T08:00:00");
    expect(daysSince(at("2026-11-04T23:30:00"), now)).toBe(1);
  });

  it("is zero on the same day", () => {
    const now = new Date("2026-11-05T23:00:00");
    expect(daysSince(at("2026-11-05T00:10:00"), now)).toBe(0);
  });

  it("never goes negative", () => {
    const now = new Date("2026-11-05T12:00:00");
    expect(daysSince(at("2026-11-09T12:00:00"), now)).toBe(0);
  });
});

describe("daysWord", () => {
  it("declines the way Russian does", () => {
    expect(daysWord(1)).toBe("день");
    expect(daysWord(2)).toBe("дня");
    expect(daysWord(5)).toBe("дней");
    expect(daysWord(11)).toBe("дней");
    expect(daysWord(21)).toBe("день");
    expect(daysWord(22)).toBe("дня");
    expect(daysWord(111)).toBe("дней");
  });
});

describe("ago", () => {
  it("says today, yesterday and the rest in days", () => {
    expect(ago(0)).toEqual({ value: "0", unit: "сегодня" });
    expect(ago(1)).toEqual({ value: "1", unit: "день назад" });
    expect(ago(47)).toEqual({ value: "47", unit: "дней назад" });
  });

  it("has a shape for something never done", () => {
    expect(ago(null)).toEqual({ value: "—", unit: "ещё ни разу" });
  });
});

describe("rough", () => {
  it("stays quiet while the day count still reads", () => {
    expect(rough(0)).toBeNull();
    expect(rough(59)).toBeNull();
    expect(rough(null)).toBeNull();
  });

  it("translates big numbers into months and years", () => {
    expect(rough(90)).toBe("это 3 месяца");
    expect(rough(210)).toBe("это 7 месяцев");
    expect(rough(365)).toBe("это 1 год");
    expect(rough(400)).toBe("это 1 год и 1 месяц");
  });
});
