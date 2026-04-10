// src/lib/__tests__/accountability.test.ts
import { describe, it, expect } from "vitest";
import {
  computeCompletionRate,
  computeConsistencyRate,
  computeStreakBonus,
  computeScore,
  getTier,
} from "../accountability";

describe("computeCompletionRate", () => {
  it("returns 0 when no tasks exist", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });
  it("returns 100 when all tasks completed", () => {
    expect(computeCompletionRate(5, 5)).toBe(100);
  });
  it("returns correct percentage", () => {
    expect(computeCompletionRate(10, 7)).toBe(70);
  });
});

describe("computeConsistencyRate", () => {
  it("returns 0 when no active days", () => {
    expect(computeConsistencyRate(0, 14)).toBe(0);
  });
  it("returns 100 when all days active", () => {
    expect(computeConsistencyRate(14, 14)).toBe(100);
  });
  it("returns correct percentage", () => {
    expect(computeConsistencyRate(10, 14)).toBeCloseTo(71.43, 1);
  });
});

describe("computeStreakBonus", () => {
  it("returns 0 for streaks under 7", () => {
    expect(computeStreakBonus(0)).toBe(0);
    expect(computeStreakBonus(6)).toBe(0);
  });
  it("returns 1 for 7-day streak", () => {
    expect(computeStreakBonus(7)).toBe(1);
  });
  it("caps at 5 for long streaks", () => {
    expect(computeStreakBonus(11)).toBe(5);
    expect(computeStreakBonus(100)).toBe(5);
  });
});

describe("computeScore", () => {
  it("blends completion (60%) and consistency (40%) with streak bonus", () => {
    const score = computeScore({
      completionRate: 80,
      consistencyRate: 90,
      currentStreak: 10,
    });
    expect(score).toBe(88);
  });
  it("clamps to 100", () => {
    const score = computeScore({
      completionRate: 100,
      consistencyRate: 100,
      currentStreak: 20,
    });
    expect(score).toBe(100);
  });
  it("returns 0 for no activity", () => {
    const score = computeScore({
      completionRate: 0,
      consistencyRate: 0,
      currentStreak: 0,
    });
    expect(score).toBe(0);
  });
});

describe("getTier", () => {
  it("returns correct tier for each range", () => {
    expect(getTier(0)).toEqual({ name: "Slacking", color: "red" });
    expect(getTier(39)).toEqual({ name: "Slacking", color: "red" });
    expect(getTier(40)).toEqual({ name: "Warming Up", color: "orange" });
    expect(getTier(59)).toEqual({ name: "Warming Up", color: "orange" });
    expect(getTier(60)).toEqual({ name: "Grinding", color: "amber" });
    expect(getTier(74)).toEqual({ name: "Grinding", color: "amber" });
    expect(getTier(75)).toEqual({ name: "Locked In", color: "green" });
    expect(getTier(89)).toEqual({ name: "Locked In", color: "green" });
    expect(getTier(90)).toEqual({ name: "Proven", color: "purple" });
    expect(getTier(100)).toEqual({ name: "Proven", color: "purple" });
  });
});
