(function(){
  const ROOT = (()=>{
    const href = String(location.href||'');
    const inLayers = href.includes('/layers/') || href.includes('\\layers\\');
    return inLayers ? '..' : '.';
  })();

  window.CWS_ROUTES = Object.freeze({
    root: ROOT,
    start: ROOT + '/layers/dashboard.html',
    projects: ROOT + '/layers/projecten.html',
    projectDetail: ROOT + '/layers/project_detail.html',
    welds: ROOT + '/layers/lascontrole.html',
    ce: ROOT + '/layers/ce_dossier.html',
    settings: ROOT + '/layers/instellingen.html',
    admin: ROOT + '/layers/superadmin.html',
    billing: ROOT + '/layers/tenant_billing.html'
  });
})();
