(function(){
  const BASE = '';
  const scripts = [
    '/js/core/routes.js',
    '/js/core/design_system.js',
    '/js/core/store.js',
    '/js/core/permissions.js',
    '/js/core/ui.js',
    '/js/core/apps_menu.js',
    '/js/core/export.js',
    '/js/core/auth_client.js',
    '/js/core/pwa.js',
    '/js/core/shell.js',
    '/js/core/phase3_finalize.js'
  ];
  function once(src){
    return new Promise((resolve,reject)=>{
      if ([...document.scripts].some(s => (s.src||'').includes(src))) return resolve();
      const el=document.createElement('script');
      el.src=src; el.onload=resolve; el.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(el);
    });
  }
  (async()=>{
    for (const src of scripts){ try{ await once(src); }catch(e){ console.error(e); } }
    if (!window.APPsMenu && window.AppsMenu) window.APPsMenu = window.AppsMenu;
    if (window.Shell && !document.querySelector('.headerbar')) {
      try{ window.Shell.mount(); }catch(e){ console.error(e); }
    }
  })();
})();
