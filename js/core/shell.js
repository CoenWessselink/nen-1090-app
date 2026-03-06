/* Shell — renders headerbar + apps menu on every page (file:// compatible, no iframes) */
(function(){
  function el(html){
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function mount(){
    // avoid double mount
    if(document.querySelector(".headerbar")) return;

    const header = el(`
      <div class="headerbar">
        <div class="left">
          <button class="btn" id="openApps">Apps Menu</button>
          <span class="pill">Rol: <span id="rolePill">Admin</span></span>
          <button class="btn" id="projectPill" title="Kies project">Project: -</button>
          <button class="btn" id="roleToggle">Wissel rol</button>
        </div>
        <div id="moduleTitle" style="font-size:28px;">-</div>
        <div class="right">
          <button class="pill pillbtn" id="apiPill" title="Backend status (klik voor API instellingen)">API: <span id="apiStatus">off</span></button>
          <span class="pill" title="Ingelogde gebruiker">User: <span id="userPill">Not logged in</span></span>
          <button class="btn" id="authBtn" title="Login / Logout">Login</button>
          <button class="btn" id="resetDemo">Demo data</button>
          <button class="btn" id="clearData">Data leegmaken</button>
        </div>
      </div>
    `);

    const backdrop = el(`
      <div class="modal-backdrop" id="appsBackdrop" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            APPS MENU
            <button class="close" id="closeApps" aria-label="Sluiten">✕</button>
          </div>
          <div class="modal-body">
            <div class="apps-grid" id="appsGrid"></div>
          </div>
          <div class="footerbar" id="appsFooter">0 projecten • Pagina 1 van 1</div>
        </div>
      </div>
    `);

    const toast = el(`<div class="toast" id="toast"></div>`);

    document.body.prepend(toast);
    document.body.prepend(backdrop);
    document.body.prepend(header);

    // Read-only banner (billing/status)
    const ro = el(`<div class="readonly-banner" id="readonlyBanner" style="display:none">
      <div class="readonly-inner">
        <b>Read-only:</b> deze tenant kan op dit moment niet wijzigen (abonnement/status). Ga naar <span class="linklike" data-open-billing>Abonnement</span>.
      </div>
    </div>`);
    document.body.insertBefore(ro, header.nextSibling);
    try{
      ro.querySelector("[data-open-billing]")?.addEventListener("click", ()=>{
        window.location.href = (window.__APP_ROOT__ || ".") + "/layers/tenant_billing.html";
      });
    }catch{}


    function _formatReason(r){
      if(!r || !r.code) return "";
      const code = r.code;
      if(code==="INACTIVE") return "Tenant is gedeactiveerd";
      if(code==="STATUS_SUSPENDED") return "Tenant is geschorst";
      if(code==="STATUS_CANCELLED") return "Abonnement is opgezegd";
      if(code==="TRIAL_EXPIRED") return "Trial is verlopen";
      if(code==="VALID_UNTIL_EXPIRED") return "Geldigheid is verlopen";
      return code;
    }

    function _renderReadonlyReasons(){
      try{
        const raw = localStorage.getItem("TENANT_READONLY_REASONS");
        if(!raw) return;
        const arr = JSON.parse(raw);
        const list = Array.isArray(arr) ? arr : [];
        const b = document.getElementById("readonlyBanner");
        if(!b) return;
        const inner = b.querySelector(".readonly-inner");
        if(!inner) return;
        const reasonsHtml = list.length ? `<ul class="readonly-reasons">` + list.map(r=>`<li>${UI.esc(_formatReason(r))}</li>`).join("") + `</ul>` : "";
        // only add once
        if(!inner.querySelector(".readonly-reasons")){
          inner.insertAdjacentHTML("beforeend", reasonsHtml);
        }
      }catch{}
    }

    function showReadonly(){
      const b = document.getElementById("readonlyBanner");
      if(!b) return;
      b.style.display = "block";
      _renderReadonlyReasons();
      // toast if available
      try{ window.UI && window.UI.toast && window.UI.toast("Tenant is read-only (abonnement/status)"); }catch{}
    }
    if(localStorage.getItem("TENANT_READONLY")==="1"){
      showReadonly();
    }
    window.addEventListener("tenant:readonly", ()=>showReadonly());

    // init pills
    try{
      if (window.CWS && window.CWS.getState && window.CWS.resetDemo) {
      const st = window.CWS.getState();
      if(!st.projects || !st.projects.order || !st.projects.order.length){ window.CWS.resetDemo(); }
    }
      if(window.CWS && window.CWS.getState){ document.getElementById("rolePill").textContent = window.CWS.getState().ui.role; }
    }catch(e){
      console.error(e);
    }


    function getActiveProject(){
      try{
        const st = window.CWS.getState();
        const id = st.ui.activeProjectId;
        if(id && st.projects.byId[id]) return st.projects.byId[id];
        // fallback first
        const first = st.projects.order && st.projects.order[0];
        if(first && st.projects.byId[first]){
          st.ui.activeProjectId = first;
          window.CWS.setState(st);
          return st.projects.byId[first];
        }
      }catch(e){}
      return null;
    }

    function refreshProjectPill(){
      const btn = document.getElementById("projectPill");
      if(!btn) return;
      const p = getActiveProject();
      btn.textContent = "Project: " + (p ? p.nummer : "-");
      btn.dataset.pid = p ? p.id : "";
    }

    function openProjectPicker(){
      const st = window.CWS.getState();
      const list = (st.projects.order||[]).map(id=>st.projects.byId[id]).filter(Boolean);
      const active = st.ui.activeProjectId || "";
      const body = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
          <input class="input" id="pp_q" placeholder="Zoek project (nummer/naam/opdrachtgever)" />
          <span class="pillmini">Dubbelklik om te kiezen</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nr</th><th>Naam</th><th>Opdrachtgever</th><th>Status</th></tr></thead>
            <tbody id="pp_rows">
              ${list.map(p=>`
                <tr data-id="${UI.esc(p.id)}" class="${p.id===active?'row-active':''}">
                  <td>${UI.esc(p.nummer)}</td>
                  <td>${UI.esc(p.naam||"")}</td>
                  <td>${UI.esc(p.opdrachtgever||"")}</td>
                  <td><span class="badge" style="background:${p.status==='locked'?'#111827':'var(--st-incontrole)'}">${UI.esc(p.status||"")}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
      UI.openModal({
        title:"Project kiezen",
        saveLabel:"Sluiten",
        bodyHtml: body,
        onSave: ({close})=>close()
      });

      const q = document.getElementById("pp_q");
      const tbody = document.getElementById("pp_rows");
      function applyFilter(){
        const s = (q.value||"").toLowerCase().trim();
        [...tbody.querySelectorAll("tr[data-id]")].forEach(tr=>{
          const t = tr.textContent.toLowerCase();
          tr.style.display = (!s || t.includes(s)) ? "" : "none";
        });
      }
      q.addEventListener("input", applyFilter);

      UI.bindRowDblClick(tbody, (id)=>{
        const st2 = window.CWS.getState();
        st2.ui.activeProjectId = id;
        window.CWS.setState(st2);
        refreshProjectPill();
    // If already logged in, sync projects from API so the project picker is correct on every page.
    syncProjectsIntoStore();
        try{ window.dispatchEvent(new CustomEvent("cws_project_changed", {detail:{id}})); }catch(_){}
        UI.toast("Project gekozen.");
        // close modal
        document.getElementById("uiModalClose").click();
      });
    }

    // bind buttons
    document.getElementById("resetDemo").addEventListener("click", async () => {
      // Phase 3.1: when logged in, seed demo projects into the backend DB.
      const token = (window.Auth?.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
      if(window.Auth && token){
        try{
          await window.Auth.projects.seedDemo();
          // Phase 3.2: seed demo welds as well
          try{ await window.Auth.welds.seedDemo(); }catch(_){ }
          UI.toast("Demo data → database gezet.");
          try{ window.dispatchEvent(new Event("cws_projects_changed")); }catch(_){ }
          location.reload();
          return;
        }catch(e){
          console.error(e);
          UI.toast("Demo seed naar DB mislukt.");
        }
      }

      // Fallback: offline/local demo
      window.CWS.resetDemo();
      UI.toast("Demo data geladen.");
      refreshProjectPill();
      location.reload();
    });

    document.getElementById("clearData").addEventListener("click", async () => {
      const token = (window.Auth?.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
      if(window.Auth && token){
        try{
          await window.Auth.projects.clearAll();
          try{ await window.Auth.welds.clearAll(); }catch(_){ }
        }catch(e){ console.error(e); }
      }
      window.CWS.clearAll();
      window.CWS.resetDemo();
      UI.toast("Data geleegd.");
      refreshProjectPill();
      location.reload();
    });

    refreshProjectPill();

    document.getElementById("projectPill").addEventListener("click", ()=>{
      try{ openProjectPicker(); }catch(e){ console.error(e); UI.toast("Project picker fout."); }
    });

    document.getElementById("roleToggle").addEventListener("click", () => {
      const next = window.CWS.toggleRole();
      document.getElementById("rolePill").textContent = next;
      UI.toast("Rol: " + next);
    });

    

async function syncProjectsIntoStore(){
  try{
    if(!window.Auth || !window.CWS || !window.CWS.getState) return false;
    const token = (window.Auth.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
    if(!token) return false;
    const list = await window.Auth.projects.list();
    const st = window.CWS.getState();
    const prevActive = st.ui.activeProjectId || "";
    const prevCode = (prevActive && st.projects.byId[prevActive] && st.projects.byId[prevActive].nummer) ? st.projects.byId[prevActive].nummer : "";
    st.projects.byId = {};
    st.projects.order = [];
    (list||[]).forEach(p=>{
      const lp = {
        id: p.id,
        nummer: p.code || '',
        naam: p.name || '',
        opdrachtgever: p.client_name || '',
        exc: p.execution_class || '',
        acceptatieklasse: p.acceptance_class || '',
        status: p.status || 'in_controle',
        locked: !!p.locked,
        laatstGewijzigd: (p.updated_at || p.created_at || '').toString()
      };
      st.projects.byId[lp.id] = lp;
      st.projects.order.push(lp.id);
    });
    // keep active project by matching code if possible
    if(prevCode){
      const matchId = st.projects.order.find(id => (st.projects.byId[id]?.nummer||"") === prevCode);
      if(matchId) st.ui.activeProjectId = matchId;
    }
    if(!st.ui.activeProjectId && st.projects.order.length) st.ui.activeProjectId = st.projects.order[0];
    window.CWS.setState(st);
    refreshProjectPill();
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

// ===== Phase 3: optional real backend login =====
    
    function openApiConfigModal(){
      try{
        const cur = (window.Auth && window.Auth.getBaseUrl && window.Auth.getBaseUrl()) || localStorage.getItem('nen1090.api.baseUrl') || localStorage.getItem('API_BASE_URL') || window.__API_BASE_URL__ || '/api';
        UI.modalForm({
          title: 'API instellingen',
          submitLabel: 'Opslaan',
          values: { baseUrl: cur },
          fields: [
            { key:'baseUrl', label:'API Base URL', type:'text' },
          ],
          onSubmit: async (v)=>{
            const url = (v.baseUrl||'').trim().replace(/\/+$/,'');
            if(!url){ UI.toast('Vul een geldige URL in'); return false; }
            try{ window.Auth && window.Auth.setBaseUrl && window.Auth.setBaseUrl(url); }catch(_){ localStorage.setItem('nen1090.api.baseUrl', url); }
            try{ localStorage.setItem('API_BASE_URL', url); }catch(_){ }
            // test health
            const ok = await window.Auth.health().then(r=>!!r.ok).catch(()=>false);
            UI.toast(ok ? 'API OK' : 'API niet bereikbaar (check backend/CORS)');
            await updateApiUi();
    try{
      const ap = document.getElementById('apiPill');
      if(ap) ap.addEventListener('click', ()=>openApiConfigModal());
    }catch(_){}

            return true;
          }
        });
      }catch(e){ console.error(e); }
    }

async function updateApiUi(){
      const stEl = document.getElementById('apiStatus');
      const apiPill = document.getElementById('apiPill');
      const u = document.getElementById('userPill');
      const btn = document.getElementById('authBtn');
      if(!stEl || !btn || !window.Auth) return;

      // Avoid hammering the backend; cache status for a few seconds.
      const now = Date.now();
      window.__apiUiCache = window.__apiUiCache || { ts:0, health:null, me:null };
      const cache = window.__apiUiCache;

      let health = cache.health;
      if(!health || (now - cache.ts) > 4000){
        health = await window.Auth.health().catch((e)=>({ok:false, _err:e && (e.code||e.message||String(e))}));
        cache.health = health;
        cache.ts = now;
      }

      // API status text
      if(health && health.ok){
        stEl.textContent = (health.db || 'on');
        stEl.style.color = '#065f46';
      } else {
        stEl.textContent = 'off';
        stEl.style.color = '#7f1d1d';
      }

      // user
      const token = (window.Auth.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
      let me = null;
      if(token && health && health.ok){
        me = await window.Auth.me().catch(()=>null);
      }
      window.__AUTH_ME__ = me;

      if(u){
        if(me && me.email){ u.textContent = me.email; }
        else u.textContent = 'Not logged in';
      }

      const rp = document.getElementById('rolePill');
      if(rp){ rp.textContent = (me && me.role) ? me.role : (window.CWS && window.CWS.getState ? window.CWS.getState().ui.role : ''); }

      btn.textContent = (me && me.email) ? 'Logout' : 'Login';

      // If logged in and API is on, keep projects in sync on every page
      if(me && me.email){
        try{ await syncProjectsIntoStore(); }catch(_){ }
      }

      // Make pill open Instellingen → API Base URL quickly
      if(apiPill && !apiPill.__bound){
        apiPill.__bound = true;
        apiPill.addEventListener('click', ()=>{
          try{ window.location.href = (window.__APP_ROOT__ || '.') + '/layers/instellingen.html#api'; }catch(_){ }
        });
      }
    }

    document.getElementById('authBtn').addEventListener('click', async () => {
      if(!window.Auth) return UI.toast('Auth client ontbreekt (auth_client.js).');
      // If logged in => logout
      const me = await window.Auth.me().catch(()=>null);
      if(me && me.email){
        await window.Auth.logout();
        UI.toast('Uitgelogd');
        await updateApiUi();
        return;
      }

      const currentTenant = window.Auth.getTenant() || 'demo';
      UI.modalForm({
        title: 'Login (Phase 3 backend)',
        fields: [
          { key: 'tenant', label: 'Tenant', type: 'text', default: currentTenant },
          { key: 'email', label: 'Email', type: 'text', default: (window.Auth.getUserEmail && window.Auth.getUserEmail()) ? window.Auth.getUserEmail() : 'admin@demo.com' },
          { key: 'password', label: 'Password', type: 'password', default: '' },
        ],
        values: {
          tenant: currentTenant,
          email: (window.Auth.getUserEmail && window.Auth.getUserEmail()) ? window.Auth.getUserEmail() : 'admin@demo.com',
          password: ''
        },
        onSubmit: async (vals) => {
          try{
            const data = await window.Auth.login({ tenant: vals.tenant, email: vals.email, password: vals.password });
            // Notify shell + other modules that auth changed
            window.dispatchEvent(new Event('auth-changed'));
            UI.toast('Ingelogd');
            await updateApiUi();
            return true;
          }catch(e){
            console.error(e);
            UI.toast('Login mislukt. Tip: seed geeft Admin: admin@demo.com • Password: Admin123! • Tenant: demo');
            return false; // keep modal open
          }
        }
      });
    });


    // Click API pill -> open API settings (Instellingen)
    try{
      const ap = document.getElementById('apiPill');
      if(ap){
        ap.addEventListener('click', ()=>{
          try{
            const root = (window.__APP_ROOT__ || '.');
            window.location.href = root + '/layers/instellingen.html#api';
          }catch(_){ }
        });
      }
    }catch(_){ }

    // Refresh auth/API pills when auth changes
    window.addEventListener('auth-changed', async ()=>{
      try{ window.__apiHealthCache = {ts:0, val:{ok:false}}; }catch(_){}
      await updateApiUi();
      try{ await syncProjectsIntoStore(); }catch(_){}
    });
    updateApiUi();

    AppsMenu.render();
    AppsMenu.bind();

    // title from page
    const t = document.body.getAttribute("data-title") || document.title || "";
    const mt = document.getElementById("moduleTitle");
    if(mt) mt.textContent = t;
  }

  window.Shell = { mount };
})();
