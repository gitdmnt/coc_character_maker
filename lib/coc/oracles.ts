import { GoogleGenAI } from "@google/genai";
import { AbilityScores, BasicInfo, ScinarioSet, Skills } from "@/types/coc";
import { JOB_LIST } from "./constants";

const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
};

const getGeminiResponse = async (prompt: string): Promise<string> => {
  const genAI = getGenAI();
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text in Gemini response");
  }

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
    throw new Error("Invalid JSON format in Gemini response");
  }

  return text.substring(jsonStart, jsonEnd + 1);
};

export const jobOracle = async (
  scinarioSet: ScinarioSet,
  basicInfo: BasicInfo,
  abilityScores: AbilityScores,
): Promise<{
  name: string;
  job: string;
  address: string;
  hometown: string;
}> => {
  const jobs = [
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
    JOB_LIST[Math.floor(Math.random() * JOB_LIST.length)],
  ];

  const prompt = `
# Role

以下はオリジナルキャラクターの基本情報と能力値です。
キャラクターが${scinarioSet.year}年の${scinarioSet.location}で活躍することを想定して、キャラクターの名前、職業、住所、出身地を提案してください。
職業は、${jobs.join("、")}などの一般的な職業カテゴリを参考に、特定の1つに絞ってください。


# Data

基本情報:
- 年齢: ${basicInfo.age}
- 性別: ${basicInfo.gender}

能力値:
- STR: ${abilityScores.str} / 100
- CON: ${abilityScores.con} / 100
- SIZ: ${abilityScores.siz} / 100
- DEX: ${abilityScores.dex} / 100
- APP: ${abilityScores.app} / 100
- EDU: ${abilityScores.edu} / 100
- INT: ${abilityScores.int} / 100
- POW: ${abilityScores.pow} / 100
- MOV: ${abilityScores.mov} (7ならば低い、8ならば普通、9ならば高い)
- HP: ${abilityScores.hp} (平均的な人間は10程度)
- SAN: ${abilityScores.san}
- MP: ${abilityScores.mp}
- LUCK: ${abilityScores.luck}

# Output

JSON Response APIとして、以下のJSON形式のデータのみを出力してください。
{"reason": "その職業を選んだ簡潔な理由", "name": "キャラクター名", "job": "職業名", "address": "住所", "hometown": "出身地"}
`;

  return JSON.parse(await getGeminiResponse(prompt));
};

export const jobSkillOracle = async ({
  scinarioSet,
  job,
  skills,
}: {
  scinarioSet: ScinarioSet;
  job: string;
  skills: Skills;
}): Promise<{
  jobSkills: string[];
  reason: string;
  pointCalculation: { param: string; weight: number }[];
}> => {
  const prompt = `
# Role

クトゥルフ神話TRPGのキャラクターの職業とスキルリストを入力として、リストの中から職業に適した職業技能を8個提案してください。
ただし、リスト内の「科学」「近接戦闘」「芸術/製作」「サバイバル」「射撃」「操縦」「ほかの言語」にはそれぞれサブジャンルが存在します（「科学(物理学)」や「近接戦闘(格闘)」、「射撃(ライフル/ショットガン)」など）。
これらについては、親ジャンルや「(その他)」ではなく、「科学(物理学)」「ほかの言語(英語)」のように、サブジャンルを職業技能として提案してください。

また、職業技能ポイントの計算方法も提案してください。
基本的な職業はedu×4ポイント、特殊な職業はedu×2+その技能に関係のあるパラメータ×2ポイントが与えられることが多いです。

舞台は${scinarioSet.year}年の${scinarioSet.location}です。

## Data

職業: ${job}

スキルリスト: (スキルの上限値は100)
${Object.entries(skills)
  .map(([skill, _value]) => `- ${skill}`)
  .join("\n")}

パラメータリスト:
- str: 筋力
- con: 体力
- siz: 体格
- dex: 敏捷性
- app: 外見
- edu: 教育
- int: 知性
- pow: 精神力
- luck: 幸運

## Output

JSON Response APIとして、以下のJSON形式のデータのみを出力してください。
{"jobSkills": ["職業技能1", "職業技能2", ..., "職業技能8"], "pointCalculation": [{"param": "パラメータ名", "weight": 重み(重みの合計は4であること)}, ...]}
`;

  return JSON.parse(await getGeminiResponse(prompt));
};

export const backstoryOracle = async ({
  scinarioSet,
  basicInfo,
  abilityScores,
  skills,
}: {
  scinarioSet: ScinarioSet;
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  skills: Skills;
}): Promise<{ backstory: string }> => {
  const prompt = `
# Role

クトゥルフ神話TRPGのキャラクターの基本情報、能力値、スキルリストを入力として、キャラクターがどのような人生を歩んできたかを考察し、キャラクターのバックストーリーを提案してください。
バックストーリーは、キャラクターの過去の出来事や経験、家族構成、性格などを含むことができます。
ただし、バックストーリーには明示的な技能の数値を含めないでください。

舞台は${scinarioSet.year}年の${scinarioSet.location}です。

## Data

基本情報:
- プレイヤー名: ${basicInfo.playerName}
- 年齢: ${basicInfo.age}
- 性別: ${basicInfo.gender}
- 名前: ${basicInfo.name ?? "未設定"}
- 職業: ${basicInfo.job ?? "未設定"}
- 住所: ${basicInfo.address ?? "未設定"}
- 出身地: ${basicInfo.hometown ?? "未設定"}

能力値:
- STR: ${abilityScores.str} / 100
- CON: ${abilityScores.con} / 100
- SIZ: ${abilityScores.siz} / 100
- DEX: ${abilityScores.dex} / 100
- APP: ${abilityScores.app} / 100
- EDU: ${abilityScores.edu} / 100
- INT: ${abilityScores.int} / 100
- POW: ${abilityScores.pow} / 100
- MOV: ${abilityScores.mov} (7ならば低い、8ならば普通、9ならば高い)
- HP: ${abilityScores.hp} (平均的な人間は10程度)
- SAN: ${abilityScores.san}
- MP: ${abilityScores.mp}
- LUCK: ${abilityScores.luck}

スキルリスト: (スキルの上限値は100)
${Object.entries(skills)
  .map(([skill, value]) => `- ${skill}: ${value}`)
  .join("\n")}

## Output

JSON Response APIとして、以下のJSON形式のデータのみを出力してください。
{"backstory": "キャラクターのバックストーリー"}
`;

  return JSON.parse(await getGeminiResponse(prompt));
};

export const equipmentMoneyOracle = async (
  scinarioSet: ScinarioSet,
  backstory: string,
  skills: Skills,
): Promise<{
  items: string[];
  money: number;
}> => {
  const prompt = `
# Role

クトゥルフ神話TRPGのキャラクターのバックストーリーとスキルリストを入力として、そのキャラクターが持っている道具と所持金を提案してください。
舞台は${scinarioSet.year}年の${scinarioSet.location}です。
スキルの信用の値は次のように解釈してください。
- 0: 無一文
- 1-9: 貧乏
- 10-49: 平均
- 50-89: 裕福
- 90-98以上: 富豪
- 99: 大富豪

## Data

バックストーリー: ${backstory}

スキルリスト:
${Object.entries(skills)
  .map(([skill, value]) => `- ${skill}: ${value}`)
  .join("\n")}

## Output

JSON Response APIとして、以下のJSON形式のデータのみを出力してください。
{"items": ["道具1", "道具2", ...], "money": 所持金}
`;

  return JSON.parse(await getGeminiResponse(prompt));
};
