import React from "react";

interface SkillRowProps {
  label: string;
  score: number | undefined;
}

export const SkillRow = ({ label, score }: SkillRowProps) => {
  const hasScore = score !== undefined && score > 0;

  return (
    <div
      className={`flex flex-row items-center justify-between gap-1 px-2 py-1.5
        border-2 border-black transition-all duration-150
        hover:-translate-x-px hover:-translate-y-px
        hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
        ${hasScore ? "bg-white" : "bg-gray-100"}`}
    >
      <label className="text-xs font-bold truncate">{label}</label>
      <div
        className={`text-xs font-black min-w-8 text-center px-1 py-0.5 tabular-nums
          ${hasScore ? "bg-black text-white" : "text-gray-400"}`}
      >
        {score !== undefined ? score : "-"}
      </div>
    </div>
  );
};
