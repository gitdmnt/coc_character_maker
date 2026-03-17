import { AbilityScores, GeneratedAbilityResult, Skills } from "@/types/coc";
import { GENRE_SKILL_LIST, SKILL_LIST } from "./constants";

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

export const randomD6 = (rng: () => number = Math.random): number =>
  Math.floor(rng() * 6) + 1;

export const random2D6 = (
  rng: () => number = Math.random,
): [number, number] => [randomD6(rng), randomD6(rng)];

export const random3D6 = (
  rng: () => number = Math.random,
): [number, number, number] => [randomD6(rng), randomD6(rng), randomD6(rng)];

export const randomD10 = (rng: () => number = Math.random): number =>
  Math.floor(rng() * 10) + 1;

export const randomD100 = (rng: () => number = Math.random): number =>
  Math.floor(rng() * 100) + 1;

export const randomArrayWithSum = (
  length: number,
  total: number,
  rng: () => number = Math.random,
): number[] => {
  if (length <= 0) return [];
  if (length === 1) return [total];

  const cuts = Array.from({ length: length - 1 }, () =>
    Math.floor(rng() * (total + 1)),
  ).sort((a, b) => a - b);

  const result: number[] = [];
  let prev = 0;
  for (const cut of cuts) {
    result.push(cut - prev);
    prev = cut;
  }
  result.push(total - prev);
  return result;
};

export const eduCheck = (
  edu: number,
  eduCheckSource: (number | null)[],
  eduAgeOffset: number[],
): number => {
  let effectiveEdu = edu;
  for (let i = 0; i < eduCheckSource.length; i += 1) {
    const checkValue = eduCheckSource[i];
    if (checkValue === null || effectiveEdu < checkValue) {
      effectiveEdu += eduAgeOffset[i] ?? 0;
    }
  }
  return effectiveEdu;
};

export const calculateMovBase = (
  effectiveDex: number,
  effectiveStr: number,
  effectiveSiz: number,
): number => {
  if (effectiveDex < effectiveSiz && effectiveStr < effectiveSiz) return 7;
  if (effectiveDex > effectiveSiz && effectiveStr > effectiveSiz) return 9;
  return 8;
};

export const calculateMovAgeOffset = (age: number): number => {
  if (age >= 80) return -5;
  if (age >= 70) return -4;
  if (age >= 60) return -3;
  if (age >= 50) return -2;
  if (age >= 40) return -1;
  return 0;
};

export const calculateJobPoints = (
  abilityScores: AbilityScores,
  pointCalculation: { param: string; weight: number }[],
): number => {
  const weighted = pointCalculation.map((pc) => {
    const key = pc.param.toLowerCase() as keyof AbilityScores;
    const value = abilityScores[key] ?? 0;
    return value * pc.weight;
  });

  return Math.floor(sum(weighted));
};

export const mapJobSkillToKey = (skill: string): keyof Skills | null => {
  if (SKILL_LIST.includes(skill as (typeof SKILL_LIST)[number])) {
    return skill as keyof Skills;
  }

  const genre = GENRE_SKILL_LIST.find((g) => skill.startsWith(g));
  if (!genre) return null;

  const candidate = `${genre}(その他)` as keyof Skills;
  if (SKILL_LIST.includes(candidate as (typeof SKILL_LIST)[number])) {
    return candidate;
  }

  return null;
};

export const allocatePointsWithCap = (
  skills: Skills,
  candidateSkills: (keyof Skills)[],
  point: number,
  cap = 90,
  rng: () => number = Math.random,
): Skills => {
  if (point <= 0 || candidateSkills.length === 0) {
    return { ...skills };
  }

  const newSkills: Skills = { ...skills };
  let cost = 0;
  const maxAttempts = point * 20 + 100;
  let attempts = 0;

  while (cost < point && attempts < maxAttempts) {
    attempts += 1;

    const availableSkills = candidateSkills
      .filter((skill) => (newSkills[skill] ?? 0) < cap)
      .filter(
        (skill) => !skill.includes("(その他)") && skill !== "クトゥルフ神話",
      );
    if (availableSkills.length === 0) break;

    const randomSkill =
      availableSkills[Math.floor(rng() * availableSkills.length)];

    const currentValue = newSkills[randomSkill] ?? 0;
    const diff = Math.min(cap - currentValue, point - cost);
    if (diff <= 0) continue;

    const increment = Math.floor(rng() * diff) + 1;
    newSkills[randomSkill] = currentValue + increment;
    cost += increment;
  }

  return newSkills;
};

