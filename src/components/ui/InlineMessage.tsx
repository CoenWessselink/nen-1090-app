import React from "react";

type Tone = "success" | "danger" | "neutral";

export default function InlineMessage({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const colors = {
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-800",
  };

  return (
    <div className={`p-2 rounded ${colors[tone]}`}>
      {children}
    </div>
  );
}
