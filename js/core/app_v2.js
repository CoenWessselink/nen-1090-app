(function(){
  const STORAGE_KEY = 'cws-phase4-state';
  const SETTINGS_KEY = 'cws-phase4-settings';
  const API_META_KEY = 'cws-phase4-api-meta';
  const API_BASE = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1';
  const REQUEST_TIMEOUT_MS = 5000;

  const routes = {
    dashboard:'dashboard.html',
    projecten:'projecten.html',
    projectdetail:'project_detail.html',
    lascontrole:'lascontrole.html',
    ce:'ce_dossier.html',
    instellingen:'instellingen.html'
  };

  const names = {
    dashboard:'Dashboard',
    projecten:'Projecten',
    projectdetail:'Project 360',
    lascontrole:'Lascontrole',
    ce:'CE Dossier',
    instellingen:'Instellingen'
  };

  const searchPlaceholders = {
    dashboard:'Zoeken naar project, las of dossier…',
    projecten:'Zoek projectnummer, opdrachtgever of status…',
    projectdetail:'Zoek binnen project, historie of documenten…',
    lascontrole:'Zoek lasnummer, onderdeel of controlepunt…',
    ce:'Zoek documentgroep, certificaat of export…',
    instellingen:'Zoek gebruiker, instelling of template…'
  };

  const base = '../layers/';
  let initPromise = null;

  function seedState(){
    return {
      selectedProjectId: 'L-001-1',
      lastSyncedAt: null,
      syncSource: 'demo-local',
      projects: [
        {
          id: 'L-001-1',
          name: 'Kolom A1 / Ligger 1',
          client: 'Bouwbedrijf Delta',
          exc: 'EXC3/C',
          status: 'Conform',
          nextStep: 'CE review en vrijgave',
          progress: 92,
          location: 'Dronten',
          owner: 'Hans Planner',
          notes: 'Project zit in afrondende fase richting CE-export.',
          welds: [
            { id:'WL-001', part:'Kolom A1', process:'MAG 135', status:'Conform', ndt:'OK', docs:true },
            { id:'WL-002', part:'Ligger 1', process:'MAG 135', status:'Conform', ndt:'OK', docs:true },
            { id:'WL-003', part:'Knoopplaat A', process:'MAG 135', status:'In controle', ndt:'Open', docs:true }
          ],
          documents: { material: true, welders: true, wps: true, ndt: false, delivery: true },
          attachments: {
            material: ['Materiaalcertificaat-3.1-L001.pdf'],
            welders: ['Lasserscertificaat-Jan.pdf'],
            wps: ['WPS-135-A1.pdf'],
            ndt: [],
            delivery: ['Opleverdossier-concept.pdf']
          },
          exports: [
            { date:'15-03-2026', label:'Concept export gegenereerd voor interne review' },
            { date:'13-03-2026', label:'Dossierstructuur geïnitialiseerd' }
          ],
          history: ['Project aangemaakt', 'Lascontrole bijgewerkt', 'CE dossier voorbereid']
        },
        {
          id: 'L-002-1',
          name: 'Kolom A2 / Ligger 1',
          client: 'Woningbouwgroep',
          exc: 'EXC2/A',
          status: 'In controle',
          nextStep: 'NDT upload en acceptatie',
          progress: 68,
          location: 'Kampen',
          owner: 'Coen QC',
          notes: 'Nog 1 NDT rapport open en materiaalset controleren.',
          welds: [
            { id:'WL-004', part:'Kolom A2', process:'MAG 135', status:'In controle', ndt:'Open', docs:true },
            { id:'WL-005', part:'Ligger 1', process:'MAG 135', status:'Conform', ndt:'OK', docs:true },
            { id:'WL-006', part:'Steunplaat', process:'TIG 141', status:'Repair required', ndt:'Open', docs:false }
          ],
          documents: { material: true, welders: true, wps: true, ndt: false, delivery: false },
          attachments: {
            material: ['Materiaalcertificaat-L002.pdf'],
            welders: ['Lasserscertificaat-Piet.pdf'],
            wps: ['WPQR-TIG-141.pdf'],
            ndt: [],
            delivery: []
          },
          exports: [],
          history: ['Project gestart', '2 lassen conform', '1 reparatie open']
        },
        {
          id: 'L-003-1',
          name: 'Stijgpunt B1 / Console',
          client: 'Recos Vastgoed',
          exc: 'EXC1/A',
          status: 'Concept',
          nextStep: 'Projectbasis aanvullen',
          progress: 34,
          location: 'Zwolle',
          owner: 'Admin CWS',
          notes: 'Conceptproject, nog geen complete dossierdata.',
          welds: [
            { id:'WL-007', part:'Console', process:'MAG 135', status:'Concept', ndt:'N.v.t.', docs:false }
          ],
          documents: { material: false, welders: false, wps: true, ndt: false, delivery: false },
          attachments: {
            material: [],
            welders: [],
            wps: ['WPS-console.pdf'],
            ndt: [],
            delivery: []
          },
          exports: [],
          history: ['Conceptproject aangemaakt']
        }
      ]
    };
  }

  function readState(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      try {
        const parsed = JSON.parse(raw);
        parsed.projects = (parsed.projects || []).map(normalizeProject);
        return parsed;
      } catch(e) {}
    }
    const seed = seedState();
    writeState(seed);
    return seed;
  }

  function writeState(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function readSettings(){
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(raw){
      try { return JSON.parse(raw); } catch(e) {}
    }
    const seed = {
      organisationName: 'CWS NEN-1090',
      defaultExc: 'EXC3',
      projectPrefix: 'L-',
      twoFactor: 'Ja',
      sessionTimeout: '30 minuten'
    };
    writeSettings(seed);
    return seed;
  }

  function writeSettings(settings){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function readApiMeta(){
    const raw = localStorage.getItem(API_META_KEY);
    if(raw){
      try { return JSON.parse(raw); } catch(e) {}
    }
    const meta = { online:false, mode:'Lokale demo-data', lastCheckedAt:null, lastError:null };
    writeApiMeta(meta);
    return meta;
  }

  function writeApiMeta(meta){
    localStorage.setItem(API_META_KEY, JSON.stringify(meta));
  }

  function pageKey(){
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    if(p.includes('project_detail')) return 'projectdetail';
    if(p.includes('projecten')) return 'projecten';
    if(p.includes('lascontrole')) return 'lascontrole';
    if(p.includes('ce_dossier')) return 'ce';
    if(p.includes('instellingen')) return 'instellingen';
    return 'dashboard';
  }

  function getProjectIdFromUrl(){
    return new URLSearchParams(location.search).get('id');
  }

  function normalizeProject(project){
    const normalized = {
      id: project.id || project.code || `P-${Date.now()}`,
      name: project.name || project.title || 'Project',
      client: project.client || project.customer || project.opdrachtgever || 'Onbekend',
      exc: project.exc || project.execution_class || 'EXC2/A',
      status: project.status || 'Concept',
      nextStep: project.nextStep || 'Volgende stap bepalen',
      progress: Number(project.progress || 0),
      location: project.location || '',
      owner: project.owner || project.project_manager || '',
      notes: project.notes || '',
      welds: Array.isArray(project.welds) ? project.welds.map(w => ({
        id: w.id || w.code || `WL-${Math.random().toString().slice(2,5)}`,
        part: w.part || w.component || 'Onderdeel',
        process: w.process || w.weld_process || 'MAG 135',
        status: w.status || 'Concept',
        ndt: w.ndt || w.ndt_status || 'Open',
        docs: Boolean(w.docs ?? w.documents_complete ?? false)
      })) : [],
      documents: {
        material: Boolean(project.documents?.material ?? project.material_complete ?? false),
        welders: Boolean(project.documents?.welders ?? project.welders_complete ?? false),
        wps: Boolean(project.documents?.wps ?? project.wps_complete ?? true),
        ndt: Boolean(project.documents?.ndt ?? project.ndt_complete ?? false),
        delivery: Boolean(project.documents?.delivery ?? project.delivery_complete ?? false)
      },
      attachments: {
        material: project.attachments?.material || [],
        welders: project.attachments?.welders || [],
        wps: project.attachments?.wps || [],
        ndt: project.attachments?.ndt || [],
        delivery: project.attachments?.delivery || []
      },
      exports: Array.isArray(project.exports) ? project.exports : [],
      history: Array.isArray(project.history) ? project.history : []
    };
    if(!normalized.history.length) normalized.history = ['Project ingelezen'];
    updateDerivedFields(normalized);
    return normalized;
  }

  function statusBadgeClass(status){
    const value = String(status || '').toLowerCase();
    if(['conform','approved','ok','gereed'].some(x => value.includes(x))) return 'badge-success';
    if(['afgekeurd','rejected','blocked'].some(x => value.includes(x))) return 'badge-danger';
    if(['in controle','repair','actie','open'].some(x => value.includes(x))) return 'badge-warning';
    if(['concept'].some(x => value.includes(x))) return 'badge-soft';
    return 'badge-primary';
  }

  function nav(active){
    const items = [['dashboard','⌂'],['projecten','▣'],['lascontrole','✓'],['ce','▤'],['instellingen','⚙']];
    return items.map(([k, icon]) => `
      <a class="${k === active ? 'is-active' : ''}" href="${base}${routes[k]}">
        <span class="ico">${icon}</span><span>${names[k]}</span>
      </a>`).join('');
  }

  function mobileNav(active){
    const items = [['dashboard','⌂','Home'],['projecten','▣','Projecten'],['lascontrole','✓','Lassen'],['ce','▤','CE'],['instellingen','⚙','Meer']];
    return items.map(([k, icon, label]) => `
      <a class="${k === active ? 'is-active' : ''}" href="${base}${routes[k]}">
        <span>${icon}</span><span>${label}</span>
      </a>`).join('');
  }

  function toast(msg, kind){
    let stack = document.querySelector('.toast-stack');
    if(!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${kind ? `toast-${kind}` : ''}`.trim();
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function showLoading(message){
    let overlay = document.querySelector('.loading-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `<div class="loading-card"><div class="spinner"></div><strong id="loadingMessage">Laden…</strong></div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#loadingMessage').textContent = message || 'Laden…';
    overlay.classList.add('is-open');
  }

  function hideLoading(){
    const overlay = document.querySelector('.loading-overlay');
    if(overlay) overlay.classList.remove('is-open');
  }

  function ensureDrawer(){
    let mask = document.querySelector('.drawer-mask');
    if(mask) return mask;
    mask = document.createElement('div');
    mask.className = 'drawer-mask';
    mask.innerHTML = `
      <aside class="drawer">
        <div class="section-title">
          <div><h2>Actie</h2><p id="drawer-sub">Details</p></div>
          <button class="btn" type="button" id="drawer-close">Sluiten</button>
        </div>
        <div id="drawer-body"></div>
      </aside>`;
    document.body.appendChild(mask);
    mask.addEventListener('click', e => { if(e.target === mask) closeDrawer(); });
    mask.querySelector('#drawer-close').addEventListener('click', closeDrawer);
    return mask;
  }

  function openDrawer(title, subtitle, html){
    const mask = ensureDrawer();
    mask.classList.add('is-open');
    mask.querySelector('h2').textContent = title;
    mask.querySelector('#drawer-sub').textContent = subtitle || '';
    mask.querySelector('#drawer-body').innerHTML = html;
  }

  function closeDrawer(){
    const mask = document.querySelector('.drawer-mask');
    if(mask) mask.classList.remove('is-open');
  }

  function mountShell(){
    const active = pageKey();
    const state = readState();
    const content = document.getElementById('page-content');
    const preserved = content ? content.cloneNode(true) : document.createElement('div');
    const app = document.createElement('div');
    app.className = 'cws-app';
    app.innerHTML = `
      <aside class="cws-sidebar">
        <a class="cws-brand" href="${base}${routes.dashboard}">
          <div class="cws-brand-logo"></div>
          <div class="cws-brand-copy"><strong>CWS NEN-1090</strong><span>SOFTWAREPLATFORM</span></div>
        </a>
        <nav class="cws-nav">${nav(active)}</nav>
        <div class="cws-sidebar-flow">
          <strong>Vaste workflow</strong>
          <span>Project → Lassen → Inspectie → Documentatie → CE-dossier → Export</span>
        </div>
        <div class="cws-sidebar-footer">
          <strong>Fase 3 build actief</strong>
          <span>${state.projects.length} projecten, API-bridge met lokale fallback en export-/documentflow.</span>
        </div>
      </aside>
      <main class="cws-main">
        <header class="cws-topbar">
          <label class="cws-search">
            <span>⌕</span>
            <input type="search" id="globalSearch" placeholder="${searchPlaceholders[active]}" aria-label="Zoeken">
          </label>
          <div class="cws-top-actions">
            <button class="cws-chip cws-chip-button" id="apiStatusBtn" data-action="sync-api">API status laden</button>
            <div class="cws-pill">demo@cws.app</div>
            <div class="cws-avatar">C</div>
          </div>
        </header>
        <div class="page" id="appPage"></div>
      </main>
      <nav class="mobile-bottom">${mobileNav(active)}</nav>`;

    document.body.innerHTML = '';
    document.body.appendChild(app);
    document.getElementById('appPage').appendChild(preserved);
    bindUI();
  }

  function bindSubtabs(){
    document.querySelectorAll('.subtabs').forEach(group => {
      group.querySelectorAll('.subtab').forEach(tab => tab.addEventListener('click', () => {
        group.querySelectorAll('.subtab').forEach(x => x.classList.remove('is-active'));
        tab.classList.add('is-active');
        const target = tab.dataset.target;
        if(target){
          const host = group.closest('[data-tabs-host]') || document;
          host.querySelectorAll('[data-tab-panel]').forEach(panel => {
            panel.hidden = panel.dataset.tabPanel !== target;
          });
        }
        if(tab.dataset.statusFilter) applyProjectStatusFilter(tab.dataset.statusFilter);
        if(tab.dataset.weldFilter) applyWeldFilter(tab.dataset.weldFilter);
      }));
    });
  }

  function applyProjectStatusFilter(filter){
    document.querySelectorAll('[data-project-row]').forEach(row => {
      const status = row.dataset.status;
      row.style.display = filter === 'all' || status === filter ? '' : 'none';
    });
  }

  function applyWeldFilter(filter){
    document.querySelectorAll('[data-weld-row]').forEach(row => {
      const status = row.dataset.status;
      row.style.display = filter === 'all' || status === filter ? '' : 'none';
    });
  }

  function withTimeout(promise, ms){
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
  }

  async function apiRequest(path, options){
    const headers = { 'Content-Type':'application/json', ...(options?.headers || {}) };
    const token = localStorage.getItem('cws-auth-token');
    if(token) headers.Authorization = `Bearer ${token}`;
    const response = await withTimeout(fetch(`${API_BASE}${path}`, { ...options, headers }), REQUEST_TIMEOUT_MS);
    if(!response.ok){
      throw new Error(`API ${response.status}`);
    }
    const type = response.headers.get('content-type') || '';
    if(type.includes('application/json')) return response.json();
    return response.text();
  }

  async function syncFromApi(forceToast){
    const meta = readApiMeta();
    try {
      const payload = await apiRequest('/projects');
      const list = Array.isArray(payload) ? payload : (payload?.items || payload?.results || payload?.data || []);
      if(Array.isArray(list) && list.length){
        const state = readState();
        state.projects = list.map(normalizeProject);
        state.selectedProjectId = state.projects[0]?.id || state.selectedProjectId;
        state.lastSyncedAt = new Date().toLocaleString('nl-NL');
        state.syncSource = 'api';
        writeState(state);
        writeApiMeta({ online:true, mode:'API gekoppeld', lastCheckedAt:new Date().toISOString(), lastError:null });
        updateApiChip();
        renderPage();
        if(forceToast) toast('Projecten opnieuw geladen vanaf API.', 'success');
        return true;
      }
      throw new Error('empty');
    } catch(error){
      writeApiMeta({ online:false, mode:'Lokale demo-data', lastCheckedAt:new Date().toISOString(), lastError:error.message });
      updateApiChip();
      if(forceToast) toast('API niet bereikbaar, lokale demo-data blijft actief.', 'warning');
      return false;
    }
  }

  async function persistProject(project, method){
    const meta = readApiMeta();
    if(!meta.online) return false;
    const payload = {
      id: project.id,
      name: project.name,
      client: project.client,
      opdrachtgever: project.client,
      exc: project.exc,
      status: project.status,
      notes: project.notes,
      location: project.location,
      owner: project.owner
    };
    try {
      if(method === 'POST') await apiRequest('/projects', { method:'POST', body: JSON.stringify(payload) });
      else await apiRequest(`/projects/${encodeURIComponent(project.id)}`, { method:'PUT', body: JSON.stringify(payload) });
      return true;
    } catch(error){
      toast('API opslaan mislukt, lokale state is wel bijgewerkt.', 'warning');
      return false;
    }
  }

  async function persistWeld(projectId, weld){
    const meta = readApiMeta();
    if(!meta.online) return false;
    try {
      await apiRequest('/welds', {
        method:'POST',
        body: JSON.stringify({ project_id: projectId, id: weld.id, part: weld.part, process: weld.process, status: weld.status, ndt: weld.ndt })
      });
      return true;
    } catch(error){
      return false;
    }
  }

  function updateApiChip(){
    const meta = readApiMeta();
    const btn = document.getElementById('apiStatusBtn');
    if(!btn) return;
    btn.textContent = meta.online ? 'API online' : 'Lokale demo';
    btn.classList.toggle('is-online', meta.online);
    btn.classList.toggle('is-offline', !meta.online);
    btn.title = meta.online ? 'Projectdata wordt opgehaald vanaf de API' : `Fallback actief${meta.lastError ? ` (${meta.lastError})` : ''}`;
  }

  function bindActions(){
    document.body.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if(!btn) return;
      e.preventDefault();
      const action = btn.dataset.action;
      const title = btn.dataset.title || btn.textContent.trim();
      const state = readState();
      const project = getCurrentProject(state);
      if(action === 'toast') toast(btn.dataset.message || `${title} opgeslagen.`);
      if(action === 'drawer') openDrawer(title, btn.dataset.subtitle || 'Fase 3 actie', btn.dataset.content || '<div class="notice">Deze actie is gekoppeld aan de fase 3 build.</div>');
      if(action === 'modal-project') return openProjectForm();
      if(action === 'open-project') return goToProject(btn.dataset.projectId || state.selectedProjectId);
      if(action === 'set-project') return selectProject(btn.dataset.projectId || btn.value);
      if(action === 'new-export') return createExport(project);
      if(action === 'toggle-doc') return toggleDoc(btn.dataset.docKey);
      if(action === 'mark-weld') return updateWeldStatus(btn.dataset.weldId, btn.dataset.status);
      if(action === 'add-weld') return addWeld(project);
      if(action === 'save-settings') return saveSettings();
      if(action === 'open-edit-project') return openProjectForm(project);
      if(action === 'complete-project') return completeProject(project);
      if(action === 'promote-project') return promoteProject(project);
      if(action === 'reset-demo') return resetDemo();
      if(action === 'sync-api') return forceSync();
      if(action === 'export-file') return createExport(project, true);
      if(action === 'simulate-inspection') return simulateInspection(project);
      if(action === 'delete-project') return deleteProject(btn.dataset.projectId || project?.id);
      if(action === 'clone-project') return cloneProject(btn.dataset.projectId || project?.id);
      if(action === 'open-next-step') return openNextStep(btn.dataset.projectId || project?.id);
      if(action === 'approve-ce') return approveCe(project);
      if(action === 'toggle-welder-docs') return quickSetDoc('welders', true);
    });

    document.body.addEventListener('change', e => {
      const input = e.target.closest('[data-upload-doc]');
      if(input) handleUpload(input.dataset.uploadDoc, input.files);
    });
  }

  function bindSearch(){
    document.querySelectorAll('input[type="search"][data-filter-target]').forEach(input => {
      input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        const target = document.querySelector(input.dataset.filterTarget);
        if(!target) return;
        target.querySelectorAll('[data-filter-row]').forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(value) ? '' : 'none';
        });
      });
    });
    const globalSearch = document.getElementById('globalSearch');
    if(globalSearch){
      globalSearch.addEventListener('keydown', e => {
        if(e.key !== 'Enter') return;
        const state = readState();
        const value = globalSearch.value.trim().toLowerCase();
        const match = state.projects.find(project => `${project.id} ${project.name} ${project.client}`.toLowerCase().includes(value));
        if(match){
          state.selectedProjectId = match.id;
          writeState(state);
          location.href = `${base}${routes.projectdetail}?id=${encodeURIComponent(match.id)}`;
        } else {
          toast('Geen match gevonden in de huidige projectset.', 'warning');
        }
      });
    }
  }

  function getCurrentProject(state){
    const id = getProjectIdFromUrl() || state.selectedProjectId || state.projects[0]?.id;
    return state.projects.find(project => project.id === id) || state.projects[0];
  }

  function selectProject(projectId){
    const state = readState();
    state.selectedProjectId = projectId;
    writeState(state);
    toast(`Project ${projectId} actief gemaakt.`, 'success');
    renderPage();
  }

  function goToProject(projectId){
    const state = readState();
    state.selectedProjectId = projectId;
    writeState(state);
    location.href = `${base}${routes.projectdetail}?id=${encodeURIComponent(projectId)}`;
  }

  function calculateCompleteness(project){
    const docs = Object.values(project.documents).filter(Boolean).length;
    const docsTotal = Object.keys(project.documents).length;
    const weldScore = project.welds.length ? Math.round(project.welds.reduce((sum, weld) => {
      const part = weld.status === 'Conform' ? 100 : weld.status === 'In controle' ? 60 : weld.status === 'Concept' ? 30 : 40;
      return sum + part;
    }, 0) / project.welds.length) : 0;
    return Math.round((weldScore * 0.6) + ((docs / docsTotal) * 100 * 0.4));
  }

  function deriveNextStep(project){
    if(!project.documents.material) return 'Materiaalcertificaten aanvullen';
    if(!project.documents.welders) return 'Lassersbevoegdheid valideren';
    if(!project.documents.ndt) return 'NDT rapport uploaden';
    if(project.welds.some(w => ['Repair required','In controle','Concept'].includes(w.status))) return 'Lascontrole afronden';
    if(!project.documents.delivery) return 'Opleverdocumenten toevoegen';
    return 'CE review en vrijgave';
  }

  function deriveStatus(project){
    if(project.welds.some(w => w.status === 'Repair required')) return 'In controle';
    if(project.welds.every(w => w.status === 'Conform') && Object.values(project.documents).every(Boolean)) return 'Conform';
    if(project.welds.some(w => w.status === 'Concept') && calculateCompleteness(project) < 40) return 'Concept';
    return 'In controle';
  }

  function updateDerivedFields(project){
    project.attachments = project.attachments || { material:[], welders:[], wps:[], ndt:[], delivery:[] };
    project.progress = calculateCompleteness(project);
    project.nextStep = deriveNextStep(project);
    project.status = deriveStatus(project);
  }

  function getWorkflowStage(project){
    if(project.status === 'Conform' && project.documents.delivery) return 'Vrijgave / export';
    if(Object.values(project.documents).filter(Boolean).length >= 3) return 'CE dossier';
    if(project.welds.some(w => w.status !== 'Concept')) return 'Lascontrole';
    return 'Projectopstart';
  }

  function getProjectBlockers(project){
    const blockers = [];
    if(!project.documents.material) blockers.push('Materiaalcertificaten ontbreken');
    if(!project.documents.welders) blockers.push('Lassersbevoegdheid ontbreekt');
    if(!project.documents.ndt) blockers.push('NDT rapport ontbreekt');
    if(project.welds.some(w => w.status === 'Repair required')) blockers.push('Reparatielas open');
    if(project.welds.some(w => w.status === 'Concept')) blockers.push('Nog conceptlassen aanwezig');
    if(!project.documents.delivery) blockers.push('Opleverdocumenten ontbreken');
    return blockers;
  }

  function getNextActionLink(project){
    const step = deriveNextStep(project);
    if(step.includes('Lascontrole')) return `lascontrole.html?id=${encodeURIComponent(project.id)}`;
    if(step.includes('NDT') || step.includes('document') || step.includes('Materiaal') || step.includes('Lassers')) return `ce_dossier.html?id=${encodeURIComponent(project.id)}`;
    return `project_detail.html?id=${encodeURIComponent(project.id)}`;
  }

  function quickSetDoc(key, value){
    const state = readState();
    const current = getCurrentProject(state);
    current.documents[key] = value;
    if(value && !current.attachments[key]?.length) current.attachments[key] = [`${key}-fase4.pdf`];
    current.history.unshift(`Documentgroep ${key} bijgewerkt vanuit snelle actie`);
    updateDerivedFields(current);
    writeState(state);
    toast('Snelle documentactie uitgevoerd.', 'success');
    renderPage();
  }

  function openNextStep(projectId){
    const state = readState();
    const project = state.projects.find(item => item.id === projectId) || getCurrentProject(state);
    location.href = `${base}${getNextActionLink(project)}`;
  }

  function deleteProject(projectId){
    const state = readState();
    const idx = state.projects.findIndex(item => item.id === projectId);
    if(idx === -1) return;
    const removed = state.projects[idx];
    state.projects.splice(idx,1);
    state.selectedProjectId = state.projects[0]?.id || null;
    writeState(state);
    toast(`Project ${removed.id} verwijderd uit lokale workflowset.`, 'success');
    if(pageKey() === 'projectdetail') location.href = `${base}${routes.projecten}`; else renderPage();
  }

  function cloneProject(projectId){
    const state = readState();
    const source = state.projects.find(item => item.id === projectId);
    if(!source) return;
    const clone = normalizeProject(JSON.parse(JSON.stringify(source)));
    clone.id = `${source.id}-COPY`;
    clone.name = `${source.name} kopie`;
    clone.history.unshift(`Gekloond van ${source.id}`);
    state.projects.unshift(clone);
    state.selectedProjectId = clone.id;
    writeState(state);
    toast(`Project ${clone.id} aangemaakt als kopie.`, 'success');
    renderPage();
  }

  function approveCe(project){
    const state = readState();
    const current = getCurrentProject(state);
    if(getProjectBlockers(current).length){
      toast('Vrijgave nog niet mogelijk: er zijn nog blokkades.', 'warning');
      return;
    }
    current.documents.delivery = true;
    current.exports.unshift({ date:new Date().toLocaleDateString('nl-NL'), label:'Vrijgave geaccordeerd in fase 4' });
    current.history.unshift('CE vrijgave verleend');
    updateDerivedFields(current);
    writeState(state);
    toast('CE-dossier vrijgegeven voor export.', 'success');
    renderPage();
  }

  function validateProjectPayload(payload){
    const errors = [];
    if(!payload.id || payload.id.trim().length < 3) errors.push('Projectnummer is verplicht en moet minimaal 3 tekens hebben.');
    if(!payload.name || payload.name.trim().length < 3) errors.push('Projectnaam is verplicht.');
    if(!payload.client || payload.client.trim().length < 2) errors.push('Opdrachtgever is verplicht.');
    return errors;
  }

  function openProjectForm(project){
    const current = project || { id:'', name:'', client:'', exc:'EXC2/A', location:'', owner:'', notes:'' };
    openDrawer(project ? 'Project wijzigen' : 'Nieuw project', project ? 'Project 360 aanpassen' : 'Projectbasis toevoegen', `
      <form id="projectForm" class="drawer-form">
        <div id="projectFormErrors"></div>
        <div class="field"><label>Projectnummer</label><input name="id" value="${current.id || ''}" ${project ? 'readonly' : ''} required></div>
        <div class="field"><label>Projectnaam</label><input name="name" value="${current.name || ''}" required></div>
        <div class="field"><label>Opdrachtgever</label><input name="client" value="${current.client || ''}" required></div>
        <div class="field"><label>Executieklasse</label><select name="exc"><option ${current.exc==='EXC1/A'?'selected':''}>EXC1/A</option><option ${current.exc==='EXC2/A'?'selected':''}>EXC2/A</option><option ${current.exc==='EXC3/C'?'selected':''}>EXC3/C</option></select></div>
        <div class="field"><label>Locatie</label><input name="location" value="${current.location || ''}"></div>
        <div class="field"><label>Projectleider</label><input name="owner" value="${current.owner || ''}"></div>
        <div class="field"><label>Notities</label><textarea name="notes">${current.notes || ''}</textarea></div>
        <div class="inline-actions"><button class="btn btn-primary" type="submit">Opslaan</button><button class="btn" type="button" id="drawer-close-2">Annuleren</button></div>
      </form>`);

    const form = document.getElementById('projectForm');
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const errors = validateProjectPayload(payload);
      const box = document.getElementById('projectFormErrors');
      if(errors.length){
        if(box) box.innerHTML = `<div class="notice notice-error">${errors.join('<br>')}</div>`;
        return;
      }
      showLoading(project ? 'Project bijwerken…' : 'Project aanmaken…');
      const state = readState();
      if(project){
        const found = state.projects.find(item => item.id === project.id);
        Object.assign(found, payload);
        found.history.unshift('Projectbasis bijgewerkt');
        updateDerivedFields(found);
        await persistProject(found, 'PUT');
      } else {
        const settings = readSettings();
        const newProject = normalizeProject({
          id: payload.id,
          name: payload.name,
          client: payload.client,
          exc: payload.exc || settings.defaultExc,
          location: payload.location,
          owner: payload.owner,
          notes: payload.notes,
          welds: [{ id:`WL-${String(state.projects.length + 7).padStart(3,'0')}`, part:'Nieuw onderdeel', process:'MAG 135', status:'Concept', ndt:'N.v.t.', docs:false }],
          documents: { material:false, welders:false, wps:true, ndt:false, delivery:false },
          attachments: { material:[], welders:[], wps:['WPS-startset.pdf'], ndt:[], delivery:[] },
          exports: [],
          history: ['Project aangemaakt vanuit fase 3 flow']
        });
        state.projects.unshift(newProject);
        state.selectedProjectId = newProject.id;
        await persistProject(newProject, 'POST');
      }
      writeState(state);
      hideLoading();
      closeDrawer();
      toast(project ? 'Project bijgewerkt.' : 'Project toegevoegd.', 'success');
      renderPage();
    });
  }

  async function updateWeldStatus(weldId, status){
    const state = readState();
    const project = getCurrentProject(state);
    const weld = project.welds.find(item => item.id === weldId);
    if(!weld) return;
    weld.status = status;
    weld.ndt = status === 'Conform' ? 'OK' : (status === 'Repair required' ? 'Open' : weld.ndt);
    weld.docs = status === 'Conform' ? true : weld.docs;
    project.history.unshift(`${weld.id} status gewijzigd naar ${status}`);
    updateDerivedFields(project);
    writeState(state);
    await persistWeld(project.id, weld);
    toast(`${weld.id} gewijzigd naar ${status}.`, 'success');
    renderPage();
  }

  function toggleDoc(key){
    const state = readState();
    const project = getCurrentProject(state);
    project.documents[key] = !project.documents[key];
    if(project.documents[key] && !project.attachments[key]?.length){
      project.attachments[key] = [`${key}-document.pdf`];
    }
    project.history.unshift(`Documentstatus ${key} aangepast`);
    updateDerivedFields(project);
    writeState(state);
    toast('Documentstatus bijgewerkt.', 'success');
    renderPage();
  }

  function downloadBlob(filename, text, mime){
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function createExport(project, forceDownload){
    const state = readState();
    const current = getCurrentProject(state);
    const exportRecord = {
      date: new Date().toLocaleDateString('nl-NL'),
      label: `CE export gegenereerd bij ${current.progress}% gereedheid`
    };
    current.exports.unshift(exportRecord);
    current.history.unshift('Nieuwe export gegenereerd');
    updateDerivedFields(current);
    writeState(state);
    const manifest = {
      generatedAt: new Date().toISOString(),
      project: { id: current.id, name: current.name, client: current.client, exc: current.exc, status: current.status },
      completeness: current.progress,
      documents: current.documents,
      attachments: current.attachments,
      welds: current.welds,
      exports: current.exports
    };
    if(forceDownload !== false){
      downloadBlob(`${current.id}_ce_export.json`, JSON.stringify(manifest, null, 2), 'application/json');
    }
    toast('Exportmanifest gegenereerd en download gestart.', 'success');
    renderPage();
  }

  async function addWeld(){
    const state = readState();
    const current = getCurrentProject(state);
    const next = current.welds.length + 1;
    const weld = { id:`WL-${String(next + 20).padStart(3,'0')}`, part:`Nieuw onderdeel ${next}`, process:'MAG 135', status:'Concept', ndt:'N.v.t.', docs:false };
    current.welds.push(weld);
    current.history.unshift('Nieuwe lasregel toegevoegd');
    updateDerivedFields(current);
    writeState(state);
    await persistWeld(current.id, weld);
    toast('Nieuwe las toegevoegd.', 'success');
    renderPage();
  }

  function completeProject(){
    const state = readState();
    const current = getCurrentProject(state);
    current.welds.forEach(weld => { weld.status = 'Conform'; weld.ndt = 'OK'; weld.docs = true; });
    Object.keys(current.documents).forEach(key => {
      current.documents[key] = true;
      if(!current.attachments[key].length) current.attachments[key].push(`${key}-compleet.pdf`);
    });
    current.history.unshift('Project volledig gereed gezet');
    updateDerivedFields(current);
    writeState(state);
    toast('Project gereed gezet voor CE review.', 'success');
    renderPage();
  }

  function promoteProject(){
    const state = readState();
    const current = getCurrentProject(state);
    current.status = current.status === 'Concept' ? 'In controle' : current.status;
    current.history.unshift(`Projectstatus handmatig gezet naar ${current.status}`);
    updateDerivedFields(current);
    writeState(state);
    toast('Projectstatus bijgewerkt.', 'success');
    renderPage();
  }

  function saveSettings(){
    const settings = readSettings();
    const organisationName = document.getElementById('organisationName');
    const defaultExc = document.getElementById('defaultExc');
    const projectPrefix = document.getElementById('projectPrefix');
    const twoFactor = document.getElementById('twoFactor');
    const sessionTimeout = document.getElementById('sessionTimeout');
    if(organisationName) settings.organisationName = organisationName.value;
    if(defaultExc) settings.defaultExc = defaultExc.value;
    if(projectPrefix) settings.projectPrefix = projectPrefix.value;
    if(twoFactor) settings.twoFactor = twoFactor.value;
    if(sessionTimeout) settings.sessionTimeout = sessionTimeout.value;
    writeSettings(settings);
    toast('Instellingen opgeslagen in lokale state.', 'success');
  }

  function resetDemo(){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(API_META_KEY);
    toast('Demo-state hersteld.', 'success');
    setTimeout(() => location.reload(), 300);
  }

  async function forceSync(){
    showLoading('API-verbinding controleren…');
    await syncFromApi(true);
    hideLoading();
  }

  function simulateInspection(){
    const state = readState();
    const current = getCurrentProject(state);
    const openWeld = current.welds.find(w => w.status !== 'Conform');
    if(!openWeld){
      toast('Alle lassen staan al op conform.', 'warning');
      return;
    }
    openWeld.status = 'Conform';
    openWeld.ndt = 'OK';
    openWeld.docs = true;
    current.history.unshift(`Inspectie afgerond voor ${openWeld.id}`);
    if(!current.documents.ndt) current.documents.ndt = true;
    updateDerivedFields(current);
    writeState(state);
    toast(`Inspectie gesimuleerd voor ${openWeld.id}.`, 'success');
    renderPage();
  }

  function handleUpload(docKey, files){
    if(!files || !files.length) return;
    const state = readState();
    const current = getCurrentProject(state);
    current.attachments[docKey] = current.attachments[docKey] || [];
    Array.from(files).forEach(file => current.attachments[docKey].push(file.name));
    current.documents[docKey] = true;
    current.history.unshift(`${files.length} document(en) toegevoegd aan ${docKey}`);
    updateDerivedFields(current);
    writeState(state);
    toast(`${files.length} document(en) gekoppeld aan ${docKey}.`, 'success');
    renderPage();
  }

  function renderDashboard(state){
    const projects = state.projects.map(project => ({...project, progress: calculateCompleteness(project), nextStep: deriveNextStep(project), status: deriveStatus(project)}));
    const rows = document.getElementById('dashboardRows');
    const mobile = document.getElementById('dashboardMobile');
    const stats = {
      active: projects.length,
      welds: projects.reduce((sum, project) => sum + project.welds.length, 0),
      ready: projects.filter(project => project.status === 'Conform').length
    };
    const kpi = document.getElementById('dashboardKpi');
    if(kpi) kpi.innerHTML = `
      <div class="kpi-card"><strong>${stats.active}</strong><span>Actieve projecten</span></div>
      <div class="kpi-card"><strong>${stats.welds}</strong><span>Lassen in flow</span></div>
      <div class="kpi-card"><strong>${stats.ready}</strong><span>CE dossiers gereed</span></div>`;
    const progress = Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / Math.max(projects.length, 1));
    const progressBar = document.getElementById('dashboardProgress');
    if(progressBar) progressBar.style.width = `${progress}%`;
    const progressLabel = document.getElementById('dashboardProgressLabel');
    if(progressLabel) progressLabel.textContent = `${progress}%`;
    const quickOpen = document.getElementById('dashboardQuickOpen');
    if(quickOpen) quickOpen.textContent = `${projects.filter(project => project.status === 'In controle').length} projecten wachten op inspectie of documentatie.`;
    const quickAudit = document.getElementById('dashboardQuickAudit');
    if(quickAudit) quickAudit.textContent = `${projects.filter(project => !project.documents.ndt || !project.documents.material).length} dossiers hebben nog ontbrekende bewijslast.`;
    const quickReady = document.getElementById('dashboardQuickReady');
    if(quickReady) quickReady.textContent = `${projects.filter(project => project.status === 'Conform').length} dossiers zijn klaar voor review of vrijgave.`;
    const syncInfo = document.getElementById('dashboardSyncInfo');
    if(syncInfo) syncInfo.textContent = state.lastSyncedAt ? `Laatste synchronisatie: ${state.lastSyncedAt}` : 'Nog niet met API gesynchroniseerd.';
    if(rows) rows.innerHTML = projects.map(project => `
      <tr data-filter-row data-project-row data-status="${project.status}">
        <td><strong>${project.id}</strong><div class="table-meta"><span>${project.name}</span><span>${project.exc}</span></div></td>
        <td>${project.client}</td>
        <td><span class="badge ${statusBadgeClass(project.status)}">${project.status}</span></td>
        <td>${project.nextStep}</td>
        <td><div class="inline-actions"><button class="btn btn-soft" data-action="open-project" data-project-id="${project.id}">Project 360</button><a class="btn btn-soft" href="lascontrole.html?id=${encodeURIComponent(project.id)}">Lassen</a></div></td>
      </tr>`).join('');
    if(mobile) mobile.innerHTML = projects.map(project => `
      <article class="mobile-item">
        <div class="mobile-item-top"><strong>${project.id}</strong><span class="badge ${statusBadgeClass(project.status)}">${project.status}</span></div>
        <div class="mobile-item-meta"><span>${project.client} · ${project.name}</span><span>Volgende stap: ${project.nextStep}</span></div>
        <div class="inline-actions"><button class="btn btn-soft" data-action="open-project" data-project-id="${project.id}">Bekijken</button><button class="btn btn-soft" data-action="open-next-step" data-project-id="${project.id}">Volgende stap</button></div>
      </article>`).join('');
    const queue = document.getElementById('dashboardQueue');
    if(queue) queue.innerHTML = projects.map(project => `<div class="list-item"><div><strong>${project.id}</strong><span>${getWorkflowStage(project)} · ${project.nextStep}</span></div><button class="btn btn-soft" data-action="open-next-step" data-project-id="${project.id}">Open</button></div>`).join('');
    const blockers = document.getElementById('dashboardBlockers');
    if(blockers) blockers.innerHTML = projects.map(project => { const list = getProjectBlockers(project); return `<div class="list-item"><div><strong>${project.id}</strong><span>${list.length ? list[0] : 'Geen blokkades open'}</span></div><span class="badge ${list.length ? 'badge-warning' : 'badge-success'}">${list.length ? list.length+' open' : 'Gereed'}</span></div>`; }).join('');
  }

  function renderProjects(state){
    const rows = document.getElementById('projectRows');
    const mobile = document.getElementById('projectMobile');
    const all = state.projects;
    const counts = {
      all: all.length,
      control: all.filter(p => deriveStatus(p) === 'In controle').length,
      conform: all.filter(p => deriveStatus(p) === 'Conform').length,
      blocked: all.filter(p => !p.documents.material || !p.documents.ndt).length
    };
    [['metricAllProjects','all'],['metricInControl','control'],['metricConform','conform'],['metricBlocked','blocked']].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if(el) el.textContent = counts[key];
    });
    if(rows) rows.innerHTML = all.map(project => {
      updateDerivedFields(project);
      return `
      <tr data-filter-row data-project-row data-status="${project.status}">
        <td><strong>${project.id}</strong><div class="table-meta"><span>${project.name}</span><span>Laatste update: ${project.history[0] || 'Vandaag'}</span></div></td>
        <td>${project.client}</td>
        <td>${project.exc}</td>
        <td><span class="badge ${statusBadgeClass(project.status)}">${project.status}</span></td>
        <td>${project.nextStep}</td>
        <td><div class="inline-actions"><button class="btn btn-soft" data-action="open-project" data-project-id="${project.id}">Bekijken</button><button class="btn btn-soft" data-action="clone-project" data-project-id="${project.id}">Kopie</button><button class="btn btn-soft" data-action="delete-project" data-project-id="${project.id}">Verwijderen</button></div></td>
      </tr>`;
    }).join('');
    if(mobile) mobile.innerHTML = all.map(project => `
      <article class="mobile-item" data-project-row data-status="${project.status}">
        <div class="mobile-item-top"><strong>${project.id}</strong><span class="badge ${statusBadgeClass(project.status)}">${project.status}</span></div>
        <div class="mobile-item-meta"><span>${project.client} · ${project.name}</span><span>${project.nextStep}</span></div>
        <div class="inline-actions"><button class="btn btn-soft" data-action="open-project" data-project-id="${project.id}">Open</button><button class="btn btn-soft" data-action="open-next-step" data-project-id="${project.id}">Volgende stap</button></div>
      </article>`).join('');
  }

  function renderProjectDetail(state){
    const project = getCurrentProject(state);
    updateDerivedFields(project);
    const title = document.getElementById('projectTitle');
    if(title) title.textContent = `${project.id} · ${project.name}`;
    Object.entries({
      detailProjectId: project.id,
      detailClient: project.client,
      detailExc: project.exc,
      detailLocation: project.location,
      detailOwner: project.owner,
      detailName: project.name,
      detailNotes: project.notes,
      detailPlanning: `Voortgang ${project.progress}% · ${project.nextStep}`,
      detailWelds: `${project.welds.length} lassen geregistreerd`,
      detailDocs: `${Object.values(project.documents).filter(Boolean).length} / ${Object.keys(project.documents).length} documentgroepen compleet`
    }).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if(el) el.textContent = value;
    });
    const status = document.getElementById('detailStatus');
    if(status) status.innerHTML = `<span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>`;
    const progressBar = document.getElementById('detailProgress');
    if(progressBar) progressBar.style.width = `${project.progress}%`;
    const progressLabel = document.getElementById('detailProgressLabel');
    if(progressLabel) progressLabel.textContent = `${project.progress}%`;
    const nextStep = document.getElementById('detailNextStep');
    if(nextStep) nextStep.textContent = project.nextStep;
    const history = document.getElementById('detailHistory');
    if(history) history.innerHTML = project.history.map(item => `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><strong>${item}</strong><p>${project.id} · ${project.client}</p></div></div>`).join('');
    const detailAttachments = document.getElementById('detailAttachments');
    if(detailAttachments){
      const total = Object.values(project.attachments).reduce((sum, list) => sum + list.length, 0);
      detailAttachments.textContent = `${total} gekoppelde bestanden in dossiergroepen`;
    }
    const workflow = document.getElementById('detailWorkflow');
    if(workflow){
      const blockers = getProjectBlockers(project);
      workflow.innerHTML = `
        <div class="list">
          <div class="list-item"><div><strong>Workflowfase</strong><span>${getWorkflowStage(project)}</span></div><a class="btn btn-soft" href="${getNextActionLink(project)}">Open volgende stap</a></div>
          <div class="list-item"><div><strong>Blokkades</strong><span>${blockers.length ? blockers.join(' · ') : 'Geen open blokkades'}</span></div><span class="badge ${blockers.length ? 'badge-warning' : 'badge-success'}">${blockers.length ? blockers.length : 0}</span></div>
          <div class="list-item"><div><strong>CE-gereedheid</strong><span>${project.progress}% compleet</span></div><button class="btn btn-soft" data-action="approve-ce">Vrijgeven</button></div>
        </div>`;
    }
  }

  function renderLascontrole(state){
    const project = getCurrentProject(state);
    updateDerivedFields(project);
    const projectLabel = document.getElementById('weldProjectLabel');
    if(projectLabel) projectLabel.textContent = `${project.id} · ${project.name}`;
    const rows = document.getElementById('weldRows');
    const mobile = document.getElementById('weldMobile');
    const html = project.welds.map(weld => `
      <tr data-filter-row data-weld-row data-status="${weld.status}">
        <td><strong>${weld.id}</strong><div class="table-meta"><span>${weld.part}</span><span>${weld.process}</span></div></td>
        <td>${project.exc}</td>
        <td>${weld.ndt}</td>
        <td><span class="badge ${statusBadgeClass(weld.status)}">${weld.status}</span></td>
        <td><div class="inline-actions"><button class="btn btn-soft" data-action="mark-weld" data-weld-id="${weld.id}" data-status="Conform">Conform</button><button class="btn btn-soft" data-action="mark-weld" data-weld-id="${weld.id}" data-status="In controle">Controle</button><button class="btn btn-soft" data-action="mark-weld" data-weld-id="${weld.id}" data-status="Repair required">Repair</button></div></td>
      </tr>`).join('');
    if(rows) rows.innerHTML = html;
    if(mobile) mobile.innerHTML = project.welds.map(weld => `
      <article class="mobile-item" data-weld-row data-status="${weld.status}">
        <div class="mobile-item-top"><strong>${weld.id}</strong><span class="badge ${statusBadgeClass(weld.status)}">${weld.status}</span></div>
        <div class="mobile-item-meta"><span>${weld.part} · ${weld.process}</span><span>NDT: ${weld.ndt}</span></div>
        <div class="inline-actions"><button class="btn btn-soft" data-action="mark-weld" data-weld-id="${weld.id}" data-status="Conform">Conform</button><button class="btn btn-soft" data-action="mark-weld" data-weld-id="${weld.id}" data-status="Repair required">Repair</button></div>
      </article>`).join('');
    const stats = document.getElementById('weldStats');
    if(stats) stats.innerHTML = `
      <div class="metric-card"><h3>Totaal lassen</h3><strong>${project.welds.length}</strong><span>Actieve lasregels</span></div>
      <div class="metric-card"><h3>Conform</h3><strong>${project.welds.filter(w => w.status==='Conform').length}</strong><span>Akkoord</span></div>
      <div class="metric-card"><h3>Open</h3><strong>${project.welds.filter(w => w.status!=='Conform').length}</strong><span>Controle / repair</span></div>
      <div class="metric-card"><h3>Blokkades</h3><strong>${getProjectBlockers(project).length}</strong><span>Open punten richting CE</span></div>`;
    const next = document.getElementById('weldNextActions');
    if(next) next.innerHTML = `
      <div class="list">
        <div class="list-item"><div><strong>Volgende stap</strong><span>${project.nextStep}</span></div><a class="btn btn-soft" href="${getNextActionLink(project)}">Open</a></div>
        <div class="list-item"><div><strong>Lassersbevoegdheid</strong><span>${project.documents.welders ? 'Compleet' : 'Nog open'}</span></div><button class="btn btn-soft" data-action="toggle-welder-docs">Compleet zetten</button></div>
      </div>`;
  }

  function renderCe(state){
    const project = getCurrentProject(state);
    updateDerivedFields(project);
    const title = document.getElementById('ceProjectLabel');
    if(title) title.textContent = `${project.id} · ${project.name}`;
    const progressBar = document.getElementById('ceProgress');
    if(progressBar) progressBar.style.width = `${project.progress}%`;
    const progressLabel = document.getElementById('ceProgressLabel');
    if(progressLabel) progressLabel.textContent = `${project.progress}%`;
    const labels = { material:'Materiaalcertificaten', welders:'Lassersbevoegdheid', wps:'WPS / WPQR', ndt:'NDT rapporten', delivery:'Opleverdocumenten' };
    const matrix = document.getElementById('ceMatrix');
    if(matrix) matrix.innerHTML = Object.entries(project.documents).map(([key, value]) => `
      <div class="matrix-row">
        <strong>${labels[key]}</strong><span>${value ? 'Compleet' : 'Open'}</span>
        <span class="badge ${value ? 'badge-success' : 'badge-warning'}">${value ? 'OK' : 'Actie'}</span>
      </div>`).join('');
    const missing = document.getElementById('ceMissing');
    if(missing) missing.innerHTML = Object.entries(project.documents).filter(([, value]) => !value).map(([key]) => `
      <div class="check">
        <div><strong>${labels[key]}</strong><small>Ontbreekt nog voor vrijgave</small></div>
        <button class="btn btn-soft" data-action="toggle-doc" data-doc-key="${key}">Markeer compleet</button>
      </div>`).join('') || `<div class="check"><div><strong>Geen blokkades meer</strong><small>Alle documentgroepen zijn aanwezig.</small></div><span class="badge badge-success">Gereed</span></div>`;
    const groups = document.getElementById('ceGroups');
    if(groups) groups.innerHTML = Object.entries(project.documents).map(([key, value]) => `
      <div class="list-item"><div><strong>${labels[key]}</strong><span>${project.attachments[key]?.length || 0} bestand(en) gekoppeld</span></div><span class="badge ${value ? 'badge-success' : 'badge-warning'}">${value ? 'OK' : 'Open'}</span></div>`).join('');
    const history = document.getElementById('ceHistory');
    if(history) history.innerHTML = (project.exports.length ? project.exports : [{date:'Nog geen export', label:'Genereer eerst een exportmanifest'}]).map(item => `
      <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><strong>${item.date}</strong><p>${item.label}</p></div></div>`).join('');
    const attachments = document.getElementById('ceAttachments');
    if(attachments){
      attachments.innerHTML = Object.entries(project.attachments).map(([key, files]) => `
        <div class="upload-group">
          <div class="upload-head"><strong>${labels[key]}</strong><label class="upload-button">Bestand kiezen<input type="file" data-upload-doc="${key}" hidden multiple></label></div>
          <div class="upload-files">${files.length ? files.map(name => `<span class="file-chip">${name}</span>`).join('') : '<span class="muted">Nog geen bestanden gekoppeld</span>'}</div>
        </div>`).join('');
    }
    const release = document.getElementById('ceReleaseAdvice');
    if(release){
      const blockers = getProjectBlockers(project);
      release.innerHTML = `<div class="list"><div class="list-item"><div><strong>Vrijgaveadvies</strong><span>${blockers.length ? 'Nog niet vrijgeven' : 'Vrijgave mogelijk'}</span></div><button class="btn ${blockers.length ? '' : 'btn-primary'}" data-action="approve-ce">${blockers.length ? 'Controleer blokkades' : 'Vrijgeven'}</button></div><div class="list-item"><div><strong>Open blokkades</strong><span>${blockers.length ? blockers.join(' · ') : 'Geen open blokkades meer'}</span></div><span class="badge ${blockers.length ? 'badge-warning' : 'badge-success'}">${blockers.length ? blockers.length : 0}</span></div></div>`;
    }
  }

  function renderSettings(){
    const settings = readSettings();
    ['organisationName','defaultExc','projectPrefix','twoFactor','sessionTimeout'].forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      const mapping = { organisationName:'organisationName', defaultExc:'defaultExc', projectPrefix:'projectPrefix', twoFactor:'twoFactor', sessionTimeout:'sessionTimeout' };
      el.value = settings[mapping[id]] || '';
    });
    const apiMeta = readApiMeta();
    const apiStatus = document.getElementById('settingsApiStatus');
    if(apiStatus) apiStatus.textContent = apiMeta.online ? 'API online' : 'Lokale demo-data';
  }

  function renderPage(){
    const state = readState();
    state.projects.forEach(updateDerivedFields);
    writeState(state);
    updateApiChip();
    const key = pageKey();
    if(key === 'dashboard') renderDashboard(state);
    if(key === 'projecten') renderProjects(state);
    if(key === 'projectdetail') renderProjectDetail(state);
    if(key === 'lascontrole') renderLascontrole(state);
    if(key === 'ce') renderCe(state);
    if(key === 'instellingen') renderSettings(state);
    bindSubtabs();
  }

  async function initBackendState(){
    if(initPromise) return initPromise;
    initPromise = syncFromApi(false);
    return initPromise;
  }

  function bindUI(){
    bindSubtabs();
    bindActions();
    bindSearch();
    renderPage();
    document.body.addEventListener('click', e => { if(e.target.id === 'drawer-close-2') closeDrawer(); });
    initBackendState();
  }

  document.addEventListener('DOMContentLoaded', mountShell);
})();
