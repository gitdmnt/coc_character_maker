export interface CoCCharacter {
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  skills: Skills;
}

export interface BasicInfo {
  name?: string;
  playerName: string;
  job?: string;
  age: number;
  gender: string;
  address?: string;
  hometown?: string;
}

export interface AbilityScores {
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

export interface Skills {
  威圧: number;
  言いくるめ: number;
  医学: number;
  "運転(自動車)": number;
  "運転(その他)": number;
  応急手当: number;
  オカルト: number;
  隠密: number;
  回避: number;
  "科学(その他)": number;
  鍵開け: number;
  鑑定: number;
  機械修理: number;
  聞き耳: number;
  "近接戦闘(格闘)": number;
  "近接戦闘(その他)": number;
  クトゥルフ神話: number;
  "芸術/製作(その他)": number;
  経理: number;
  考古学: number;
  コンピューター: number;
  "サバイバル(その他)": number;
  自然: number;
  "射撃(拳銃)": number;
  "射撃(ライフル/ショットガン)": number;
  "射撃(その他)": number;
  重機械操作: number;
  信用: number;
  心理学: number;
  人類学: number;
  水泳: number;
  精神分析: number;
  説得: number;
  "操縦(その他)": number;
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
  "ほかの言語(その他)": number;
  母国語: number;
  魅惑: number;
  目星: number;
  歴史: number;
  ダイビング: number;
  "伝承(その他)": number;
  動物使い: number;
  読唇術: number;
  爆破: number;
  ヒプノーシス: number;
  砲: number;
}

export interface ScinarioSet {
  year: number;
  location: string;
}

export interface AbilityGenerationDetails {
  str: number;
  strSource: [number, number, number];
  strAgeOffset: number;
  con: number;
  conSource: [number, number, number];
  conAgeOffset: number;
  siz: number;
  sizSource: [number, number];
  sizAgeOffset: number;
  dex: number;
  dexSource: [number, number, number];
  dexAgeOffset: number;
  app: number;
  appSource: [number, number, number];
  appAgeOffset: number;
  edu: number;
  eduSource: [number, number];
  eduCheckSource: (number | null)[];
  eduAgeOffset: number[];
  int: number;
  intSource: [number, number];
  pow: number;
  powSource: [number, number, number];
  mov: number;
  movAgeOffset: number;
  hp: number;
  san: number;
  mp: number;
  luck: number;
  luckSource: [number, number, number][];
}

export interface GeneratedAbilityResult {
  basicInfo: BasicInfo;
  abilityScores: AbilityScores;
  details: AbilityGenerationDetails;
}
