(function(){
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
    projectdetail:'Projectdetail',
    lascontrole:'Lascontrole',
    ce:'CE Dossier',
    instellingen:'Instellingen'
  };
  const base = '../layers/';

  function pageKey(){
    const p=(location.pathname.split('/').pop()||'').toLowerCase();
    if(p.includes('project_detail')) return 'projectdetail';
    if(p.includes('projecten')) return 'projecten';
    if(p.includes('lascontrole')) return 'lascontrole';
    if(p.includes('ce_dossier')) return 'ce';
    if(p.includes('instellingen')) return 'instellingen';
    return 'dashboard';
  }
  function nav(active){
    const items=[['dashboard','⌂'],['projecten','▣'],['lascontrole','✓'],['ce','▤'],['instellingen','⚙']];
    return items.map(([k,icon])=>`<a class="${k===active?'is-active':''}" href="${base}${routes[k]}"><span class="ico">${icon}</span><span>${names[k]}</span></a>`).join('');
  }
  function mobileNav(active){
    const items=[['dashboard','⌂','Home'],['projecten','▣','Projecten'],['lascontrole','✓','Lassen'],['ce','▤','CE'],['instellingen','⚙','Meer']];
    return items.map(([k,icon,label])=>`<a class="${k===active?'is-active':''}" href="${base}${routes[k]}"><span>${icon}</span><span>${label}</span></a>`).join('');
  }
  function toast(msg){
    let stack=document.querySelector('.toast-stack');
    if(!stack){stack=document.createElement('div');stack.className='toast-stack';document.body.appendChild(stack)}
    const el=document.createElement('div');el.className='toast';el.textContent=msg;stack.appendChild(el);setTimeout(()=>{el.remove()},2500)
  }
  function ensureDrawer(){
    let mask=document.querySelector('.drawer-mask');
    if(mask) return mask;
    mask=document.createElement('div');
    mask.className='drawer-mask';
    mask.innerHTML='<aside class="drawer"><div class="section-title"><div><h2>Actie</h2><p id="drawer-sub">Details</p></div><button class="btn" type="button" id="drawer-close">Sluiten</button></div><div id="drawer-body"></div></aside>';
    document.body.appendChild(mask);
    mask.addEventListener('click',e=>{if(e.target===mask) closeDrawer()});
    mask.querySelector('#drawer-close').addEventListener('click',closeDrawer);
    return mask;
  }
  function openDrawer(title,subtitle,html){
    const mask=ensureDrawer();
    mask.classList.add('is-open');
    mask.querySelector('h2').textContent=title;
    mask.querySelector('#drawer-sub').textContent=subtitle||'';
    mask.querySelector('#drawer-body').innerHTML=html;
  }
  function closeDrawer(){const m=document.querySelector('.drawer-mask'); if(m) m.classList.remove('is-open')}
  function mountShell(){
    const active=pageKey();
    const content=document.getElementById('page-content');
    const preserved=content?content.cloneNode(true):document.createElement('div');
    const app=document.createElement('div');
    app.className='cws-app';
    app.innerHTML=`
      <aside class="cws-sidebar">
        <a class="cws-brand" href="${base}${routes.dashboard}">
          <div class="cws-brand-logo"></div>
          <div class="cws-brand-copy"><strong>CWS NEN-1090</strong><span>SOFTWAREPLATFORM</span></div>
        </a>
        <nav class="cws-nav">${nav(active)}</nav>
        <div class="cws-sidebar-footer"><strong>Workflow gestuurd</strong><span>Project → Lassen → Inspectie → Documentatie → CE → Export</span></div>
      </aside>
      <main class="cws-main">
        <header class="cws-topbar">
          <label class="cws-search"><span>⌕</span><input type="search" placeholder="Zoeken..." aria-label="Zoeken"></label>
          <div class="cws-top-actions"><div class="cws-pill">demo@cws.app</div><div class="cws-avatar">C</div></div>
        </header>
        <div class="page" id="appPage"></div>
      </main>
      <nav class="mobile-bottom">${mobileNav(active)}</nav>`;
    document.body.innerHTML='';
    document.body.appendChild(app);
    document.getElementById('appPage').appendChild(preserved);
    bindUI();
  }
  function bindSubtabs(){
    document.querySelectorAll('.subtabs').forEach(group=>{
      group.querySelectorAll('.subtab').forEach(tab=>tab.addEventListener('click',()=>{
        group.querySelectorAll('.subtab').forEach(x=>x.classList.remove('is-active'));
        tab.classList.add('is-active');
        const target=tab.dataset.target;
        if(target){
          const host=group.closest('[data-tabs-host]') || document;
          host.querySelectorAll('[data-tab-panel]').forEach(p=>p.hidden = p.dataset.tabPanel!==target);
        }
      }))
    })
  }
  function bindActions(){
    document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      const action=btn.dataset.action;
      const title=btn.dataset.title || btn.textContent.trim();
      if(action==='toast') toast(btn.dataset.message||`${title} is gekoppeld in de demo-flow.`);
      if(action==='drawer') openDrawer(title, btn.dataset.subtitle||'Demo-actie', btn.dataset.content || '<div class="notice">Deze actie is als klikbare frontend-flow voorbereid. In de volgende slag koppelen we dit aan echte data en formulieren.</div>');
      if(action==='modal-project') openDrawer('Nieuw project','Projectbasis toevoegen', '<div class="field"><label>Projectnummer</label><input value="P-2026-001"></div><div class="field"><label>Opdrachtgever</label><input value="Bouwbedrijf Delta"></div><div class="field"><label>Executieklasse</label><select><option>EXC1</option><option selected>EXC2</option><option>EXC3</option></select></div><div class="inline-actions"><a class="btn btn-primary" href="project_detail.html">Project openen</a><button class="btn" type="button" id="drawer-close-2">Opslaan als concept</button></div>');
      if(action==='filters'){ toast('Filter toegepast in de demo-flow.'); }
    }));
    document.body.addEventListener('click',e=>{ if(e.target.id==='drawer-close-2') closeDrawer(); });
  }
  function bindSearch(){
    const inputs=document.querySelectorAll('input[type="search"][data-filter-target]');
    inputs.forEach(input=>input.addEventListener('input',()=>{
      const val=input.value.toLowerCase();
      const target=document.querySelector(input.dataset.filterTarget);
      if(!target) return;
      target.querySelectorAll('[data-filter-row]').forEach(row=>{
        row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
      });
    }));
  }
  function bindUI(){ bindSubtabs(); bindActions(); bindSearch(); }
  document.addEventListener('DOMContentLoaded', mountShell);
})();
