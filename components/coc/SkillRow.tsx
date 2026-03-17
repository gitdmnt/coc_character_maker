import React from "react";

interface SkillRowProps {
  label: string;
  score: number | undefined;
  onClick?: () => void;
  baseValue?: number;
  jobAllocated?: number;
  interestAllocated?: number;
  isJobSkill?: boolean;
  editMode?: boolean;
  onJobChange?: (value: number) => void;
  onInterestChange?: (value: number) => void;
}

export const SkillRow = ({
  label,
  score,
  onClick,
  baseValue,
  jobAllocated = 0,
  interestAllocated = 0,
  isJobSkill,
  editMode,
  onJobChange,
  onInterestChange,
}: SkillRowProps) => {
  const hasAllocation = baseValue !== undefined;
  const total = hasAllocation
    ? baseValue + jobAllocated + interestAllocated
    : score;
  const hasScore = total !== undefined && total > 0;
  const diff = hasAllocation ? jobAllocated + interestAllocated : undefined;

  return (
    <div
      className={`flex flex-col px-2 py-1.5 border-2 border-black transition-all duration-150
        hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
        ${hasScore ? "bg-white" : "bg-gray-100"}`}
      onClick={onClick}
    >
      <div className="flex flex-row items-center justify-between gap-1">
        <label className="text-xs font-bold truncate flex items-center gap-1">
          {label}
          {isJobSkill && (
            <span className="text-[9px] font-black bg-blue-500 text-white px-1 py-0 leading-tight">
              職
            </span>
          )}
        </label>
        <div className="flex items-center gap-1">
          {hasAllocation && diff !== undefined && diff > 0 && !editMode && (
            <span className="text-[9px] text-gray-500 tabular-nums">
              {baseValue}
              {jobAllocated > 0 && (
                <span className="text-blue-600">+{jobAllocated}</span>
              )}
              {interestAllocated > 0 && (
                <span className="text-green-600">+{interestAllocated}</span>
              )}
            </span>
          )}
          <div
            className={`text-xs font-black min-w-8 text-center px-1 py-0.5 tabular-nums
              ${hasScore ? "bg-black text-white" : "text-gray-400"}`}
          >
            {total !== undefined ? total : "-"}
          </div>
        </div>
      </div>

      {hasAllocation && editMode && (
        <div className="flex items-center gap-1 mt-1 text-[10px]">
          <span className="text-gray-500">{baseValue}</span>
          {isJobSkill && (
            <>
              <span className="text-blue-600">+J</span>
              <input
                type="number"
                min={0}
                value={jobAllocated}
                onChange={(e) =>
                  onJobChange?.(Math.max(0, Number(e.target.value)))
                }
                className="w-10 border border-blue-400 text-center text-[10px] font-bold bg-blue-50 focus:outline-none"
              />
            </>
          )}
          <>
            <span className="text-green-600">+I</span>
            <input
              type="number"
              min={0}
              value={interestAllocated}
              onChange={(e) =>
                onInterestChange?.(Math.max(0, Number(e.target.value)))
              }
              className="w-10 border border-green-400 text-center text-[10px] font-bold bg-green-50 focus:outline-none"
            />
          </>
          <span className="text-gray-400">={total}</span>
        </div>
      )}
    </div>
  );
};
