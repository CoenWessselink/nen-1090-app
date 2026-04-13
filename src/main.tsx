import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function Root() {
  useEffect(() => {
    document.body.setAttribute("data-app-ready", "1");
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);