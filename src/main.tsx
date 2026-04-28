import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return <div id="root">App Loaded</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
