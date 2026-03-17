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
  generateCharacterAbilityScores,
  mapJobSkillToKey,
} from "./domain";
import {
  backstoryOracle,
  equipmentMoneyOracle,
  jobOracle,
  jobSkillOracle,
} from "./oracles";
import { SKILL_LIST } from "./constants";

export interface CharacterGenerationResult {
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  abilityDetails: AbilityGenerationDetails;
  skills: Skills;
  backstory: string;
  equipment: string[];
  money: number;
}

const ensureCreditSkill = (jobSkills: string[]): string[] =>
  jobSkills.includes("信用") ? jobSkills : [...jobSkills, "信用"];

const generateJobSkills = async (
  abilityScores: AbilityScores,
  job: string,
  skills: Skills,
  scinarioSet: ScinarioSet,
): Promise<Skills> => {
  const result = await jobSkillOracle({ job, skills, scinarioSet });
  const jobSkills = ensureCreditSkill(result.jobSkills);
  const point = calculateJobPoints(abilityScores, result.pointCalculation);

  const mappedSkills = jobSkills
    .map((skill) => mapJobSkillToKey(skill))
    .filter((skill): skill is keyof Skills => skill !== null);

  return allocatePointsWithCap(skills, mappedSkills, point);
};

const generateInterestSkills = (
  skills: Skills,
  abilityScores: AbilityScores,
): Skills => {
  const point = abilityScores.int * 2;
  return allocatePointsWithCap(
    skills,
    [...SKILL_LIST] as (keyof Skills)[],
    point,
  );
};

export const generateCharacterProfile = async (
  scinarioSet: ScinarioSet,
  playerName: string,
  baseSkills: Skills,
): Promise<CharacterGenerationResult> => {
  const generated = generateCharacterAbilityScores(playerName);

  const generatedJob = await jobOracle(
    scinarioSet,
    generated.basicInfo,
    generated.abilityScores,
  );

  const basicInfo: BasicInfo = {
    ...generated.basicInfo,
    ...generatedJob,
  };

  const jobSkills = await generateJobSkills(
    generated.abilityScores,
    generatedJob.job,
    baseSkills,
    scinarioSet,
  );

  const completeSkills = generateInterestSkills(
    jobSkills,
    generated.abilityScores,
  );

  const backstory = (
    await backstoryOracle({
      scinarioSet,
      basicInfo,
      abilityScores: generated.abilityScores,
      skills: completeSkills,
    })
  ).backstory;

  const equipment = await equipmentMoneyOracle(
    scinarioSet,
    backstory,
    completeSkills,
  );

  return {
    basicInfo,
    abilityScores: generated.abilityScores,
    abilityDetails: generated.details,
    skills: completeSkills,
    backstory,
    equipment: equipment.items,
    money: equipment.money,
  };
};
