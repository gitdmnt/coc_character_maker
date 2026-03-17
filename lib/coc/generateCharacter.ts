import {
  AbilityGenerationDetails,
  AbilityScores,
  BasicInfo,
  ScinarioSet,
  Skills,
} from "@/types/coc";
import {
  allocatePointsWithCap,
  calculateJobPoints,
  diffSkills,
  generateCharacterAbilityScores,
  mapJobSkillToKey,
} from "./domain";
import { backstoryOracle, jobOracle, jobSkillOracle } from "./oracles";
import { SKILL_LIST } from "./constants";

export interface SkillAllocationDetails {
  jobSkillKeys: (keyof Skills)[];
  jobPoints: number;
  pointCalculation: { param: string; weight: number }[];
  interestPoints: number;
  jobAllocated: Partial<Record<keyof Skills, number>>;
  interestAllocated: Partial<Record<keyof Skills, number>>;
}

export interface CharacterGenerationResult {
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  abilityDetails: AbilityGenerationDetails;
  skills: Skills;
  backstory: string;
  equipment: string[];
  money: number;
  skillAllocationDetails: SkillAllocationDetails;
}

export type ProgressCallback = (
  step: string,
  index: number,
  total: number,
) => void | Promise<void>;

const TOTAL_STEPS = 5;

const ensureCreditSkill = (jobSkills: string[]): string[] =>
  jobSkills.includes("信用") ? jobSkills : [...jobSkills, "信用"];

const generateJobSkills = async (
  abilityScores: AbilityScores,
  job: string,
  skills: Skills,
  scinarioSet: ScinarioSet,
): Promise<{
  skills: Skills;
  jobSkillKeys: (keyof Skills)[];
  jobPoints: number;
  pointCalculation: { param: string; weight: number }[];
  jobAllocated: Partial<Record<keyof Skills, number>>;
}> => {
  const result = await jobSkillOracle({ job, skills, scinarioSet });
  const jobSkills = ensureCreditSkill(result.jobSkills);
  const point = calculateJobPoints(abilityScores, result.pointCalculation);

  const mappedSkills = jobSkills
    .map((skill) => mapJobSkillToKey(skill))
    .filter((skill): skill is keyof Skills => skill !== null);

  const allocatedSkills = allocatePointsWithCap(skills, mappedSkills, point);
  const jobAllocated = diffSkills(skills, allocatedSkills);

  return {
    skills: allocatedSkills,
    jobSkillKeys: mappedSkills,
    jobPoints: point,
    pointCalculation: result.pointCalculation,
    jobAllocated,
  };
};

const generateInterestSkills = (
  skills: Skills,
  abilityScores: AbilityScores,
): {
  skills: Skills;
  interestPoints: number;
  interestAllocated: Partial<Record<keyof Skills, number>>;
} => {
  const point = abilityScores.int * 2;
  const allocatedSkills = allocatePointsWithCap(
    skills,
    [...SKILL_LIST] as (keyof Skills)[],
    point,
  );
  const interestAllocated = diffSkills(skills, allocatedSkills);
  return { skills: allocatedSkills, interestPoints: point, interestAllocated };
};

export const generateCharacterProfile = async (
  scinarioSet: ScinarioSet,
  playerName: string,
  baseSkills: Skills,
  onProgress?: ProgressCallback,
): Promise<CharacterGenerationResult> => {
  await onProgress?.("能力値生成", 1, TOTAL_STEPS);
  const generated = generateCharacterAbilityScores(playerName);

  const newBaseSkills = {
    ...baseSkills,
    回避: Math.floor(generated.abilityScores.dex / 2),
    母国語: generated.abilityScores.edu,
  };

  await onProgress?.("職業決定", 2, TOTAL_STEPS);
  const generatedJob = await jobOracle(
    scinarioSet,
    generated.basicInfo,
    generated.abilityScores,
  );

  const basicInfo: BasicInfo = {
    ...generated.basicInfo,
    ...generatedJob,
  };

  await onProgress?.("職業技能決定", 3, TOTAL_STEPS);
  const {
    skills: jobSkills,
    jobSkillKeys,
    jobPoints,
    pointCalculation,
    jobAllocated,
  } = await generateJobSkills(
    generated.abilityScores,
    generatedJob.job,
    newBaseSkills,
    scinarioSet,
  );

  await onProgress?.("趣味技能計算", 4, TOTAL_STEPS);
  const {
    skills: completeSkills,
    interestPoints,
    interestAllocated,
  } = generateInterestSkills(jobSkills, generated.abilityScores);

  await onProgress?.("バックストーリー生成", 5, TOTAL_STEPS);
  const { backstory, address, items, money } = await backstoryOracle({
    scinarioSet,
    basicInfo,
    abilityScores: generated.abilityScores,
    jobAllocated,
    interestAllocated,
    skills: completeSkills,
  });

  const newBasicInfo = {
    ...basicInfo,
    address,
  };

  return {
    basicInfo: newBasicInfo,
    abilityScores: generated.abilityScores,
    abilityDetails: generated.details,
    skills: completeSkills,
    backstory,
    equipment: items,
    money: money,
    skillAllocationDetails: {
      jobSkillKeys,
      jobPoints,
      pointCalculation,
      interestPoints,
      jobAllocated,
      interestAllocated,
    },
  };
};
