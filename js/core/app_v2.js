(function(){
  const routes = {
    dashboard:'dashboard.html',
    projecten:'projecten.html',
    lascontrole:'lascontrole.html',
    ce:'ce_dossier.html',
    instellingen:'instellingen.html'
  };

  const routeNames = {
    dashboard:'Dashboard',
    projecten:'Projecten',
    lascontrole:'Lascontrole',
    ce:'CE Dossier',
    instellingen:'Instellingen'
  };

  const base = '../layers/';

  function pageKey(){
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    if (p.includes('projecten')) return 'projecten';
    if (p.includes('lascontrole')) return 'lascontrole';
    if (p.includes('ce_dossier')) return 'ce';
    if (p.includes('instellingen')) return 'instellingen';
    return 'dashboard';
  }

  function nav(active){
    return Object.entries(routes).map(([k, file]) => {
      const cls = k === active ? 'is-active' : '';
      const icon = k === 'dashboard' ? '⌂' : k === 'projecten' ? '▣' : k === 'lascontrole' ? '✓' : k === 'ce' ? '▤' : '⚙';
      return `<a class="${cls}" href="${base}${file}"><span class="ico">${icon}</span><span>${routeNames[k]}</span></a>`;
    }).join('');
  }

  function mobileNav(active){
    return Object.entries(routes).map(([k, file]) => {
      const cls = k === active ? 'is-active' : '';
      const icon = k === 'dashboard' ? '⌂' : k === 'projecten' ? '▣' : k === 'lascontrole' ? '✓' : k === 'ce' ? '▤' : '⚙';
      const label = k === 'ce' ? 'CE' : routeNames[k];
      return `<a class="${cls}" href="${base}${file}"><span>${icon}</span><span>${label}</span></a>`;
    }).join('');
  }

  function mountShell(){
    const active = pageKey();

    // BELANGRIJK: eerst bestaande content ophalen vóór body wordt leeggemaakt
    const content = document.getElementById('page-content');
    const preservedContent = content ? content.cloneNode(true) : null;

    const app = document.createElement('div');
    app.className = 'cws-app';
    app.innerHTML = `
      <aside class="cws-sidebar">
        <a class="cws-brand" href="${base}${routes.dashboard}">
          <div class="cws-brand-logo"></div>
          <div class="cws-brand-copy"><strong>CWS NEN-1090</strong><span>SOFTWAREPLATFORM</span></div>
        </a>
        <nav class="cws-nav">${nav(active)}</nav>
        <div class="cws-sidebar-footer">
          <strong>Workflow gestuurd</strong>
          <span>Project → Lassen → Inspectie → Documentatie → CE → Export</span>
        </div>
      </aside>

      <main class="cws-main">
        <header class="cws-topbar">
          <label class="cws-search">
            <span>⌕</span>
            <input type="search" placeholder="Zoeken..." aria-label="Zoeken">
          </label>
          <div class="cws-top-actions">
            <div class="cws-pill">demo@cws.app</div>
            <div class="cws-avatar">C</div>
          </div>
        </header>
        <div class="page" id="appPage"></div>
      </main>

      <nav class="mobile-bottom">${mobileNav(active)}</nav>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(app);

    if (preservedContent) {
      document.getElementById('appPage').appendChild(preservedContent);
    }
  }

  document.addEventListener('DOMContentLoaded', mountShell);
})();