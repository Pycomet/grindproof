import { describe, expect, it } from "vitest";
import { pickDisplay } from "@/lib/marketing/roast-count";

describe("pickDisplay (GRI-7 tiered counter logic)", () => {
  it("hides when lifetime is below the 25-roast floor", () => {
    expect(pickDisplay(0, 0)).toEqual({ mode: "hidden" });
    expect(pickDisplay(5, 24)).toEqual({ mode: "hidden" });
    expect(pickDisplay(99, 24)).toEqual({ mode: "hidden" });
  });

  it("falls back to lifetime when weekly is below the 10-roast honesty floor", () => {
    expect(pickDisplay(0, 25)).toEqual({ mode: "lifetime", count: 25 });
    expect(pickDisplay(9, 347)).toEqual({ mode: "lifetime", count: 347 });
  });

  it("shows the weekly count when weekly is honest (>= 10)", () => {
    expect(pickDisplay(10, 25)).toEqual({ mode: "weekly", count: 10 });
    expect(pickDisplay(47, 1200)).toEqual({ mode: "weekly", count: 47 });
  });

  it("treats the lifetime threshold inclusively at 25", () => {
    expect(pickDisplay(0, 25)).toEqual({ mode: "lifetime", count: 25 });
  });

  it("treats the weekly threshold inclusively at 10", () => {
    expect(pickDisplay(10, 30)).toEqual({ mode: "weekly", count: 10 });
  });
});
