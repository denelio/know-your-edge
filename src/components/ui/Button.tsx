import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    secondary:
      "bg-secondary hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
    accent:
      "bg-accent hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
    ghost:
      "bg-dark-700 hover:bg-dark-600 text-slate-200 border border-dark-600",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
