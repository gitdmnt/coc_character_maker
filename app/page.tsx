import React, { use, useEffect, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { GoogleGenAI } from "@google/genai";

interface CoCCharacter {
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  skills: Skills;
}

interface BasicInfo {
  name: string;
  playerName: string;
  job: string;
  age: number;
  gender: string;
  address: string;
  hometown: string;
}

interface AbilityScores {
  str: number;
  con: number;
  siz: number;
  dex: number;
  app: number;
  edu: number;
  int: number;
  pow: number;
  mov: number;
  hp: number;
  san: number;
  mp: number;
  luck: number;
}

interface Skills {
  威圧: number;
  言いくるめ: number;
  医学: number;
  運転: [string, number][];
  応急手当: number;
  オカルト: number;
  隠密: number;
  回避: number;
  科学: [string, number][];
  鍵開け: number;
  鑑定: number;
  機械修理: number;
  聞き耳: number;
  近接戦闘: [string, number][];
  クトゥルフ神話: number;
  芸術製作: [string, number][];
  経理: number;
  考古学: number;
  コンピューター: number;
  サバイバル: [string, number][];
  自然: number;
  射撃: [string, number][];
  重機械操作: number;
  信用: number;
  心理学: number;
  人類学: number;
  水泳: number;
  精神分析: number;
  説得: number;
  操縦: [string, number][];
  跳躍: number;
  追跡: number;
  手さばき: number;
  電気修理: number;
  電子工学: number;
  投擲: number;
  登攀: number;
  図書館: number;
  ナビゲート: number;
  変装: number;
  法律: number;
  ほかの言語: [string, number][];
  母国語: number;
  魅惑: number;
  目星: number;
  歴史: number;
  ダイビング: number;
  伝承: [string, number][];
  動物使い: number;
  読唇術: number;
  爆破: number;
  ヒプノーシス: number;
  砲: number;
}

interface ScinarioSet {
  year: number;
  location: string;
}

const CoCCharaMaker = () => {
  // meta data
  const [scinarioSetYear, setScinarioSetYear] = useState(
    Temporal.Now.plainDateISO().year,
  );
  const [scinarioSetLocation, setScinarioSetLocation] = useState("日本");

  // 基本情報
  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [job, setJob] = useState("");
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState("");
  const [adress, setAddress] = useState("");
  const [hometown, setHometown] = useState("");

  // 能力値
  // 能力値規約:
  // - xxx: 基本値
  // - xxxSource: 基本値の決定に使用したダイスの出目
  // - xxxAgeOffset: 年齢補正による変動量
  // - 実効値は xxx + xxxAgeOffset で計算される
  // 例: STR = 50, STRSource = [10, 11, 12], STRAgeOffset = -5
  // ただし、EDUにはEDUの上達チェックが存在する。
  // EDUの上達チェックは、EDU' = EDU === null || EDU < EDUCheckSource[i] ? EDU + EDUAgeOffset[i] : EDU をEDUCheckSourceの値の個数だけ繰り返すこと計算される。

  const [str, setStr] = useState(0);
  const [strSource, setStrSource] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [strAgeOffset, setStrAgeOffset] = useState(0);
  const [con, setCon] = useState(0);
  const [conSource, setConSource] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [conAgeOffset, setConAgeOffset] = useState(0);
  const [siz, setSiz] = useState(0);
  const [sizSource, setSizSource] = useState<[number, number]>([0, 0]);
  const [sizAgeOffset, setSizAgeOffset] = useState(0);
  const [dex, setDex] = useState(0);
  const [dexSource, setDexSource] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [dexAgeOffset, setDexAgeOffset] = useState(0);
  const [app, setApp] = useState(0);
  const [appSource, setAppSource] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [appAgeOffset, setAppAgeOffset] = useState(0);
  const [edu, setEdu] = useState(0);
  const [eduSource, setEduSource] = useState<[number, number]>([0, 0]);
  const [eduCheckSource, setEduCheckSource] = useState<(number | null)[]>([]); //d100[]
  const [eduAgeOffset, setEduAgeOffset] = useState<number[]>([]);
  const [int, setInt] = useState(0);
  const [intSource, setIntSource] = useState<[number, number]>([0, 0]);
  const [pow, setPow] = useState(0);
  const [powSource, setPowSource] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [mov, setMov] = useState(0);
  const [movAgeOffset, setMovAgeOffset] = useState(0);
  const [hp, setHp] = useState(0);
  const [san, setSan] = useState(0);
  const [mp, setMp] = useState(0);
  const [luck, setLuck] = useState(0);
  const [luckSource, setLuckSource] = useState<[number, number, number][]>([
    [0, 0, 0],
  ]);

  // 技能値
  const [威圧, set威圧] = useState(15);
  const [言いくるめ, set言いくるめ] = useState(5);
  const [医学, set医学] = useState(1);
  const [運転, set運転] = useState<[string, number][]>([["自動車", 20]]);
  const [応急手当, set応急手当] = useState(30);
  const [オカルト, setオカルト] = useState(5);
  const [隠密, set隠密] = useState(20);
  const [回避, set回避] = useState(0);
  const [科学, set科学] = useState<[string, number][]>([["", 1]]);
  const [鍵開け, set鍵開け] = useState(1);
  const [鑑定, set鑑定] = useState(5);
  const [機械修理, set機械修理] = useState(10);
  const [聞き耳, set聞き耳] = useState(20);
  const [近接先頭, set近接戦闘] = useState<[string, number][]>([["格闘", 25]]);
  const [クトゥルフ神話, setクトゥルフ神話] = useState(0);
  const [芸術製作, set芸術製作] = useState<[string, number][]>([["", 5]]);
  const [経理, set経理] = useState(5);
  const [考古学, set考古学] = useState(1);
  const [コンピューター, setコンピューター] = useState(5);
  const [サバイバル, setサバイバル] = useState<[string, number][]>([["", 10]]);
  const [自然, set自然] = useState(10);
  const [射撃, set射撃] = useState<[string, number][]>([
    ["拳銃", 20],
    ["ライフル/ショットガン", 25],
  ]);
  const [重機械操作, set重機械操作] = useState(1);
  const [信用, set信用] = useState(0);
  const [心理学, set心理学] = useState(10);
  const [人類学, set人類学] = useState(1);
  const [水泳, set水泳] = useState(20);
  const [精神分析, set精神分析] = useState(1);
  const [説得, set説得] = useState(10);
  const [操縦, set操縦] = useState<[string, number][]>([["", 1]]);
  const [跳躍, set跳躍] = useState(20);
  const [追跡, set追跡] = useState(10);
  const [手さばき, set手さばき] = useState(10);
  const [電気修理, set電気修理] = useState(10);
  const [電子工学, set電子工学] = useState(1);
  const [投擲, set投擲] = useState(20);
  const [登攀, set登攀] = useState(20);
  const [図書館, set図書館] = useState(20);
  const [ナビゲート, setナビゲート] = useState(10);
  const [変装, set変装] = useState(5);
  const [法律, set法律] = useState(5);
  const [ほかの言語, setほかの言語] = useState<[string, number][]>([["", 1]]);
  const [母国語, set母国語] = useState(0);
  const [魅惑, set魅惑] = useState(15);
  const [目星, set目星] = useState(25);
  const [歴史, set歴史] = useState(5);
  const [ダイビング, setダイビング] = useState(1);
  const [伝承, set伝承] = useState<[string, number][]>([["", 1]]);
  const [動物使い, set動物使い] = useState(5);
  const [読唇術, set読唇術] = useState(1);
  const [爆破, set爆破] = useState(1);
  const [ヒプノーシス, setヒプノーシス] = useState(1);
  const [砲, set砲] = useState(1);

  // 初期化
  useEffect(() => {
    // 1. 能力値の決定
    // 1.1 年齢の決定
    setAge(randomD100());

    // 1.2 能力値の初期値を決定
    setStrSource(random3D6());
    setStr(sum(strSource) * 5);
    setConSource(random3D6());
    setCon(sum(conSource) * 5);
    setDexSource(random3D6());
    setDex(sum(dexSource) * 5);
    setAppSource(random3D6());
    setApp(sum(appSource) * 5);
    setPowSource(random3D6());
    setPow(sum(powSource) * 5);

    setSizSource(random2D6());
    setSiz((sum(sizSource) + 6) * 5);
    setEduSource(random2D6());
    setEdu((sum(eduSource) + 6) * 5);
    setIntSource(random2D6());
    setInt((sum(intSource) + 6) * 5);

    setLuckSource([random3D6()]);
    setLuck(sum(luckSource[0]) * 5);

    // 1.3 年齢補正
    // (15)-19歳: STRとSIZから合計-5, EDUから-5, 幸運をもう1回振ってよい方を採用
    // 20-39歳:   EDUの上昇チェック1回
    // 40-49歳:   STR/CON/DEXから合計-5, APPから-5, EDUの上昇チェック2回
    // 50-59歳:   STR/CON/DEXから合計-10, APPから-10, EDUの上昇チェック3回
    // 60-69歳:   STR/CON/DEXから合計-20, APPから-15, EDUの上昇チェック4回
    // 70-79歳:   STR/CON/DEXから合計-40, APPから-20, EDUの上昇チェック4回
    // 80-(89)歳: STR/CON/DEXから合計-80, APPから-40, EDUの上昇チェック4回
    if (age <= 19) {
      const offsetArray = randomArrayWithSum(2, 5);
      setStrAgeOffset(-offsetArray[0]);
      setSizAgeOffset(offsetArray[1]);
      setEduCheckSource([null]);
      setEduAgeOffset([-5]);
      const newLuckSource = random3D6();
      setLuckSource((prev) => [...prev, newLuckSource]);
      setLuck((prev) => Math.max(prev, sum(newLuckSource) * 5));
    } else if (age <= 39) {
      setEduCheckSource([randomD100()]);
      setEduAgeOffset([randomD10()]);
    } else if (age <= 49) {
      const offsetArray = randomArrayWithSum(3, 5);
      setStrAgeOffset(-offsetArray[0]);
      setConAgeOffset(-offsetArray[1]);
      setDexAgeOffset(-offsetArray[2]);
      setAppAgeOffset(-5);
      setEduCheckSource([randomD100(), randomD100()]);
      setEduAgeOffset([randomD10(), randomD10()]);
    } else if (age <= 59) {
      const offsetArray = randomArrayWithSum(3, 10);
      setStrAgeOffset(-offsetArray[0]);
      setConAgeOffset(-offsetArray[1]);
      setDexAgeOffset(-offsetArray[2]);
      setAppAgeOffset(-10);
      setEduCheckSource([randomD100(), randomD100(), randomD100()]);
      setEduAgeOffset([randomD10(), randomD10(), randomD10()]);
    } else if (age <= 69) {
      const offsetArray = randomArrayWithSum(3, 20);
      setStrAgeOffset(-offsetArray[0]);
      setConAgeOffset(-offsetArray[1]);
      setDexAgeOffset(-offsetArray[2]);
      setAppAgeOffset(-15);
      setEduCheckSource([
        randomD100(),
        randomD100(),
        randomD100(),
        randomD100(),
      ]);
      setEduAgeOffset([randomD10(), randomD10(), randomD10(), randomD10()]);
    } else if (age <= 79) {
      const offsetArray = randomArrayWithSum(3, 40);
      setStrAgeOffset(-offsetArray[0]);
      setConAgeOffset(-offsetArray[1]);
      setDexAgeOffset(-offsetArray[2]);
      setAppAgeOffset(-20);
      setEduCheckSource([
        randomD100(),
        randomD100(),
        randomD100(),
        randomD100(),
      ]);
      setEduAgeOffset([randomD10(), randomD10(), randomD10(), randomD10()]);
    } else {
      const offsetArray = randomArrayWithSum(3, 80);
      setStrAgeOffset(-offsetArray[0]);
      setConAgeOffset(-offsetArray[1]);
      setDexAgeOffset(-offsetArray[2]);
      setAppAgeOffset(-40);
      setEduCheckSource([
        randomD100(),
        randomD100(),
        randomD100(),
        randomD100(),
      ]);
      setEduAgeOffset([randomD10(), randomD10(), randomD10(), randomD10()]);
    }

    // 2. 能力値から決まる値の計算
    setSan(pow);
    setMp(Math.floor(pow / 5));
    setHp(Math.floor((con + conAgeOffset + siz + sizAgeOffset) / 10));

    // 3. Movの決定
    // 3.1 基本的なMovの決定
    const effectiveDex = dex + dexAgeOffset;
    const effectiveStr = str + strAgeOffset;
    const effectiveSiz = siz + sizAgeOffset;
    if (effectiveDex < effectiveSiz && effectiveStr < effectiveSiz) {
      setMov(7);
    } else if (effectiveDex > effectiveSiz && effectiveStr > effectiveSiz) {
      setMov(9);
    } else {
      setMov(8);
    }
    // 3.2 年齢補正によるMovの変動
    if (age <= 40 && age < 50) {
      setMovAgeOffset(-1);
    } else if (age <= 50 && age < 60) {
      setMovAgeOffset(-2);
    } else if (age <= 60 && age < 70) {
      setMovAgeOffset(-3);
    } else if (age <= 70 && age < 80) {
      setMovAgeOffset(-4);
    } else if (age <= 80) {
      setMovAgeOffset(-5);
    }
  }, []);

  return (
    <div>
      <h1>CoCキャラメーカー</h1>
      <p>CoCのキャラクターを作成するためのツールです。</p>
    </div>
  );
};

// helper functions
const randomD6 = () => Math.floor(Math.random() * 6) + 1;
const random2D6 = (): [number, number] => [randomD6(), randomD6()];
const random3D6 = (): [number, number, number] => [
  randomD6(),
  randomD6(),
  randomD6(),
];
const randomD10 = () => Math.floor(Math.random() * 10) + 1;
const randomD100 = () => Math.floor(Math.random() * 100) + 1;

const randomArrayWithSum = (length: number, sum: number): number[] => {
  if (length <= 0) return [];
  if (length === 1) return [sum];

  const cuts = Array.from({ length: length - 1 }, () =>
    Math.floor(Math.random() * (sum + 1)),
  );
  cuts.sort((a, b) => a - b);

  const result: number[] = [];
  let prev = 0;
  for (const cut of cuts) {
    result.push(cut - prev);
    prev = cut;
  }
  result.push(sum - prev);
  return result;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

// Gemini API function

// 1. API Consoleで利用可能な範囲を無料枠に限定していること
// 2. このサービス自体にログイン機能を持たせないこと
// 3. serverless functionに陰蔽しても結局それ経由で生のLLMを呼び出すだけになること
// という理由から、APIキーはフロントエンドに直接埋め込む形で利用することとする。

const API_KEY =
  "PlzDoNotUseThisKey_AIzaSyCp_Wa5cJn3RA5A4w6Gqhn64AEBf-_Yf5k_PlzDoNotUseThisKey";
const genAI = new GoogleGenAI({ apiKey: API_KEY });

const getGeminiResponse = async (prompt: string): Promise<string> => {
  const response = await genAI.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
  });
  return response.text ?? "error: no text in response";
};

