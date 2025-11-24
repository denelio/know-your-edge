import React, { useEffect, useState } from "react";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  suffix?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  suffix,
  value,
  onChange,
  className = "",
  type,
  ...props
}) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;

    // For number inputs, prevent leading zeros unless it's "0." or just "0"
    if (type === "number") {
      // Remove leading zeros e.g. "05" -> "5", but keep "0.5"
      if (newVal.length > 1 && newVal.startsWith("0") && newVal[1] !== ".") {
        newVal = newVal.replace(/^0+/, "");
      }
    }

    setLocalValue(newVal);

    // Create a synthetic event with the cleaned value to pass back to parent
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: newVal,
      },
    };

    onChange(syntheticEvent);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          className={`w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${className}`}
          value={localValue}
          onChange={handleChange}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};
