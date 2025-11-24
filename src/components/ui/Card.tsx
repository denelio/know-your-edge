import React from "react";

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ children, className = "", title }) => {
  return (
    <div
      className={`bg-dark-800 border border-dark-700 rounded-xl p-6 shadow-xl ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-slate-100 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
};
