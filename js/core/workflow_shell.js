
(function(){
  const PAGE_CONFIG = {
    dashboard:{
      overline:'Workflow gestuurd platform',
      title:'Centrale besturing van project naar CE-export',
      copy:'Deze eerste rebuildstap trekt de kernmodules visueel en functioneel naar één vaste proceslijn: Project → Lassen → Inspectie → Documentatie → CE dossier → Export.',
      active:'dashboard',
      chips:[['Fase','Wave 16 rebuild'],['Focus','Shell + workflow'],['Status','Actief bouwen']],
      kpis:[['Modules','5','Kernschermen nu gekoppeld aan dezelfde workflowlaag',''],['Workflow','6 stappen','Van projectstart tot export in één lijn','is-good'],['Open punten','12','Resterende detailbouw in modules','is-warn'],['Design','SSOT','Lichte enterprise SaaS-uitstraling','']]
    },
    projecten:{
      overline:'Module 1 · Projecten',
      title:'Projecten als vaste start van de keten',
      copy:'Projecten wordt de centrale instap voor opdrachtgever, EXC, documentstatus en vervolgacties richting lassen en inspectie.',
      active:'project',
      chips:[['Volgende stap','Lassen genereren'],['SSOT','Project 360'],['Doel','Één bron voor vervolgmodules']],
      kpis:[['Projectstatus','Live','Status, filters en acties in één overzicht',''],['Volgende fase','Lassen','Vanuit project door naar werkvloer','is-good'],['Controle','Open','Inspectieketen nog verder uit te bouwen','is-warn'],['Export','Voorbereid','CE-opbouw wordt hier gestart','']]
    },
    lascontrole:{
      overline:'Module 2 · Lascontrole',
      title:'Operationele werkplek voor lassen en inspectie',
      copy:'Lascontrole wordt de productiekern waarin lasnummers, defecten, ISO 5817, WPS, lassers en NDT samenkomen.',
      active:'welds',
      chips:[['Werkmodus','Operationeel'],['Norm','NEN-1090 / ISO 5817'],['Focus','Completeness + beoordeling']],
      kpis:[['Lasstatus','Actief','Werkvoorbereiding en inspectie in één scherm',''],['Beoordeling','ISO 5817','Normatieve afhandeling blijft leidend','is-good'],['Open acties','3','Documenten en sideflow verder vullen','is-warn'],['Dossier','In opbouw','Directe koppeling met CE dossier','']]
    },
    ce_dossier:{
      overline:'Module 3 · CE dossier',
      title:'Dossierlaag voor completeness en exportgereedheid',
      copy:'Het CE dossier wordt de samenvattende controlelaag waarin alle onderliggende modules samenkomen tot een exporteerbaar pakket.',
      active:'ce',
      chips:[['Doel','Export readiness'],['Bronnen','Lassen + docs + inspecties'],['Laatste stap','Release & audit']],
      kpis:[['Completeness','74%','Huidige demo-indicatie voor dossieropbouw','is-good'],['Ontbreekt','3 items','Nog open onderdelen voor definitieve export','is-warn'],['Exports','1.4','Versiehistorie zichtbaar in dossierlaag',''],['Audit','Voorbereid','Controle op consistentie en traceability','']]
    },
    instellingen:{
      overline:'Module 4 · Instellingen',
      title:'Standaardisatie van organisatie, mensen en defaults',
      copy:'Instellingen wordt de centrale beheerlaag voor bedrijfsgegevens, gebruikers, certificaten, norminstellingen en toekomstige templates.',
      active:'settings',
      chips:[['Beheerlaag','Centraal'],['Doel','Standaardisatie'],['Koppeling','Hele platform']],
      kpis:[['Secties','4','Bedrijf, werknemers, certificaten en keuzelijsten',''],['Data','SSOT','Instellingen voeden de hele workflow','is-good'],['Nog te bouwen','Templates','Normsets en defaults uitbreiden','is-warn'],['Architectuur','Gekoppeld','Module klaar voor verdere uitrol','']]
    }
  };
  const STEP_ORDER = [
    ['project','Project','Start en context'],
    ['welds','Lassen','Werkvoorbereiding'],
    ['inspection','Inspectie','Beoordelen en registreren'],
    ['docs','Documentatie','Bewijzen en bijlagen'],
    ['ce','CE dossier','Completeness en checks'],
    ['export','Export','Definitieve set']
  ];

  function detectPage(){
    const href = String(location.pathname || location.href || '');
    if(href.includes('projecten')) return 'projecten';
    if(href.includes('lascontrole')) return 'lascontrole';
    if(href.includes('ce_dossier')) return 'ce_dossier';
    if(href.includes('instellingen')) return 'instellingen';
    return 'dashboard';
  }

  function stepState(activeKey, key){
    const idx = STEP_ORDER.findIndex(s=>s[0]===key);
    const activeIdx = {
      dashboard:-1,
      project:0,
      welds:1,
      inspection:2,
      docs:3,
      ce:4,
      export:5,
      settings:-1
    }[activeKey] ?? -1;
    if(activeKey==='settings') return '';
    if(idx < activeIdx) return 'is-done';
    if(idx === activeIdx) return 'is-active';
    return '';
  }

  function heroHTML(cfg){
    return `
      <section class="workflow-shell" aria-label="Workflow overzicht">
        <div class="workflow-hero-card">
          <div>
            <div class="workflow-overline">${cfg.overline}</div>
            <div class="workflow-heading">${cfg.title}</div>
            <div class="workflow-copy">${cfg.copy}</div>
          </div>
          <div class="workflow-meta">${cfg.chips.map(([a,b])=>`<div class="workflow-chip"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        </div>
        <div class="workflow-strip">
          <div class="workflow-strip-grid">${STEP_ORDER.map(([k,t,s],i)=>`<div class="workflow-step ${stepState(cfg.active,k)}"><div class="workflow-step-num">${i+1}</div><div><div class="workflow-step-title">${t}</div><div class="workflow-step-sub">${s}</div></div></div>`).join('')}</div>
        </div>
        <div class="workflow-kpis">${cfg.kpis.map(([l,v,n,cls])=>`<div class="workflow-kpi ${cls||''}"><div class="workflow-kpi-label">${l}</div><div class="workflow-kpi-value">${v}</div><div class="workflow-kpi-note">${n}</div></div>`).join('')}</div>
      </section>`;
  }

  function mount(){
    if(document.querySelector('.workflow-shell')) return;
    const page = detectPage();
    const cfg = PAGE_CONFIG[page];
    if(!cfg) return;
    if(page === 'projecten') return;
    const main = document.querySelector('main');
    if(!main) return;
    const firstSection = main.querySelector(':scope > section');
    if(firstSection) firstSection.insertAdjacentHTML('afterbegin', heroHTML(cfg));
    else main.insertAdjacentHTML('afterbegin', heroHTML(cfg));
    document.body.setAttribute('data-workflow-page', page);
  }

  window.WorkflowShell = { mount };
})();