export const diffSkills = (
  before: Skills,
  after: Skills,
): Partial<Record<keyof Skills, number>> => {
  const result: Partial<Record<keyof Skills, number>> = {};
  for (const key of Object.keys(after) as (keyof Skills)[]) {
    const diff = (after[key] ?? 0) - (before[key] ?? 0);
    if (diff > 0) result[key] = diff;
  }
  return result;
};

export const generateCharacterAbilityScores = (
  playerName: string,
  rng: () => number = Math.random,
): GeneratedAbilityResult => {
  const gender = rng() < 0.5 ? "男性" : "女性";
  const age = Math.floor(rng() * 75) + 15;

  const strSource = random3D6(rng);
  const str = sum(strSource) * 5;
  const conSource = random3D6(rng);
  const con = sum(conSource) * 5;
  const dexSource = random3D6(rng);
  const dex = sum(dexSource) * 5;
  const appSource = random3D6(rng);
  const app = sum(appSource) * 5;
  const powSource = random3D6(rng);
  const pow = sum(powSource) * 5;

  const sizSource = random2D6(rng);
  const siz = (sum(sizSource) + 6) * 5;
  const eduSource = random2D6(rng);
  const edu = (sum(eduSource) + 6) * 5;
  const intSource = random2D6(rng);
  const intScore = (sum(intSource) + 6) * 5;

  const luckSourceInitial = random3D6(rng);
  let luckSource: [number, number, number][] = [luckSourceInitial];
  let luck = sum(luckSourceInitial) * 5;

  let strAgeOffset = 0;
  let conAgeOffset = 0;
  let dexAgeOffset = 0;
  let appAgeOffset = 0;
  let sizAgeOffset = 0;
  let eduCheckSource: (number | null)[] = [];
  let eduAgeOffset: number[] = [];

  if (age <= 19) {
    const offsetArray = randomArrayWithSum(2, 5, rng);
    strAgeOffset = -offsetArray[0];
    sizAgeOffset = -offsetArray[1];
    eduCheckSource = [null];
    eduAgeOffset = [-5];

    const extraLuckSource = random3D6(rng);
    luckSource = [...luckSource, extraLuckSource];
    luck = Math.max(luck, sum(extraLuckSource) * 5);
  } else if (age <= 39) {
    eduCheckSource = [randomD100(rng)];
    eduAgeOffset = [randomD10(rng)];
  } else if (age <= 49) {
    const offsetArray = randomArrayWithSum(3, 5, rng);
    strAgeOffset = -offsetArray[0];
    conAgeOffset = -offsetArray[1];
    dexAgeOffset = -offsetArray[2];
    appAgeOffset = -5;
    eduCheckSource = [randomD100(rng), randomD100(rng)];
    eduAgeOffset = [randomD10(rng), randomD10(rng)];
  } else if (age <= 59) {
    const offsetArray = randomArrayWithSum(3, 10, rng);
    strAgeOffset = -offsetArray[0];
    conAgeOffset = -offsetArray[1];
    dexAgeOffset = -offsetArray[2];
    appAgeOffset = -10;
    eduCheckSource = [randomD100(rng), randomD100(rng), randomD100(rng)];
    eduAgeOffset = [randomD10(rng), randomD10(rng), randomD10(rng)];
  } else if (age <= 69) {
    const offsetArray = randomArrayWithSum(3, 20, rng);
    strAgeOffset = -offsetArray[0];
    conAgeOffset = -offsetArray[1];
    dexAgeOffset = -offsetArray[2];
    appAgeOffset = -15;
    eduCheckSource = [
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
    ];
    eduAgeOffset = [
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
    ];
  } else if (age <= 79) {
    const offsetArray = randomArrayWithSum(3, 40, rng);
    strAgeOffset = -offsetArray[0];
    conAgeOffset = -offsetArray[1];
    dexAgeOffset = -offsetArray[2];
    appAgeOffset = -20;
    eduCheckSource = [
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
    ];
    eduAgeOffset = [
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
    ];
  } else {
    const offsetArray = randomArrayWithSum(3, 80, rng);
    strAgeOffset = -offsetArray[0];
    conAgeOffset = -offsetArray[1];
    dexAgeOffset = -offsetArray[2];
    appAgeOffset = -40;
    eduCheckSource = [
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
      randomD100(rng),
    ];
    eduAgeOffset = [
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
      randomD10(rng),
    ];
  }

  const san = pow;
  const mp = Math.floor(pow / 5);
  const hp = Math.floor((con + conAgeOffset + siz + sizAgeOffset) / 10);

  const mov = calculateMovBase(
    dex + dexAgeOffset,
    str + strAgeOffset,
    siz + sizAgeOffset,
  );
  const movAgeOffset = calculateMovAgeOffset(age);
  const effectiveEdu = eduCheck(edu, eduCheckSource, eduAgeOffset);

  return {
    basicInfo: {
      playerName,
      age,
      gender,
    },
    abilityScores: {
      str: str + strAgeOffset,
      con: con + conAgeOffset,
      siz: siz + sizAgeOffset,
      dex: dex + dexAgeOffset,
      app: app + appAgeOffset,
      edu: effectiveEdu,
      int: intScore,
      pow,
      mov: mov + movAgeOffset,
      hp,
      san,
      mp,
      luck,
    },
    details: {
      str,
      strSource,
      strAgeOffset,
      con,
      conSource,
      conAgeOffset,
      siz,
      sizSource,
      sizAgeOffset,
      dex,
      dexSource,
      dexAgeOffset,
      app,
      appSource,
      appAgeOffset,
      edu,
      eduSource,
      eduCheckSource,
      eduAgeOffset,
      int: intScore,
      intSource,
      pow,
      powSource,
      mov,
      movAgeOffset,
      hp,
      san,
      mp,
      luck,
      luckSource,
    },
  };
};

