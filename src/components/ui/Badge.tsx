import React from "react";

type Tone = "success" | "danger" | "neutral";

export default function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const colors = {
    success: "bg-green-500 text-white",
    danger: "bg-red-500 text-white",
    neutral: "bg-gray-400 text-white",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[tone]}`}>
      {children}
    </span>
  );
}
