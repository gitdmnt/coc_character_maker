import React from "react";

interface AbilityScoreRowProps {
  label: string;
  score: number;
  source?: number[];
  ageOffset?: number;
}

export const AbilityScoreRow = ({
  label,
  score,
  source,
  ageOffset,
}: AbilityScoreRowProps) => {
  const effectiveScore = score + (ageOffset || 0);

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
      {source && (
        <div className="text-xs text-gray-500 font-mono hidden sm:block">
          [{source.join(", ")}]→<span className="font-bold text-black">{score}</span>
        </div>
      )}
      {ageOffset !== undefined && ageOffset !== 0 && (
        <div
          className={`text-xs font-black px-2 py-0.5 border-2 border-black ${
            ageOffset >= 0 ? "bg-green-300" : "bg-red-300"
          }`}
        >
          {ageOffset >= 0 ? `+${ageOffset}` : ageOffset}
        </div>
      )}
    </div>
  );
};
