import React from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      {/* FIX: ONLY ONE MAIN ROLE */}
      <main role="main" className="page-canvas">
        {children}
      </main>
    </div>
  );
}
