import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return <div style={{display:"block"}}>APP_READY</div>;
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}
