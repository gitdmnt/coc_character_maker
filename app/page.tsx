"use client";

import React, { useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { AbilityScoreRow } from "@/components/coc/AbilityScoreRow";
import { EduScoreRow } from "@/components/coc/EduScoreRow";
import { InputField } from "@/components/coc/InputField";
import { LuckScoreRow } from "@/components/coc/LuckScoreRow";
import { SkillRow } from "@/components/coc/SkillRow";
import { Donate } from "@/components/Donate";
import { createInitialSkills, SKILL_CATEGORIES } from "@/lib/coc/constants";
import { AbilityGenerationDetails, BasicInfo, Skills } from "@/types/coc";
import { DiceRollResult, diceRoll1D100, eduCheck } from "@/lib/coc/domain";
import type {
  CharacterGenerationResult,
  SkillAllocationDetails,
} from "@/lib/coc/generateCharacter";

// ─── 型 ────────────────────────────────────────────────────────────────────

type GenerateApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: string;
  };
};

// SSEイベント型
type SseTaskStart = {
  type: "taskStart";
  step: string;
  index: number;
  total: number;
};
type SseTaskEnd = {
  type: "taskEnd";
  step: string;
  index: number;
  total: number;
  durationMs: number;
};
type SseError = {
  type: "error";
  code: string;
  message: string;
  requestId: string;
};
type SseResult = { type: "result" } & CharacterGenerationResult;
type SseEvent = SseTaskStart | SseTaskEnd | SseError | SseResult;

type GenerationProgress = { step: string; index: number; total: number };

type ScenarioSet = {
  year: number;
  location: string;
};

type CharacterExport = {
  version: "1";
  basicInfo: BasicInfo;
  abilityDetails: AbilityGenerationDetails;
  skills: Skills;
  skillAllocationDetails?: SkillAllocationDetails;
  backstory?: string;
  equipment?: string[];
  money?: number;
  scenarioSet: ScenarioSet;
};

type CcfoliaStatus = { label: string; value: number; max: number };
type CcfoliaParam = { label: string; value: string };
type CcfoliaCharacter = {
  kind: "character";
  data: {
    name: string;
    initiative: number;
    externalUrl: string;
    iconUrl: string;
    commands: string;
    status: CcfoliaStatus[];
    params: CcfoliaParam[];
  };
};

// ─── 初期値 ─────────────────────────────────────────────────────────────────

const createEmptyAbilityDetails = (): AbilityGenerationDetails => ({
  str: 0,
  strSource: [0, 0, 0],
  strAgeOffset: 0,
  con: 0,
  conSource: [0, 0, 0],
  conAgeOffset: 0,
  siz: 0,
  sizSource: [0, 0],
  sizAgeOffset: 0,
  dex: 0,
  dexSource: [0, 0, 0],
  dexAgeOffset: 0,
  app: 0,
  appSource: [0, 0, 0],
  appAgeOffset: 0,
  edu: 0,
  eduSource: [0, 0],
  eduCheckSource: [],
  eduAgeOffset: [],
  int: 0,
  intSource: [0, 0],
  pow: 0,
  powSource: [0, 0, 0],
  mov: 0,
  movAgeOffset: 0,
  hp: 0,
  san: 0,
  mp: 0,
  luck: 0,
  luckSource: [[0, 0, 0]],
});

const toOptional = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value;

// ─── サブコンポーネント ────────────────────────────────────────────────────

type StatCardProps = { label: string; value: number };

const StatCard = ({ label, value }: StatCardProps) => (
  <div
    className="flex flex-col items-center border-2 border-black bg-white px-2 py-1.5
      hover:-translate-x-px hover:-translate-y-px
      hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
      transition-all duration-150 group"
  >
    <span className="text-[10px] font-black tracking-widest bg-black text-white px-1.5 w-full text-center mb-1">
      {label}
    </span>
    <span className="text-xl font-black tabular-nums group-hover:animate-[popIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      {value}
    </span>
  </div>
);

// ─── メインコンポーネント ─────────────────────────────────────────────────

