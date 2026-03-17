import React from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
}

export const InputField = ({ label, value, onChange }: InputFieldProps) => {
  return (
    <div className="flex flex-row items-center gap-3">
      <label className="font-black text-xs uppercase tracking-wider w-12 shrink-0">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-2 border-black px-3 py-1.5 font-mono text-sm bg-white min-w-0
          focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition-all duration-150"
      />
    </div>
  );
};
