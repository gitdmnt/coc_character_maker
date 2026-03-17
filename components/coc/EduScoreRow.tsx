import React from "react";
import { eduCheck } from "@/lib/coc/domain";

interface EduScoreRowProps {
  label: string;
  score: number;
  source: number[];
  checkSource: (number | null)[];
  ageOffset: number[];
}

export const EduScoreRow = ({
  label,
  score,
  source,
  checkSource,
  ageOffset,
}: EduScoreRowProps) => {
  const effectiveScore = eduCheck(score, checkSource, ageOffset);

  return (
    <div className="flex flex-row items-center gap-3 py-2 border-b-2 border-black last:border-b-0 group">
      <div className="font-black text-xs w-12 shrink-0 bg-black text-white px-2 py-1 text-center tracking-widest">
        {label}
      </div>
      <div
        className="text-2xl font-black w-12 text-center tabular-nums
          group-hover:animate-[popIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      >
        {effectiveScore}
      </div>
      <div className="text-xs text-gray-500 font-mono hidden sm:block">
        [{source.join(", ")}]→<span className="font-bold text-black">{score}</span>
      </div>
      {ageOffset.length > 0 && (
        <div className="text-xs font-mono text-gray-500 hidden md:block">
          ({ageOffset.map((o, i) => `${checkSource[i]}:${o}`).join(", ")})
        </div>
      )}
    </div>
  );
};
