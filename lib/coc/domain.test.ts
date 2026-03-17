import { describe, expect, it } from "vitest";
import {
  allocatePointsWithCap,
  calculateMovAgeOffset,
  calculateMovBase,
  eduCheck,
  randomArrayWithSum,
  sum,
} from "./domain";
import { createInitialSkills } from "./constants";

describe("domain", () => {
  it("eduCheck applies offset when check is null or check value is greater", () => {
    const result = eduCheck(50, [null, 80, 40], [-5, 3, 10]);
    expect(result).toBe(48);
  });

  it("randomArrayWithSum keeps length and total", () => {
    const arr = randomArrayWithSum(5, 20, () => 0.25);
    expect(arr).toHaveLength(5);
    expect(sum(arr)).toBe(20);
    expect(arr.every((v) => v >= 0)).toBe(true);
  });

  it("calculateMovBase follows comparison rules", () => {
    expect(calculateMovBase(30, 30, 40)).toBe(7);
    expect(calculateMovBase(50, 50, 40)).toBe(9);
    expect(calculateMovBase(50, 30, 40)).toBe(8);
  });

  it("calculateMovAgeOffset follows age brackets", () => {
    expect(calculateMovAgeOffset(39)).toBe(0);
    expect(calculateMovAgeOffset(45)).toBe(-1);
    expect(calculateMovAgeOffset(55)).toBe(-2);
    expect(calculateMovAgeOffset(65)).toBe(-3);
    expect(calculateMovAgeOffset(75)).toBe(-4);
    expect(calculateMovAgeOffset(85)).toBe(-5);
  });

  it("allocatePointsWithCap uses all points within cap", () => {
    const skills = createInitialSkills();
    const result = allocatePointsWithCap(
      skills,
      ["信用", "心理学"],
      20,
      90,
      () => 0,
    );

    expect(result["信用"]).toBe(skills["信用"] + 20);
    expect(result["信用"]).toBeLessThanOrEqual(90);
    expect(result["心理学"]).toBe(skills["心理学"]);
  });

  it("allocatePointsWithCap handles empty candidates and zero point", () => {
    const skills = createInitialSkills();

    expect(allocatePointsWithCap(skills, [], 20)).toEqual(skills);
    expect(allocatePointsWithCap(skills, ["信用"], 0)).toEqual(skills);
  });
});
