import { getApiBaseUrl } from "./config.js";
const API_BASE = getApiBaseUrl();
/*
NOTE: When opened via file://, browsers give pages an opaque origin ("null") and may block frame property access.
Use server.bat (http://localhost:5173) to ensure same-origin.
*/
(function(){
  let warned = false;

  function canAccessParent(){
    try{
      // Accessing parent properties can throw SecurityError on opaque origins.
      return !!(window.parent && window.parent !== window && window.parent.CWS && typeof window.parent.CWS.getState === "function");
    }catch(_){
      return false;
    }
  }

  function warnOnce(){
    if(warned) return;
    warned = true;
    try{
      // If UI exists in parent, show toast; otherwise noop.
      window.parent?.UI?.toast?.("Open via server.bat (http://localhost:5173) — file:// blokkeert iframe state.");
    }catch(_){}
  }

  function getState(){
    if(canAccessParent()){
      return window.parent.CWS.getState();
    }
    warnOnce();
    return null;
  }

  function call(name, ...args){
    if(canAccessParent()){
      const fn = window.parent.CWS[name];
      if(typeof fn !== "function") throw new Error("RPC missing: " + name);
      return fn(...args);
    }
    warnOnce();
    throw new Error("RPC blocked by browser security (file://). Start via server.bat.");
  }

  function setTitle(title){
    try{ window.parent?.postMessage({type:"cws_set_title", title}, "*"); }catch(_){}
  }
  function requestAppsMenu(){
    try{ window.parent?.postMessage({type:"cws_apps_menu"}, "*"); }catch(_){}
  }

  window.CWSRPC = { getState, call, setTitle, requestAppsMenu, canAccessParent };
})();


export async function authLogin({ email, password, tenant }) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, tenant })
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>"");
    throw new Error(`login_failed:${res.status}:${t}`);
  }
  return res.json();
}
