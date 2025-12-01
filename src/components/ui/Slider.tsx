import React from "react";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  valueDisplay?: string | number;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  valueDisplay,
  className = "",
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-sm font-bold text-primary">{valueDisplay}</span>
      </div>
      <input
        type="range"
        className={`w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-slate-200 ${className}`}
        {...props}
      />
    </div>
  );
};
