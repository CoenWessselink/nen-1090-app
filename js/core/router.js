/* Router — loads layers into iframe */
(function(){
  const routes = {
    projecten: "/layers/projecten.html",
    lascontrole: "/layers/lascontrole.html",
    instellingen: "/layers/instellingen.html"
  };

  function setApp(app){
    const st = window.CWS.getState();
    st.ui.activeApp = app;
    window.CWS.setState(st);
  }

  function boot(){
    const st = window.CWS.getState();
    const app = st.ui.activeApp || "projecten";
    open(app);
  }

  function open(app){
    if(!routes[app]) app = "projecten";
    setApp(app);
    const frame = document.getElementById("appFrame");
    if(!frame) return;
    frame.src = routes[app] + "?r=" + Date.now();
    const title = ({projecten:"Projecten", lascontrole:"Lascontrole (NEN 1090)", instellingen:"Instellingen"})[app] || "App";
    const mt = document.getElementById("moduleTitle");
    if(mt) mt.textContent = title;
  }

  window.Router = { boot, open };
})();