const jobOracle = async (
  scinarioSet: ScinarioSet,
  basicInfo: BasicInfo,
  AbilityScores: AbilityScores,
): Promise<string> => {
  const prompt = `

# Role

以下はクトゥルフ神話TRPGのキャラクターの基本情報と能力値です。
キャラクターが${scinarioSet.year}年の${scinarioSet.location}で活躍することを想定して、キャラクターの職業を提案してください。
職業は、キャラクターの基本情報と能力値に基づいて、キャラクターがどのような職業に就いている可能性が高いかを考慮して提案してください。
職業は、現実世界の職業や、クトゥルフ神話TRPGの世界観に存在する職業など、幅広い範囲から提案してください。

# Data

基本情報:
- 名前: ${basicInfo.name}
- プレイヤー名: ${basicInfo.playerName}
- 年齢: ${basicInfo.age}
- 性別: ${basicInfo.gender}
- 住所: ${basicInfo.address}
- 出身地: ${basicInfo.hometown}

能力値:
- STR: ${AbilityScores.str} / 100
- CON: ${AbilityScores.con} / 100
- SIZ: ${AbilityScores.siz} / 100
- DEX: ${AbilityScores.dex} / 100
- APP: ${AbilityScores.app} / 100
- EDU: ${AbilityScores.edu} / 100
- INT: ${AbilityScores.int} / 100
- POW: ${AbilityScores.pow} / 100
- MOV: ${AbilityScores.mov} (7ならば低い、8ならば普通、9ならば高い)
- HP: ${AbilityScores.hp} (平均的な人間は10程度)
- SAN: ${AbilityScores.san} 
- MP: ${AbilityScores.mp}
- LUCK: ${AbilityScores.luck}

# Output

以下のJSON形式で、キャラクターの職業を提案してください。
\`\`\`
{"job": "職業名"}
\`\`\`

`;

  return await getGeminiResponse(prompt);
};

export default CoCCharaMaker;
