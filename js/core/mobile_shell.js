(function(){
  function currentKey(){
    const p = String(location.pathname || '').toLowerCase();
    if(p.includes('project')) return 'projects';
    if(p.includes('lascontrole')) return 'welds';
    if(p.includes('instellingen')) return 'settings';
    if(p.includes('superadmin') || p.includes('tenant_billing')) return 'menu';
    return 'home';
  }
  function renderBottomNav(){
    if(window.innerWidth > 820 || document.querySelector('.mobile-bottom-nav')) return;
    const routes = window.CWS_ROUTES || {};
    const items = [
      { key:'home', label:'Start', icon:'⌂', href: routes.start || '../start.html' },
      { key:'projects', label:'Projecten', icon:'▣', href: routes.projects || './projecten.html' },
      { key:'welds', label:'Las', icon:'◫', href: routes.welds || './lascontrole.html' },
      { key:'settings', label:'Inst.', icon:'⚙', href: routes.settings || './instellingen.html' },
      { key:'menu', label:'Menu', icon:'☰', href:'#menu' }
    ];
    const nav = document.createElement('nav');
    nav.className='mobile-bottom-nav';
    nav.innerHTML = items.map(item=>`<a class="${item.key===currentKey()?'active':''}" data-key="${item.key}" href="${item.href}"><span class="icon">${item.icon}</span><span>${item.label}</span></a>`).join('');
    nav.querySelector('[data-key="menu"]')?.addEventListener('click', e=>{e.preventDefault(); document.getElementById('openApps')?.click();});
    document.body.appendChild(nav);
  }
  function mountPageHeader(options){
    if(window.innerWidth > 820 || document.querySelector('.mobile-page-hero')) return;
    const title = options?.title || document.body.getAttribute('data-title') || document.title || 'CWS NEN1090';
    const subtitle = options?.subtitle || 'Mobiele werkweergave voor snelle acties, status en detailcontrole.';
    const hero = document.createElement('section');
    hero.className = 'mobile-page-hero';
    hero.innerHTML = `<div class="hero-card"><h1>${title}</h1><p>${subtitle}</p></div>`;
    const target = document.querySelector('main, .app-shell') || document.body.firstChild;
    if(target && target.parentNode) target.parentNode.insertBefore(hero, target); else document.body.prepend(hero);
  }
  window.CWSMobileShell = { renderBottomNav, mountPageHeader };
  window.addEventListener('DOMContentLoaded', renderBottomNav);
  window.addEventListener('resize', ()=>{ if(window.innerWidth <= 820) renderBottomNav(); });
})();
