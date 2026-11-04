import { change, diagnose, type Metrics } from "../diagnose";

// A healthy week: enough posts, a Reel among them, likes well over 1% of the
// audience. Each test below breaks exactly one of those.
const healthy: Metrics = { now: 6600, prev: 10000, posts: 4, reels: 2, likes: 300, followers: 10000 };

describe("change", () => {
  it("reports a fall and a rise", () => {
    expect(change(6600, 10000)).toBe(-34);
    expect(change(11000, 10000)).toBe(10);
  });

  it("does not divide by zero", () => {
    expect(change(500, 0)).toBe(0);
  });
});

describe("diagnose", () => {
  it("calls a small change noise, whichever way it went", () => {
    expect(diagnose({ ...healthy, now: 9700 }).title).toBe("Падения нет");
    expect(diagnose({ ...healthy, now: 10600 }).title).toBe("Охват растёт");
    expect(diagnose({ ...healthy, now: 9700 }).falling).toBe(false);
  });

  it("blames rare posting first", () => {
    const d = diagnose({ ...healthy, posts: 2, reels: 0 });
    expect(d.title).toBe("Мало публикаций");
    expect(d.falling).toBe(true);
  });

  it("blames missing Reels once there are enough posts", () => {
    expect(diagnose({ ...healthy, reels: 0 }).title).toBe("Нет Reels");
  });

  it("blames engagement when likes are under 1% of the audience", () => {
    const d = diagnose({ ...healthy, likes: 90 });
    expect(d.title).toBe("Слабая вовлечённость");
    expect(d.why).toContain("0.9%");
  });

  it("falls through to seasonality when the numbers look fine", () => {
    expect(diagnose(healthy).title).toBe("Похоже на сезонность");
  });

  it("always gives two things to do", () => {
    const cases: Metrics[] = [
      healthy,
      { ...healthy, now: 9700 },
      { ...healthy, posts: 1, reels: 0 },
      { ...healthy, reels: 0 },
      { ...healthy, likes: 50 },
    ];
    for (const m of cases) expect(diagnose(m).actions).toHaveLength(2);
  });

  it("refuses to judge without a previous period", () => {
    const d = diagnose({ ...healthy, prev: 0 });
    expect(d.title).toBe("Не с чем сравнить");
    // the fall rules must not get a say: there is no comparison to fall from
    expect(d.why).not.toContain("Reels");
    expect(d.actions).toHaveLength(2);
  });

  it("survives an account with no followers", () => {
    expect(() => diagnose({ ...healthy, followers: 0, likes: 0 })).not.toThrow();
  });
});