export interface DiceRollResult {
  firstDigit: number;
  secondDigits: number[];
  extraDiceCount: number;
  type: "normal" | "bonus" | "penalty";
  total: number;
  goal: number;
  isSuccess: boolean;
}

export const diceRoll1D100 = (
  rng: () => number = Math.random,
  extraDiceCountThatPlusMeansBonusAndMinusMeansPenalty: number = 0,
  goal: number,
): DiceRollResult => {
  const tryCount =
    1 + Math.abs(extraDiceCountThatPlusMeansBonusAndMinusMeansPenalty);
  const type =
    extraDiceCountThatPlusMeansBonusAndMinusMeansPenalty > 0
      ? "bonus"
      : extraDiceCountThatPlusMeansBonusAndMinusMeansPenalty < 0
        ? "penalty"
        : "normal";

  const firstDigit = randomD10(rng) - 1;
  const secondDigits = Array.from(
    { length: tryCount },
    () => randomD10(rng) - 1,
  );
  const secondDigit =
    type === "bonus"
      ? Math.min(...secondDigits)
      : type === "penalty"
        ? Math.max(...secondDigits)
        : secondDigits[0];
  const total = firstDigit * 10 + secondDigit;
  const finalTotal = total === 0 ? 100 : total;
  const isSuccess = finalTotal <= goal;

  return {
    firstDigit,
    secondDigits,
    extraDiceCount: tryCount - 1,
    type,
    total: finalTotal,
    goal,
    isSuccess,
  };
};
