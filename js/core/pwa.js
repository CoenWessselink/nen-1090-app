/*
  NEN1090 PWA bootstrap
  - Registers service worker
  - Provides install prompt (Android/Chrome/Edge)
  - Shows a small install banner when available
*/
(function(){
  let deferredPrompt = null;
  const LS_HIDE = 'nen1090.pwa.install.hide';

  function isStandalone(){
    try{
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone
        || document.referrer.includes('android-app://');
    }catch(_){ return false; }
  }

  function hideBanner(){
    try{ localStorage.setItem(LS_HIDE, '1'); }catch(_){ }
    const el = document.getElementById('pwaInstallBanner');
    if(el) el.remove();
  }

  async function showPrompt(){
    if(!deferredPrompt) return false;
    try{
      deferredPrompt.prompt();
      const res = await deferredPrompt.userChoice;
      deferredPrompt = null;
      hideBanner();
      return res && res.outcome === 'accepted';
    }catch(_){ return false; }
  }

  function showBanner(){
    if(isStandalone()) return;
    try{ if(localStorage.getItem(LS_HIDE)==='1') return; }catch(_){ }
    if(document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.style.cssText = [
      'position:fixed','left:12px','right:12px','bottom:12px','z-index:9999',
      'background:#0c1830','color:#fff','border:1px solid rgba(255,255,255,.15)',
      'border-radius:14px','padding:10px 12px','box-shadow:0 10px 30px rgba(0,0,0,.35)',
      'display:flex','gap:10px','align-items:center','justify-content:space-between'
    ].join(';');

    banner.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; min-width:0;">
        <img src="/icons/icon-192.png" alt="" style="width:28px; height:28px; border-radius:8px;" />
        <div style="min-width:0;">
          <div style="font-weight:700; font-size:14px; line-height:1.1;">NEN‑1090 App installeren</div>
          <div style="opacity:.85; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Sneller starten + offline inspecties</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button id="pwaInstallBtn" style="background:#2e7dff; color:#fff; border:0; padding:8px 10px; border-radius:10px; font-weight:700;">Installeren</button>
        <button id="pwaInstallHide" aria-label="Sluiten" style="background:transparent; color:#fff; border:1px solid rgba(255,255,255,.2); padding:8px 10px; border-radius:10px;">✕</button>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('#pwaInstallBtn')?.addEventListener('click', ()=>{ showPrompt(); });
    banner.querySelector('#pwaInstallHide')?.addEventListener('click', ()=>{ hideBanner(); });
  }

  // Install prompt hook
  window.addEventListener('beforeinstallprompt', (e)=>{
    try{
      e.preventDefault();
      deferredPrompt = e;
      showBanner();
      window.dispatchEvent(new CustomEvent('nen1090_pwa_install_available'));
    }catch(_){ }
  });

  window.addEventListener('appinstalled', ()=>{
    deferredPrompt = null;
    hideBanner();
  });

  // Service worker
  try{
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function(err){ console.warn('[PWA] SW register failed', err); });
    });
  }catch(_){ }

  window.PWAInstall = { showPrompt };
})();