const CoCCharaMaker = () => {
  const currentYear = Temporal.Now.plainDateISO().year;
  const importFileRef = useRef<HTMLInputElement>(null);

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    playerName: "",
    age: 0,
    gender: "",
  });
  const [scenarioSet, setScenarioSet] = useState<ScenarioSet>({
    year: currentYear,
    location: "日本",
  });
  const [abilityDetails, setAbilityDetails] =
    useState<AbilityGenerationDetails>(createEmptyAbilityDetails());
  const [skills, setSkills] = useState<Skills>(createInitialSkills());
  const [skillAllocationDetails, setSkillAllocationDetails] =
    useState<SkillAllocationDetails | null>(null);
  const [skillEditMode, setSkillEditMode] = useState(false);
  const [backstory, setBackstory] = useState<string | undefined>(undefined);
  const [equipment, setEquipment] = useState<string[] | undefined>(undefined);
  const [money, setMoney] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [bonusDice, setBonusDice] = useState(0);
  const [diceResult, setDiceResult] = useState<DiceRollResult | null>(null);

  // ─── API ──────────────────────────────────────────────────────────────────

  const generateCharacter = async () => {
    setErrorMessage(undefined);
    setIsGenerating(true);
    setGenerationProgress(null);

    const ts = () =>
      new Date().toLocaleTimeString("ja-JP", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: basicInfo.playerName,
          year: scenarioSet.year,
          location: scenarioSet.location,
        }),
      });

      // バリデーションエラーは通常のJSONで返ってくる
      if (!response.ok) {
        const payload = (await response.json()) as GenerateApiError;
        setErrorMessage(
          "error" in payload
            ? `${payload.error.message} (code: ${payload.error.code}, request: ${payload.error.requestId})`
            : `サーバーエラーが発生しました (HTTP ${response.status})`,
        );
        return;
      }

      if (!response.body) {
        setErrorMessage("ストリームが利用できません");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.startsWith("data: ") ? chunk.slice(6) : chunk;
          if (!line.trim()) continue;

          const event = JSON.parse(line) as SseEvent;

          if (event.type === "taskStart") {
            setGenerationProgress({
              step: event.step,
              index: event.index,
              total: event.total,
            });
            console.log(
              `${ts()} ▶ [${event.index}/${event.total}] ${event.step}`,
            );
          } else if (event.type === "taskEnd") {
            console.log(
              `${ts()} ✓ [${event.index}/${event.total}] ${event.step} (${event.durationMs}ms)`,
            );
          } else if (event.type === "result") {
            setBasicInfo(event.basicInfo);
            setAbilityDetails(event.abilityDetails);
            setSkills(event.skills);
            setSkillAllocationDetails(event.skillAllocationDetails);
            setBackstory(event.backstory);
            setEquipment(event.equipment);
            setMoney(event.money);
          } else if (event.type === "error") {
            setErrorMessage(
              `${event.message} (code: ${event.code}, request: ${event.requestId})`,
            );
          }
        }

        if (done) break;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ネットワークまたはブラウザ実行環境でエラーが発生しました",
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  // ─── JSON エクスポート ───────────────────────────────────────────────────

  // ─── スキル割り振り編集 ──────────────────────────────────────────────────

  const initialSkills = createInitialSkills();

  const getBaseSkillValue = (skill: keyof Skills): number => {
    if (!skillAllocationDetails) return initialSkills[skill];
    const jobAllocated = skillAllocationDetails.jobAllocated[skill] ?? 0;
    const interestAllocated =
      skillAllocationDetails.interestAllocated[skill] ?? 0;
    return skills[skill] - jobAllocated - interestAllocated;
  };

  const usedJobPoints = skillAllocationDetails
    ? Object.values(skillAllocationDetails.jobAllocated).reduce(
        (a, b) => a + (b ?? 0),
        0,
      )
    : 0;
  const usedInterestPoints = skillAllocationDetails
    ? Object.values(skillAllocationDetails.interestAllocated).reduce(
        (a, b) => a + (b ?? 0),
        0,
      )
    : 0;

  const handleJobAllocatedChange = (skill: keyof Skills, newVal: number) => {
    if (!skillAllocationDetails) return;
    const base = getBaseSkillValue(skill);
    const currInterest = skillAllocationDetails.interestAllocated[skill] ?? 0;
    const newTotal = base + newVal + currInterest;
    if (newTotal > 90) return;
    const oldVal = skillAllocationDetails.jobAllocated[skill] ?? 0;
    if (usedJobPoints - oldVal + newVal > skillAllocationDetails.jobPoints)
      return;
    const newAllocated = {
      ...skillAllocationDetails.jobAllocated,
      [skill]: newVal,
    };
    setSkillAllocationDetails({
      ...skillAllocationDetails,
      jobAllocated: newAllocated,
    });
    setSkills((prev) => ({ ...prev, [skill]: newTotal }));
  };

  const handleInterestAllocatedChange = (
    skill: keyof Skills,
    newVal: number,
  ) => {
    if (!skillAllocationDetails) return;
    const base = getBaseSkillValue(skill);
    const currJob = skillAllocationDetails.jobAllocated[skill] ?? 0;
    const newTotal = base + currJob + newVal;
    if (newTotal > 90) return;
    const oldVal = skillAllocationDetails.interestAllocated[skill] ?? 0;
    if (
      usedInterestPoints - oldVal + newVal >
      skillAllocationDetails.interestPoints
    )
      return;
    const newAllocated = {
      ...skillAllocationDetails.interestAllocated,
      [skill]: newVal,
    };
    setSkillAllocationDetails({
      ...skillAllocationDetails,
      interestAllocated: newAllocated,
    });
    setSkills((prev) => ({ ...prev, [skill]: newTotal }));
  };

  // ─── ダイスロール ────────────────────────────────────────────────────────

  const handleRollDice = (
    skillName: string,
    goal: number,
    bonus: number,
  ): DiceRollResult => {
    const rng = Math.random;
    const result = diceRoll1D100(rng, bonus, goal);
    console.log(
      `ダイスロール: skill=${skillName}, goal=${goal}, bonus=${bonus}, result=${result.total})`,
    );
    setSelectedSkill(skillName);
    setDiceResult(result);
    return result;
  };

  // ─── JSON エクスポート ───────────────────────────────────────────────────

  const exportCharacter = () => {
    const data: CharacterExport = {
      version: "1",
      basicInfo,
      abilityDetails,
      skills,
      skillAllocationDetails: skillAllocationDetails ?? undefined,
      backstory,
      equipment,
      money,
      scenarioSet,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coc_${basicInfo.name ?? "character"}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── ココフォリア エクスポート ───────────────────────────────────────────

  const exportCcfolia = () => {
    const str = abilityDetails.str + abilityDetails.strAgeOffset;
    const con = abilityDetails.con + abilityDetails.conAgeOffset;
    const siz = abilityDetails.siz + abilityDetails.sizAgeOffset;
    const dex = abilityDetails.dex + abilityDetails.dexAgeOffset;
    const app = abilityDetails.app + abilityDetails.appAgeOffset;
    const int_ = abilityDetails.int;
    const pow = abilityDetails.pow;
    const edu = abilityDetails.edu;
    const mov = abilityDetails.mov + abilityDetails.movAgeOffset;

    const skillCommands = (Object.entries(skills) as [keyof Skills, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => `CC<=${value} 【${name}】`)
      .join("\n");

    const commands = [
      `1d100<={SAN} 【正気度ロール】`,
      `CC<=${int_} 【アイデア】`,
      `CC<={幸運} 【幸運】`,
      `CC<=${edu} 【知識】`,
      skillCommands,
      `1d3+0 【ダメージ判定】`,
      `1d4+0 【ダメージ判定】`,
      `1d6+0 【ダメージ判定】`,
      `CC<={STR}　【STR】`,
      `CC<={CON}　【CON】`,
      `CC<={POW}　【POW】`,
      `CC<={DEX}　【DEX】`,
      `CC<={APP}　【APP】`,
      `CC<={SIZ}　【SIZ】`,
      `CC<={INT}　【INT】`,
      `CC<={EDU}　【EDU】`,
    ].join("\n");

    const rawJson: CharacterExport = {
      version: "1",
      basicInfo,
      abilityDetails,
      skills,
      backstory,
      equipment,
      money,
      scenarioSet,
    };

    const ccfolia: CcfoliaCharacter = {
      kind: "character",
      data: {
        name: basicInfo.name ?? "新たな探索者",
        initiative: dex,
        externalUrl: JSON.stringify(rawJson),
        iconUrl: "",
        commands,
        status: [
          { label: "HP", value: abilityDetails.hp, max: abilityDetails.hp },
          { label: "MP", value: abilityDetails.mp, max: abilityDetails.mp },
          { label: "SAN", value: abilityDetails.san, max: abilityDetails.san },
          {
            label: "幸運",
            value: abilityDetails.luck,
            max: abilityDetails.luck,
          },
        ],
        params: [
          { label: "STR", value: String(str) },
          { label: "CON", value: String(con) },
          { label: "POW", value: String(pow) },
          { label: "DEX", value: String(dex) },
          { label: "APP", value: String(app) },
          { label: "SIZ", value: String(siz) },
          { label: "INT", value: String(int_) },
          { label: "EDU", value: String(edu) },
          { label: "MOV", value: String(mov) },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(ccfolia)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccfolia_${basicInfo.name ?? "character"}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── JSON インポート ─────────────────────────────────────────────────────

  const applyOwnFormat = (data: Partial<CharacterExport>) => {
    if (data.basicInfo) setBasicInfo(data.basicInfo);
    if (data.abilityDetails) setAbilityDetails(data.abilityDetails);
    if (data.skills) setSkills(data.skills);
    if (data.skillAllocationDetails !== undefined)
      setSkillAllocationDetails(data.skillAllocationDetails ?? null);
    if (data.backstory !== undefined) setBackstory(data.backstory);
    if (data.equipment !== undefined) setEquipment(data.equipment);
    if (data.money !== undefined) setMoney(data.money);
    if (data.scenarioSet) setScenarioSet(data.scenarioSet);
  };

  const importFromCcfolia = (ccfolia: CcfoliaCharacter) => {
    // externalUrl に埋め込んだ rawJSON から完全復元を試みる
    try {
      const embedded = JSON.parse(
        ccfolia.data.externalUrl,
      ) as Partial<CharacterExport>;
      if (embedded.version === "1") {
        applyOwnFormat(embedded);
        return;
      }
    } catch {
      // externalUrl が URL などの場合はフォールスルー
    }

    // ベストエフォート: params / status / commands から復元
    const paramsMap = Object.fromEntries(
      (ccfolia.data.params ?? []).map((p) => [p.label, Number(p.value)]),
    );
    const statusMap = Object.fromEntries(
      (ccfolia.data.status ?? []).map((s) => [s.label, s.value]),
    );

    setBasicInfo((prev) => ({
      ...prev,
      name:
        ccfolia.data.name !== "新たな探索者" ? ccfolia.data.name : prev.name,
    }));

    setAbilityDetails((prev) => ({
      ...prev,
      str: paramsMap["STR"] ?? prev.str,
      strSource: [0, 0, 0],
      strAgeOffset: 0,
      con: paramsMap["CON"] ?? prev.con,
      conSource: [0, 0, 0],
      conAgeOffset: 0,
      siz: paramsMap["SIZ"] ?? prev.siz,
      sizSource: [0, 0],
      sizAgeOffset: 0,
      dex: paramsMap["DEX"] ?? prev.dex,
      dexSource: [0, 0, 0],
      dexAgeOffset: 0,
      app: paramsMap["APP"] ?? prev.app,
      appSource: [0, 0, 0],
      appAgeOffset: 0,
      edu: paramsMap["EDU"] ?? prev.edu,
      eduSource: [0, 0],
      eduCheckSource: [],
      eduAgeOffset: [],
      int: paramsMap["INT"] ?? prev.int,
      intSource: [0, 0],
      pow: paramsMap["POW"] ?? prev.pow,
      powSource: [0, 0, 0],
      mov: paramsMap["MOV"] ?? prev.mov,
      movAgeOffset: 0,
      hp: statusMap["HP"] ?? prev.hp,
      mp: statusMap["MP"] ?? prev.mp,
      san: statusMap["SAN"] ?? prev.san,
      luck: statusMap["幸運"] ?? prev.luck,
      luckSource: [[0, 0, 0]],
    }));

    // commands の "CC<=数値 【技能名】" 行を解析してスキルを復元
    if (ccfolia.data.commands) {
      const newSkills = createInitialSkills();
      for (const line of ccfolia.data.commands.split("\n")) {
        const m = line.match(/CC<=(\d+)\s*【(.+?)】/);
        if (m && m[2] in newSkills) {
          newSkills[m[2] as keyof Skills] = Number(m[1]);
        }
      }
      setSkills(newSkills);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as
          | Partial<CharacterExport>
          | CcfoliaCharacter;

        if ("kind" in parsed && parsed.kind === "character") {
          importFromCcfolia(parsed);
        } else {
          applyOwnFormat(parsed as Partial<CharacterExport>);
        }
        setErrorMessage(undefined);
      } catch {
        setErrorMessage("JSONファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── レンダー ────────────────────────────────────────────────────────────

  const btnClass =
    "px-4 py-2 text-sm font-black border-2 border-black bg-white " +
    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] " +
    "hover:-translate-x-0.5 hover:-translate-y-0.5 " +
    "hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] " +
    "active:translate-x-0.5 active:translate-y-0.5 " +
    "active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] " +
    "transition-all duration-150";

  return (
    <div className="min-h-screen bg-[#fffbf0] p-4 md:p-8 font-mono flex flex-col gap-6">
      {/* ===== ヘッダー ===== */}
      <header className="flex flex-wrap items-start justify-between gap-4 animate-[fadeSlideIn_0.4s_ease-out_both]">
        <div className="flex flex-col items-start gap-1">
          <div className="inline-block bg-yellow-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-5 py-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              ⚰️ CoCキャラメーカー
            </h1>
          </div>
          <p className="text-xs font-bold text-gray-600 ml-1">
            クトゥルフ神話TRPG キャラクター自動生成ツール
          </p>
        </div>

        {/* エクスポート / インポート */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCharacter} className={btnClass}>
            📤 エクスポート
          </button>
          <button
            type="button"
            onClick={exportCcfolia}
            className={`${btnClass} bg-[#e8f4fd]!`}
          >
            🎲 ドリームメーカー書き出し
          </button>
          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            className={btnClass}
          >
            📥 インポート
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </header>

      {/* ===== 生成ボタン + シナリオ舞台 ===== */}
      <div className="flex flex-wrap gap-4 animate-[fadeSlideIn_0.4s_0.05s_ease-out_both]">
        {/* 生成ボタン */}
        <div className="flex flex-col justify-center h-full">
          <button
            type="button"
            onClick={generateCharacter}
            disabled={isGenerating}
            className={`
              px-6 py-3 text-lg font-black border-4 border-black
              transition-all duration-150 cursor-pointer h-full
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isGenerating
                  ? "bg-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse-border"
                  : "bg-[#ff6b6b] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:animate-wiggle"
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 border-4 border-black border-t-transparent rounded-full"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
                生成中...
              </span>
            ) : (
              "🎲 キャラクターを生成"
            )}
          </button>
        </div>

        {/* シナリオ舞台 */}
        <div className="flex-1 min-w-60 bg-[#fffde7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-5 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest mb-2 border-b-2 border-black pb-1">
            📍 シナリオ舞台
          </h2>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black">年</label>
              <input
                type="number"
                value={scenarioSet.year}
                min={1900}
                max={2300}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed))
                    setScenarioSet((prev) => ({ ...prev, year: parsed }));
                }}
                className="w-20 border-2 border-black px-2 py-1 text-sm font-mono bg-white
                  focus:outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                  transition-all duration-150"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black">地域</label>
              <input
                type="text"
                value={scenarioSet.location}
                onChange={(e) =>
                  setScenarioSet((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                className="w-32 border-2 border-black px-2 py-1 text-sm font-mono bg-white
                  focus:outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                  transition-all duration-150"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== プログレスバー ===== */}
      {generationProgress && (
        <div className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 animate-[fadeSlideIn_0.2s_ease-out_both]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black">
              ⚙️ {generationProgress.step}
            </span>
            <span className="text-xs font-bold text-gray-600 tabular-nums">
              {generationProgress.index} / {generationProgress.total}
            </span>
          </div>
          {/* バー */}
          <div className="w-full h-5 border-2 border-black bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#ff6b6b] border-r-2 border-black transition-all duration-300"
              style={{
                width: `${(generationProgress.index / generationProgress.total) * 100}%`,
              }}
            />
          </div>
          {/* ステップドット */}
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: generationProgress.total }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 border border-black transition-all duration-300 ${
                  i < generationProgress.index
                    ? "bg-[#ff6b6b]"
                    : i === generationProgress.index - 1
                      ? "bg-[#ff6b6b] animate-pulse"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== エラー表示 ===== */}
      {errorMessage && (
        <div className="p-3 bg-red-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-shake">
          <p className="font-black text-sm">⚠️ {errorMessage}</p>
        </div>
      )}

      {/* ===== 基本情報 + 能力値（コンパクト） ===== */}
      <div className="flex flex-row flex-wrap gap-4 animate-[fadeSlideIn_0.4s_0.1s_ease-out_both]">
        {/* 基本情報 */}
        <section className="bg-[#b5ead7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex-1 min-w-72">
          <h2 className="text-sm font-black uppercase tracking-widest mb-3 pb-1.5 border-b-2 border-black">
            📋 基本情報
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <InputField
              label="PL名"
              value={basicInfo.playerName}
              onChange={(v) => setBasicInfo((p) => ({ ...p, playerName: v }))}
            />
            <InputField
              label="年齢"
              value={String(basicInfo.age)}
              onChange={(v) => {
                const n = Number(v);
                setBasicInfo((p) => ({ ...p, age: Number.isNaN(n) ? 0 : n }));
              }}
            />
            <InputField
              label="性別"
              value={basicInfo.gender}
              onChange={(v) => setBasicInfo((p) => ({ ...p, gender: v }))}
            />
            <InputField
              label="名前"
              value={basicInfo.name ?? ""}
              onChange={(v) =>
                setBasicInfo((p) => ({ ...p, name: toOptional(v) }))
              }
            />
            <InputField
              label="住所"
              value={basicInfo.address ?? ""}
              onChange={(v) =>
                setBasicInfo((p) => ({ ...p, address: toOptional(v) }))
              }
            />
            <InputField
              label="出身地"
              value={basicInfo.hometown ?? ""}
              onChange={(v) =>
                setBasicInfo((p) => ({ ...p, hometown: toOptional(v) }))
              }
            />
            <div className="col-span-2">
              <InputField
                label="職業"
                value={basicInfo.job ?? ""}
                onChange={(v) =>
                  setBasicInfo((p) => ({ ...p, job: toOptional(v) }))
                }
              />
            </div>
          </div>
        </section>

        {/* 能力値（コンパクトグリッド） */}
        <section className="flex flex-col gap-3 bg-[#c7b3f8] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex-1 min-w-72">
          <h2 className="text-sm font-black uppercase tracking-widest pb-1.5 border-b-2 border-black">
            🎯 能力値
          </h2>
          {/* 主要能力値グリッド */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {[
              {
                label: "STR",
                base: abilityDetails.str,
                ageOffset: abilityDetails.strAgeOffset,
              },
              {
                label: "CON",
                base: abilityDetails.con,
                ageOffset: abilityDetails.conAgeOffset,
              },
              {
                label: "SIZ",
                base: abilityDetails.siz,
                ageOffset: abilityDetails.sizAgeOffset,
              },
              {
                label: "DEX",
                base: abilityDetails.dex,
                ageOffset: abilityDetails.dexAgeOffset,
              },
              {
                label: "APP",
                base: abilityDetails.app,
                ageOffset: abilityDetails.appAgeOffset,
              },
              { label: "INT", base: abilityDetails.int, ageOffset: 0 },
              { label: "POW", base: abilityDetails.pow, ageOffset: 0 },
              {
                label: "EDU",
                base: eduCheck(
                  abilityDetails.edu,
                  abilityDetails.eduCheckSource,
                  abilityDetails.eduAgeOffset,
                ),
                ageOffset: 0,
              },
              { label: "LUCK", base: abilityDetails.luck, ageOffset: 0 },
              {
                label: "MOV",
                base: abilityDetails.mov,
                ageOffset: abilityDetails.movAgeOffset,
              },
            ].map(({ label, base, ageOffset }) => (
              <div
                onClick={() =>
                  label !== "MOV" &&
                  handleRollDice(label, base + ageOffset, bonusDice)
                }
                key={label}
                className="cursor-pointer"
              >
                <StatCard key={label} label={label} value={base + ageOffset} />
              </div>
            ))}
          </div>
          {/* 重要ステータス */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className="col-span-1 flex flex-col items-center border-2 border-black bg-yellow-300 px-2 py-1.5"
              onClick={() =>
                handleRollDice("SAN", abilityDetails.san, bonusDice)
              }
            >
              <span className="text-[10px] font-black tracking-widest bg-black text-white px-1.5 w-full text-center mb-1">
                SAN
              </span>
              <span className="text-xl font-black tabular-nums">
                {abilityDetails.san}
              </span>
            </div>
            <div className="col-span-1 flex flex-col items-center border-2 border-black bg-yellow-300 px-2 py-1.5">
              <span className="text-[10px] font-black tracking-widest bg-black text-white px-1.5 w-full text-center mb-1">
                HP
              </span>
              <span className="text-xl font-black tabular-nums">
                {abilityDetails.hp}
              </span>
            </div>
            <div className="col-span-1 flex flex-col items-center border-2 border-black bg-yellow-300 px-2 py-1.5">
              <span className="text-[10px] font-black tracking-widest bg-black text-white px-1.5 w-full text-center mb-1">
                MP
              </span>
              <span className="text-xl font-black tabular-nums">
                {abilityDetails.mp}
              </span>
            </div>
          </div>
          {/* 出目詳細（折りたたみ） */}
          <details className="group">
            <summary className="text-xs font-black cursor-pointer select-none hover:underline text-gray-600">
              ▶ 出目詳細を表示
            </summary>
            <div className="mt-2 flex flex-col text-xs border-t-2 border-black pt-2 space-y-0.5">
              <AbilityScoreRow
                label="STR"
                score={abilityDetails.str}
                source={abilityDetails.strSource}
                ageOffset={abilityDetails.strAgeOffset}
              />
              <AbilityScoreRow
                label="CON"
                score={abilityDetails.con}
                source={abilityDetails.conSource}
                ageOffset={abilityDetails.conAgeOffset}
              />
              <AbilityScoreRow
                label="SIZ"
                score={abilityDetails.siz}
                source={abilityDetails.sizSource}
                ageOffset={abilityDetails.sizAgeOffset}
              />
              <AbilityScoreRow
                label="DEX"
                score={abilityDetails.dex}
                source={abilityDetails.dexSource}
                ageOffset={abilityDetails.dexAgeOffset}
              />
              <AbilityScoreRow
                label="APP"
                score={abilityDetails.app}
                source={abilityDetails.appSource}
                ageOffset={abilityDetails.appAgeOffset}
              />
              <EduScoreRow
                label="EDU"
                score={abilityDetails.edu}
                source={abilityDetails.eduSource}
                checkSource={abilityDetails.eduCheckSource}
                ageOffset={abilityDetails.eduAgeOffset}
              />
              <AbilityScoreRow
                label="INT"
                score={abilityDetails.int}
                source={abilityDetails.intSource}
              />
              <AbilityScoreRow
                label="POW"
                score={abilityDetails.pow}
                source={abilityDetails.powSource}
              />
              <AbilityScoreRow
                label="MOV"
                score={abilityDetails.mov}
                ageOffset={abilityDetails.movAgeOffset}
              />
              <AbilityScoreRow label="HP" score={abilityDetails.hp} />
              <AbilityScoreRow label="SAN" score={abilityDetails.san} />
              <AbilityScoreRow label="MP" score={abilityDetails.mp} />
              <LuckScoreRow
                label="LUCK"
                score={abilityDetails.luck}
                source={abilityDetails.luckSource}
              />
            </div>
          </details>
        </section>
        {/* ===== ダイスロール ===== */}
        <section className="flex flex-col gap-3 animate-[fadeSlideIn_0.4s_0.12s_ease-out_both] bg-[#fffde7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex-0.5 min-w-56">
          <h2 className="text-sm font-black uppercase tracking-widest mb-3 pb-1.5 border-b-2 border-black">
            🎲 ダイスロール設定
          </h2>
          <div className="flex flex-row gap-3">
            <div className="flex flex-col items-center gap-3 self-center justify-between">
              <button
                type="button"
                onClick={() => setBonusDice((v) => v + 1)}
                className={`${btnClass} bg-[#d4edda]! w-full`}
              >
                ボーナス
              </button>
              <div
                className={`font-bold text-2xl px-2 py-1 border-2 border-black w-full text-center !bg-${bonusDice > 0 ? "[#d4edda]" : bonusDice < 0 ? "[#f8d7da]" : "[#ffffff]"}`}
              >
                {Math.abs(bonusDice)}
              </div>
              <button
                type="button"
                onClick={() => setBonusDice((v) => v - 1)}
                className={`${btnClass} bg-[#f8d7da]! w-full`}
              >
                ペナルティ
              </button>
            </div>

            {diceResult && (
              <div className="border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
                <div className="text-sm font-black tracking-widest">
                  🎲 判定結果
                </div>
                <div className="flex flex-col justify-between items-start gap-4 flex-wrap">
                  <div className="font-mono text-xl flex flex-row gap-2 items-baseline text-md flex-1 justify-center">
                    <span>
                      {selectedSkill}({diceResult.goal})
                    </span>
                    <span className="text-xs">vs</span>
                    <span>{diceResult.total}</span>
                  </div>
                  <div
                    className={`flex-1 text-center text-3xl font-black uppercase px-4 py-3 border-2 border-black ${
                      diceResult.isSuccess ? "bg-[#d4f7d4]" : "bg-[#f7d4d4]"
                    }`}
                  >
                    {diceResult.isSuccess ? "成功" : "失敗"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===== 技能（カテゴリ別） ===== */}
      <section className="animate-[fadeSlideIn_0.4s_0.15s_ease-out_both] flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-black text-white px-3 py-1">
            <h2 className="text-sm font-black uppercase tracking-widest">
              ⚔️ 技能
            </h2>
          </div>
          {skillAllocationDetails && (
            <>
              <div className="text-xs font-bold border-2 border-black bg-blue-100 px-2 py-1">
                職業ポイント: {skillAllocationDetails.jobPoints} (残り:{" "}
                {skillAllocationDetails.jobPoints - usedJobPoints})
                <span className="ml-1 text-gray-500">
                  [
                  {skillAllocationDetails.pointCalculation
                    .map((pc) => `${pc.param.toUpperCase()}×${pc.weight}`)
                    .join("+")}
                  ]
                </span>
              </div>
              <div className="text-xs font-bold border-2 border-black bg-green-100 px-2 py-1">
                趣味ポイント: {skillAllocationDetails.interestPoints} (残り:{" "}
                {skillAllocationDetails.interestPoints - usedInterestPoints})
                <span className="ml-1 text-gray-500">[INT×2]</span>
              </div>
              <button
                type="button"
                onClick={() => setSkillEditMode((v) => !v)}
                className={`${btnClass} ${skillEditMode ? "bg-yellow-300!" : ""}`}
              >
                {skillEditMode ? "✅ 編集完了" : "✏️ 割り振り編集"}
              </button>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SKILL_CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className={`${cat.bgColor} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3`}
            >
              <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b-2 border-black">
                {cat.icon} {cat.name}
              </h3>
              <div className="flex flex-col gap-1">
                {cat.skills.map((skill) => (
                  <SkillRow
                    key={skill}
                    label={skill}
                    score={skills[skill]}
                    onClick={() => {
                      if (!skillEditMode)
                        handleRollDice(skill, skills[skill], bonusDice);
                    }}
                    baseValue={getBaseSkillValue(skill)}
                    jobAllocated={
                      skillAllocationDetails?.jobAllocated[skill] ?? 0
                    }
                    interestAllocated={
                      skillAllocationDetails?.interestAllocated[skill] ?? 0
                    }
                    isJobSkill={skillAllocationDetails?.jobSkillKeys.includes(
                      skill,
                    )}
                    editMode={skillEditMode && !!skillAllocationDetails}
                    onJobChange={(v) => handleJobAllocatedChange(skill, v)}
                    onInterestChange={(v) =>
                      handleInterestAllocatedChange(skill, v)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== バックストーリー / 装備 / 所持金 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-[fadeSlideIn_0.4s_0.2s_ease-out_both]">
        {/* バックストーリー */}
        <section className="md:col-span-2 bg-[#ffdac1] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <h2 className="text-sm font-black uppercase tracking-widest mb-2 pb-1.5 border-b-2 border-black">
            📖 バックストーリー
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {backstory ?? <span className="text-gray-400 italic">未生成</span>}
          </p>
        </section>

        {/* 装備 + 所持金 */}
        <div className="flex flex-col gap-4">
          <section className="bg-[#e0f0ff] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <h2 className="text-sm font-black uppercase tracking-widest mb-2 pb-1.5 border-b-2 border-black">
              🎒 装備
            </h2>
            {equipment ? (
              <ul className="flex flex-col gap-1">
                {equipment.map((item, i) => (
                  <li
                    key={`${item}-${i}`}
                    className="text-xs font-bold px-2 py-1 border-2 border-black bg-white"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic text-xs">未生成</p>
            )}
          </section>

          <section className="bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <h2 className="text-sm font-black uppercase tracking-widest mb-2 pb-1.5 border-b-2 border-black">
              💰 所持金
            </h2>
            <p className="text-2xl font-black tabular-nums">
              {money !== undefined ? (
                `$${money.toLocaleString()}`
              ) : (
                <span className="text-gray-500 text-sm italic">未生成</span>
              )}
            </p>
          </section>
        </div>
      </div>
      <Donate />
    </div>
  );
};

export default CoCCharaMaker;
