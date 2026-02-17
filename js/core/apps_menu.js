/* Apps Menu — 3 modules from prompt (+ Superadmin when platform_admin) */
(function(){
  function getBackendRole(){
    try{
      // prefer /auth/me cached by Shell
      if(window.__AUTH_ME__ && window.__AUTH_ME__.role) return window.__AUTH_ME__.role;
      // fallback decode JWT payload
      if(window.Auth && window.Auth.getAccessToken){
        const tok = window.Auth.getAccessToken() || '';
        const parts = tok.split('.');
        if(parts.length>=2){
          const b64 = parts[1].replace(/-/g,'+').replace(/_/g,'/');
          const json = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const p = JSON.parse(json);
          return p && p.role ? p.role : '';
        }
      }
    }catch(e){}
    return '';
  }

  function buildApps(){
    const apps = [
      {key:"projecten", label:"Projecten", icon:"PR", sub:"Overzicht + status"},
      {key:"lascontrole", label:"Lascontrole", icon:"LC", sub:"Lassen, controles, rapportage"},
      {key:"instellingen", label:"Instellingen", icon:"IN", sub:"Bedrijf, werknemers, lijsten"},
    ];

    const role = getBackendRole();
    if(role === "platform_admin"){
      apps.unshift({key:"superadmin", label:"Klantbeheer", icon:"SA", sub:"Tenants • users • billing"});
    }
    if(role === "tenant_admin"){
      apps.push({key:"abonnement", label:"Abonnement", icon:"AB", sub:"Seats • status • beheren"});
    }
    return apps;
  }

  function render(){
    const grid = document.getElementById("appsGrid");
    if(!grid) return;
    const apps = buildApps();
    grid.innerHTML = apps.map(a=>(
      `<div class="app-card" data-app="${a.key}">
        <div class="app-icon">${a.icon}</div>
        <div class="app-label">${a.label}</div>
        <div class="smallmuted">${a.sub}</div>
      </div>`
    )).join("");
    updateFooter();
  }

  function updateFooter(){
    if(!window.CWS || !window.CWS.getState){ return; }
    const st = window.CWS.getState();
    const c = st.projects && st.projects.order ? st.projects.order.length : 0;
    const el = document.getElementById("appsFooter");
    if(el) el.textContent = `${c} projecten • Pagina 1 van 1`;
  }

  function bind(){
    const openBtn = document.getElementById("openApps");
    const closeBtn = document.getElementById("closeApps");
    const bd = document.getElementById("appsBackdrop");
    const grid = document.getElementById("appsGrid");

    if(openBtn) openBtn.addEventListener("click", show);
    if(closeBtn) closeBtn.addEventListener("click", hide);
    if(bd) bd.addEventListener("click", (e)=>{ if(e.target===bd) hide(); });

    if(grid) grid.addEventListener("click", (e)=>{
      const card = e.target.closest(".app-card");
      if(!card) return;
      const app = card.getAttribute("data-app");
      hide();
      const href = String(location.href||'');
      const inLayers = (href.indexOf('/layers/') !== -1) || (href.indexOf('\\layers\\') !== -1);
      const root = inLayers ? '..' : '.';
      const map = {
        superadmin: root + "/layers/superadmin.html",
        projecten: root + "/layers/projecten.html",
        lascontrole: root + "/layers/lascontrole.html",
        instellingen: root + "/layers/instellingen.html",
        abonnement: root + "/layers/tenant_billing.html"
      };
      location.href = (map[app] ? (map[app] + '?r=' + Date.now()) : (root + '/index.html?r=' + Date.now()));
    });

    // re-render on auth changes (role affects tiles)
    window.addEventListener('auth-changed', ()=>{ try{ render(); }catch(e){} });
  }

  function show(){
    const bd = document.getElementById("appsBackdrop");
    if(bd) bd.classList.add("show");
  }
  function hide(){
    const bd = document.getElementById("appsBackdrop");
    if(bd) bd.classList.remove("show");
  }

  window.AppsMenu = { render, bind, show, hide };
})();
