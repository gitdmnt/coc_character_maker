import React from "react";
import { sum } from "@/lib/coc/domain";

interface LuckScoreRowProps {
  label: string;
  score: number;
  source: number[][];
}

export const LuckScoreRow = ({ label, score, source }: LuckScoreRowProps) => {
  return (
    <div className="flex flex-row items-center gap-3 py-2 border-b-2 border-black last:border-b-0 group">
      <div className="font-black text-xs w-12 shrink-0 bg-yellow-400 border-2 border-black px-2 py-1 text-center tracking-widest">
        {label}
      </div>
      <div
        className="text-2xl font-black w-12 text-center tabular-nums
          group-hover:animate-[popIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      >
        {score}
      </div>
      <div className="flex gap-2 flex-wrap">
        {source.map((s, i) => (
          <div key={`${label}-${i}`} className="text-xs font-mono text-gray-500 hidden sm:block">
            試{i + 1}:[{s.join(",")}]→
            <span className="font-bold text-black">{sum(s) * 5}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
