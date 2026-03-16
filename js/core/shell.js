/* Shell — enterprise navigation + header */
(function(){
  function el(html){
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function routeKey(){
    const href = String(location.href || '');
    if(href.includes('dashboard.html')) return 'start';
    if(href.includes('projecten.html')) return 'projects';
    if(href.includes('lascontrole.html')) return 'welds';
    if(href.includes('ce_dossier.html')) return 'ce';
    if(href.includes('instellingen.html')) return 'settings';
    if(href.includes('superadmin.html')) return 'admin';
    if(href.includes('tenant_billing.html')) return 'billing';
    return 'start';
  }



  function icon(name){
    return (window.CWSIcons && window.CWSIcons.render) ? window.CWSIcons.render(name, 'app-icon app-icon-' + name) : `<span class="app-icon"></span>`;
  }

  function mount(){
    if(document.querySelector('.headerbar')) return;

    const shell = el(`
      <div class="cws-shell-chrome">
        <aside class="cws-sidebar" aria-label="Hoofdnavigatie">
          <div class="cws-brand-block">
            <div class="cws-brand-mark">CWS</div>
            <div class="cws-brand-copy">
              <div class="cws-brand-title">NEN-1090</div>
              <div class="cws-brand-sub">PLATFORM</div>
            </div>
          </div>
          <nav class="cws-side-nav">
            <a class="cws-side-link" data-route="start" href="#"><span class="cws-side-icon" data-cws-icon="home"></span><span>Dashboard</span></a>
            <a class="cws-side-link" data-route="projects" href="#"><span class="cws-side-icon" data-cws-icon="folder"></span><span>Projecten</span></a>
            <a class="cws-side-link" data-route="welds" href="#"><span class="cws-side-icon" data-cws-icon="shield"></span><span>Lascontrole</span></a>
            <a class="cws-side-link" data-route="ce" href="#"><span class="cws-side-icon" data-cws-icon="doc"></span><span>CE Dossier</span></a>
            <a class="cws-side-link" data-route="settings" href="#"><span class="cws-side-icon" data-cws-icon="gear"></span><span>Instellingen</span></a>
          </nav>
          <div class="cws-sidebar-footer" hidden>
            <div class="cws-user-chip">
              <div class="cws-user-avatar" id="desktopUserAvatar">HJ</div>
              <div>
                <div class="cws-user-name" id="sidebarUserName">Gebruiker</div>
                <div class="cws-user-role"><span id="rolePill">Tenant admin</span></div>
              </div>
            </div>
          </div>
        </aside>

        <header class="headerbar">
          <div class="left header-main">
            <button class="btn compact icononly" id="openApps" title="Apps menu" aria-label="Apps menu">${icon('menu')}</button>
            <div class="mobile-inline-brand">
              <div class="mobile-brand-mark">CWS</div>
              <div class="mobile-brand-copy">
                <div class="mobile-brand-title">NEN-1090</div>
                <div class="mobile-brand-sub">PLATFORM</div>
              </div>
            </div>
            <div class="header-title-wrap">
              <div class="header-overline">CWS NEN-1090 Platform</div>
              <div id="moduleTitle" class="header-title">-</div>
            </div>
          </div>
          <div class="header-center">
            <label class="cws-top-search">
              <span class="search-icon" data-cws-icon="search"></span>
              <input type="search" placeholder="Zoeken..." aria-label="Zoeken" />
            </label>
          </div>
          <div class="right header-actions">
            <button class="btn compact ghost" id="authBtn" title="Login / Logout">Login</button>
            <div class="cws-user-menu">
              <div class="cws-user-avatar" id="desktopUserAvatarTop">HJ</div>
              <div class="cws-user-meta">
                <span class="cws-user-name-top" id="userPill">Niet ingelogd</span>
                <span class="developer-meta" hidden>Rol: <span id="rolePillMobile">Admin</span></span>
              </div>
            </div>
            
            <div class="mobile-inline-title" id="mobileModuleTitle">-</div>
          </div>
        </header>
      </div>
    `);

    const backdrop = el(`
      <div class="modal-backdrop" id="appsBackdrop" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            Apps menu
            <button class="close" id="closeApps" aria-label="Sluiten">✕</button>
          </div>
          <div class="modal-body">
            <div class="apps-grid" id="appsGrid"></div>
          </div>
          <div class="footerbar" id="appsFooter">0 projecten • Pagina 1 van 1</div>
        </div>
      </div>
    `);

    const mobileDrawerBackdrop = el(`<div class="mobile-drawer-backdrop" id="mobileDrawerBackdrop"></div>`);
    const mobileDrawer = el(`
      <div class="mobile-drawer-sheet" id="mobileDrawerSheet" aria-hidden="true">
        <div class="mobile-drawer-head">
          <div>
            <div class="mobile-drawer-title">Menu</div>
            <div class="mobile-module-caption">Navigatie en account</div>
          </div>
          <button class="btn compact" id="mobileDrawerClose" aria-label="Sluiten">Sluiten</button>
        </div>
        <div class="mobile-drawer-grid" id="mobileDrawerGrid"></div>
      </div>
    `);

    const bottomNav = el(`
      <nav class="mobile-bottom-nav" id="mobileBottomNav" aria-label="Mobiele navigatie">
        <a class="mobile-bottom-link" data-route="start" href="#">${icon('home')}<span>Home</span></a>
        <a class="mobile-bottom-link" data-route="projects" href="#">${icon('folder')}<span>Projecten</span></a>
        <a class="mobile-bottom-link" data-route="welds" href="#">${icon('shield')}<span>Lassen</span></a>
        <a class="mobile-bottom-link" data-route="ce" href="#">${icon('doc')}<span>CE</span></a>
        <button class="mobile-bottom-link mobile-bottom-link-menu" data-route="menu" type="button">${icon('menu')}<span>Meer</span></button>
      </nav>
    `);

    const toast = el(`<div class="toast" id="toast"></div>`);

    document.body.prepend(bottomNav);
    document.body.prepend(mobileDrawer);
    document.body.prepend(mobileDrawerBackdrop);
    document.body.prepend(toast);
    document.body.prepend(backdrop);
    document.body.prepend(shell);
    try{ window.CWSIcons && window.CWSIcons.hydrate && window.CWSIcons.hydrate(document.body); }catch(_){ }

    const ro = el(`<div class="readonly-banner" id="readonlyBanner" style="display:none"><div class="readonly-inner"><b>Read-only:</b> deze tenant kan op dit moment niet wijzigen. Ga naar <span class="linklike" data-open-billing>Abonnement</span>.</div></div>`);
    document.body.insertBefore(ro, shell.nextSibling);
    try{ ro.querySelector('[data-open-billing]')?.addEventListener('click', ()=>{ window.location.href = (window.CWS_ROUTES && window.CWS_ROUTES.billing) || ((window.__APP_ROOT__ || '.') + '/layers/tenant_billing.html'); }); }catch{}

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
        const raw = localStorage.getItem('TENANT_READONLY_REASONS');
        if(!raw) return;
        const arr = JSON.parse(raw); const list = Array.isArray(arr) ? arr : [];
        const b = document.getElementById('readonlyBanner'); if(!b) return;
        const inner = b.querySelector('.readonly-inner'); if(!inner) return;
        const reasonsHtml = list.length ? `<ul class="readonly-reasons">` + list.map(r=>`<li>${UI.esc(_formatReason(r))}</li>`).join('') + `</ul>` : '';
        if(!inner.querySelector('.readonly-reasons')) inner.insertAdjacentHTML('beforeend', reasonsHtml);
      }catch{}
    }
    function showReadonly(){ const b=document.getElementById('readonlyBanner'); if(!b) return; b.style.display='block'; _renderReadonlyReasons(); try{ window.UI && window.UI.toast && window.UI.toast('Tenant is read-only'); }catch{} }
    if(localStorage.getItem('TENANT_READONLY')==='1') showReadonly();
    window.addEventListener('tenant:readonly', ()=>showReadonly());

    function getActiveProject(){
      try{
        const st = window.CWS.getState();
        const id = st.ui.activeProjectId;
        if(id && st.projects.byId[id]) return st.projects.byId[id];
        const first = st.projects.order && st.projects.order[0];
        if(first && st.projects.byId[first]){ st.ui.activeProjectId = first; window.CWS.setState(st); return st.projects.byId[first]; }
      }catch{}
      return null;
    }

    function initialsFromUser(text){
      const raw = String(text || '').trim();
      if(!raw || raw.toLowerCase().includes('niet ingelogd') || raw.toLowerCase().includes('not logged') || raw.toLowerCase().includes('gastmodus')) return 'HJ';
      const clean = raw.split('@')[0].replace(/[._-]+/g,' ').trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      return (parts.slice(0,2).map(p=>p[0].toUpperCase()).join('') || raw.slice(0,2).toUpperCase());
    }

    function refreshProjectPill(){
      const p = getActiveProject();
      ['projectPill','projectPillMobile'].forEach((id)=>{
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.textContent = 'Project: ' + (p ? p.nummer : '-');
        btn.dataset.pid = p ? p.id : '';
      });
    }

    function syncHeaderPills(){
      const apiStatus = document.getElementById('apiStatus')?.textContent || 'off';
      const user = document.getElementById('userPill')?.textContent || 'Gastmodus';
      const role = document.getElementById('rolePill')?.textContent || 'Admin';
      const mobileApi = document.getElementById('apiStatusMobile');
      const mobileUser = document.getElementById('userPillMobile');
      const mobileRole = document.getElementById('rolePillMobile');
      if(mobileApi) mobileApi.textContent = apiStatus;
      if(mobileUser) mobileUser.textContent = user;
      if(mobileRole) mobileRole.textContent = role;
      const moduleText = document.getElementById('moduleTitle')?.textContent || document.body.getAttribute('data-title') || 'CWS NEN-1090';
      const mobileTitle = document.getElementById('mobileModuleTitle');
      if(mobileTitle) mobileTitle.textContent = moduleText;
      const label = user && !String(user).toLowerCase().includes('niet ingelogd') ? user : 'Gebruiker';
      const initials = initialsFromUser(user);
      const sidebarUserName = document.getElementById('sidebarUserName'); if(sidebarUserName) sidebarUserName.textContent = label;
      const desktopUserAvatar = document.getElementById('desktopUserAvatar'); if(desktopUserAvatar) desktopUserAvatar.textContent = initials;
      document.getElementById('desktopUserAvatarTop').textContent = initials;
    }

    function buildMobileDrawer(){
      const grid = document.getElementById('mobileDrawerGrid'); if(!grid) return;
      grid.innerHTML = `
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.start}"><span>Dashboard</span><small>Start en overzicht</small></a>
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.projects}"><span>Projecten</span><small>Projectlijst en beheer</small></a>
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.welds}"><span>Lascontrole</span><small>Inspecties en welds</small></a>
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.ce}"><span>CE dossier</span><small>Export en dossierstatus</small></a>
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.settings}"><span>Instellingen</span><small>Configuratie</small></a>
        <a class="mobile-drawer-link" href="${window.CWS_ROUTES.admin}"><span>Superadmin</span><small>Tenantbeheer</small></a>
      `;
    }

    function setBottomNavState(){
      const active = routeKey();
      document.querySelectorAll('.cws-side-link[data-route]').forEach((a)=>{
        const route = a.getAttribute('data-route');
        const map = {start: window.CWS_ROUTES.start, projects: window.CWS_ROUTES.projects, welds: window.CWS_ROUTES.welds, settings: window.CWS_ROUTES.settings, admin: window.CWS_ROUTES.admin, billing: window.CWS_ROUTES.billing};
        a.href = map[route] || '#';
        a.classList.toggle('active', route === active || (active==='billing' && route==='billing'));
      });
      document.querySelectorAll('#mobileBottomNav .mobile-bottom-link[data-route]').forEach((el)=>{
        const route = el.getAttribute('data-route');
        el.classList.toggle('active', route === active);
        if(el.tagName === 'A' && route !== 'menu'){
          const map = {start: window.CWS_ROUTES.start, projects: window.CWS_ROUTES.projects, welds: window.CWS_ROUTES.welds, ce: window.CWS_ROUTES.ce, billing: window.CWS_ROUTES.billing};
          el.href = map[route] || '#';
        }
      });
    }

    function openMobileDrawer(){
      document.getElementById('mobileDrawerBackdrop')?.classList.add('show');
      document.getElementById('mobileDrawerSheet')?.classList.add('show');
      document.getElementById('mobileDrawerSheet')?.setAttribute('aria-hidden','false');
    }
    function closeMobileDrawer(){
      document.getElementById('mobileDrawerBackdrop')?.classList.remove('show');
      document.getElementById('mobileDrawerSheet')?.classList.remove('show');
      document.getElementById('mobileDrawerSheet')?.setAttribute('aria-hidden','true');
    }

    function clearAuthArtifacts(){
      try{ if(window.Auth && typeof window.Auth.clearTokens === 'function') window.Auth.clearTokens(); }catch{}
      ['auth_token','nen1090.auth.access','nen1090.auth.refresh','nen1090.auth.email','nen1090.auth.tenant'].forEach((key)=>{ try{ localStorage.removeItem(key); }catch{} });
      try{ if(window.CWS && window.CWS.getState && window.CWS.setState){ const st = window.CWS.getState(); st.projects.byId = {}; st.projects.order = []; st.ui.activeProjectId = ''; window.CWS.setState(st); } }catch{}
    }

    function openProjectPicker(){
      const st = window.CWS.getState();
      const list = (st.projects.order||[]).map(id=>st.projects.byId[id]).filter(Boolean);
      const active = st.ui.activeProjectId || '';
      const body = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;"><input class="input" id="pp_q" placeholder="Zoek project" /></div>
        <div class="table-wrap"><table><thead><tr><th>Nr</th><th>Naam</th><th>Opdrachtgever</th><th>Status</th></tr></thead><tbody id="pp_rows">${list.map(p=>`
          <tr data-id="${UI.esc(p.id)}" class="${p.id===active?'row-active':''}">
            <td>${UI.esc(p.nummer)}</td><td>${UI.esc(p.naam||'')}</td><td>${UI.esc(p.opdrachtgever||'')}</td><td><span class="badge" style="background:${p.status==='locked'?'#111827':'var(--st-incontrole)'}">${UI.esc(p.status||'')}</span></td>
          </tr>`).join('')}</tbody></table></div>`;
      UI.openModal({ title:'Project kiezen', saveLabel:'Sluiten', bodyHtml: body, onSave: ({close})=>close() });
      const q = document.getElementById('pp_q');
      const tbody = document.getElementById('pp_rows');
      function applyFilter(){ const s = (q.value||'').toLowerCase().trim(); [...tbody.querySelectorAll('tr[data-id]')].forEach(tr=>{ const t = tr.textContent.toLowerCase(); tr.style.display = (!s || t.includes(s)) ? '' : 'none'; }); }
      q.addEventListener('input', applyFilter);
      UI.bindRowDblClick(tbody, (id)=>{
        const st2 = window.CWS.getState(); st2.ui.activeProjectId = id; window.CWS.setState(st2); refreshProjectPill(); syncProjectsIntoStore();
        try{ window.dispatchEvent(new CustomEvent('cws_project_changed', {detail:{id}})); }catch{}
        UI.toast('Project gekozen.'); document.getElementById('uiModalClose').click();
      });
    }

    function annotateMobileTables(root){
      const scope = root || document;
      scope.querySelectorAll('table.mobile-cards').forEach((table)=>{
        const headers = [...table.querySelectorAll('thead th')].map((th)=>th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach((tr)=>{ [...tr.children].forEach((td, idx)=>{ if(td.tagName !== 'TD') return; if(!td.getAttribute('data-label')) td.setAttribute('data-label', headers[idx] || ''); }); });
      });
    }
    window.MobileUI = { annotateAll: annotateMobileTables, enableAuto(root){ const target = root || document.body; annotateMobileTables(target); if(target.__mobileObserver) return; const obs = new MutationObserver(()=>annotateMobileTables(target)); obs.observe(target, {childList:true, subtree:true}); target.__mobileObserver = obs; } };

    buildMobileDrawer();
    setBottomNavState();
    refreshProjectPill();
    syncHeaderPills();
    document.getElementById('mobileDrawerBackdrop')?.addEventListener('click', closeMobileDrawer);
    document.getElementById('mobileDrawerClose')?.addEventListener('click', closeMobileDrawer);
    document.querySelector('#mobileBottomNav [data-route="menu"]')?.addEventListener('click', openMobileDrawer);
    document.getElementById('openApps')?.addEventListener('click', ()=>{ try{ AppsMenu.open(); }catch{} });
    ['projectPill','projectPillMobile'].forEach((id)=>{ document.getElementById(id)?.addEventListener('click', ()=>{ try{ openProjectPicker(); }catch(e){ console.error(e); UI.toast('Project picker fout.'); } }); });
    document.getElementById('roleToggle')?.addEventListener('click', ()=>{ const next = window.CWS.toggleRole(); document.getElementById('rolePill').textContent = next; syncHeaderPills(); UI.toast('Rol: ' + next); });

    async function syncProjectsIntoStore(){
      try{
        if(!window.Auth || !window.CWS || !window.CWS.getState) return false;
        const token = (window.Auth.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
        if(!token) return false;
        const list = await window.Auth.projects.list();
        const st = window.CWS.getState();
        const prevActive = st.ui.activeProjectId || '';
        const prevCode = (prevActive && st.projects.byId[prevActive] && st.projects.byId[prevActive].nummer) ? st.projects.byId[prevActive].nummer : '';
        st.projects.byId = {}; st.projects.order = [];
        (list||[]).forEach(p=>{ const lp = { id:p.id, nummer:p.code||'', naam:p.name||'', opdrachtgever:p.client_name||'', exc:p.execution_class||'', acceptatieklasse:p.acceptance_class||'', status:p.status||'in_controle', locked:!!p.locked, laatstGewijzigd:(p.updated_at||p.created_at||'').toString() }; st.projects.byId[lp.id]=lp; st.projects.order.push(lp.id); });
        if(prevCode){ const matchId = st.projects.order.find(id => (st.projects.byId[id]?.nummer||'') === prevCode); if(matchId) st.ui.activeProjectId = matchId; }
        if(!st.ui.activeProjectId && st.projects.order.length) st.ui.activeProjectId = st.projects.order[0];
        window.CWS.setState(st); refreshProjectPill(); return true;
      }catch(e){ console.error(e); return false; }
    }

    async function updateApiUi(){
      const stEl = document.getElementById('apiStatus');
      const apiPill = document.getElementById('apiPill');
      const u = document.getElementById('userPill');
      const btn = document.getElementById('authBtn');
      if(!stEl || !btn || !window.Auth) return;
      const now = Date.now();
      window.__apiUiCache = window.__apiUiCache || { ts:0, health:null, me:null };
      const cache = window.__apiUiCache;
      let health = cache.health;
      if(!health || (now - cache.ts) > 4000){ health = await window.Auth.health().catch((e)=>({ok:false, _err:e && (e.code||e.message||String(e))})); cache.health = health; cache.ts = now; }
      if(health && health.ok){ stEl.textContent = (health.db || 'on'); stEl.style.color = '#065f46'; } else { stEl.textContent = 'off'; stEl.style.color = '#7f1d1d'; }
      const token = (window.Auth.getAccessToken && window.Auth.getAccessToken()) || localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
      let me = null; if(token && health && health.ok){ me = await window.Auth.me().catch(()=>null); }
      window.__AUTH_ME__ = me;
      if(!me && !token) clearAuthArtifacts();
      if(u){ if(me && me.email){ u.textContent = me.email; } else u.textContent = 'Gastmodus'; }
      const rp = document.getElementById('rolePill'); if(rp){ rp.textContent = (me && me.role) ? me.role : (window.CWS && window.CWS.getState ? window.CWS.getState().ui.role : ''); }
      btn.textContent = (me && me.email) ? 'Uitloggen' : 'Login';
      if(me && me.email){ try{ await syncProjectsIntoStore(); }catch{} }
      if(apiPill && !apiPill.__bound){ apiPill.__bound = true; apiPill.addEventListener('click', ()=>{ try{ window.location.href = (window.__APP_ROOT__ || '.') + '/layers/instellingen.html#api'; }catch{} }); }
      syncHeaderPills();
    }

    document.getElementById('authBtn')?.addEventListener('click', async ()=>{
      if(!window.Auth) return UI.toast('Auth client ontbreekt.');
      const me = await window.Auth.me().catch(()=>null);
      const root = (window.CWS_ROUTES && window.CWS_ROUTES.root) || ((String(location.href||'').includes('/layers/')) ? '..' : '.');
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      if(me && me.email){
        try{ await window.Auth.logout(); }catch{}
        clearAuthArtifacts();
        try{ window.dispatchEvent(new Event('auth-changed')); }catch{}
        try{ window.dispatchEvent(new Event('cws_projects_changed')); }catch{}
        location.href = root + '/login.html';
        return;
      }
      location.href = root + '/login.html?next=' + next;
    });

    window.addEventListener('auth-changed', async ()=>{ try{ window.__apiHealthCache = {ts:0, val:{ok:false}}; }catch{} await updateApiUi(); try{ await syncProjectsIntoStore(); }catch{} try{ syncHeaderPills(); refreshProjectPill(); }catch{} });
    updateApiUi().then(()=>{ try{ syncHeaderPills(); }catch{} });

    AppsMenu.render();
    AppsMenu.bind();
    try{ window.MobileUI.enableAuto(document.body); }catch{}

    const t = document.body.getAttribute('data-title') || document.title || '';
    const mt = document.getElementById('moduleTitle');
    if(mt) mt.textContent = t;
    syncHeaderPills();
  }

  window.Shell = { mount };
})();
