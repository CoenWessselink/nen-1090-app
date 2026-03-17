/* CWS Store — Offline-first (localStorage) — NEN1090 Lascontrole
   - Eén centrale state per render
   - Geen console errors toegestaan
*/
(function(){
  const KEY = "nen1090_state_v1";

  function nowISO(){ return new Date().toISOString(); }

  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

  function defaultState(){
    return {
      ui: {
        role: "Admin", // Admin | Inspector | Viewer
        activeApp: "projecten", // projecten | lascontrole | instellingen
        activeProjectId: null,
        // per-app UI state (tabs, filters etc.)
        view: {
          projectenTab: "alle", // alle | in_controle | conform | afgekeurd | locked
          lasTab: "lassen", // lassen | controles | ndo | materialen | documenten | certificaten | checklist | rapportage | historie
          instellingenTab: "bedrijf", // bedrijf | werknemers | certificaten | keuzelijsten
        }
      },
      projects: {
        byId: {},
        order: []
      },
      assemblies: {
        byId: {},
        byProject: {}
      },
      welds: {
        byId: {}, // weldId -> weld
        byProject: {} // projectId -> [weldId]
      },
      controls: {
        // weldId -> { groupKey -> [criteria] }
        byWeld: {}
      },
      settings: {
        company: { name:"", address:"", email:"", phone:"" },
        workers: { byId:{}, order:[] },
        lists: {
          processes: ["111","135","136","138","141"],
          ndoMethods: ["VT","MT","PT","UT","RT"],
          materials: ["S235","S355","S460"],
          fillerMaterials: ["G3Si1","ER70S-6"],
          lasmethodes: ["Stompe hoeklas","V-naad","K-naad","Volle doorlassing"],
          projectStatussen: ["in_controle","conform","afgekeurd","locked"],
          excKlassen: ["EXC1","EXC2","EXC3","EXC4"],
          acceptatieKlassen: ["5817-B","5817-C","5817-D"]
        },
        // norm defaults (expand later)
        excDefaults: {
          EXC1: { acceptatie:"B" },
          EXC2: { acceptatie:"B" },
          EXC3: { acceptatie:"C" },
          EXC4: { acceptatie:"D" }
        }
      },
      ndoPlan: {
        // weldId -> { methods:[], plannedDate:"", status:"open", reportDocIds:[] }
        byWeld: {}
      },
      materials: {
        // projectId -> { staal:[...], toevoeg:[...] }
        byProject: {}
      },
      documents: {
        byId: {}, // docId -> doc
        byProject: {} // projectId -> [docId]
      },
      certs: {
        byId: {},
        byType: {lassers:[], lascoordinator:[], bedrijf:[]},
        byProject: {} // projectId -> [certId] (optioneel)
      },
      checklist: {
        // projectId -> { items:[{id,title,norm,status,vanToepassing,opmerking}], signature:{name,date,signatureText}, locked:false }
        byProject: {}
      },
      projectSelections: {
        // projectId -> { excludedWps:[], excludedWpqr:[], excludedMaterials:[], excludedWelders:[], excludedCerts:[] }
        byProject: {}
      },
      revisions: {
        // projectId -> { current:'A', list:[{rev:'A', ts, note, snapshot}] }
        byProject: {}
      },
      audit: {
        events: [] // {ts, who, role, action, entity, entityId, before, after}
      }
    };
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return defaultState();
      const st = JSON.parse(raw);
      // basic shape guard
      if(!st || !st.ui || !st.projects) return defaultState();
      return st;
    }catch(_){
      return defaultState();
    }
  }

  
  // Persist safety: localStorage is small; PDF/DataURL attachments can exceed quota and break ALL saves.
  // We keep large blobs in-memory (window.__CWS_BLOB_CACHE) and persist only metadata + hasData flag.
  function stripForPersist(st){
    const clone = deepClone(st);
    window.__CWS_BLOB_CACHE = window.__CWS_BLOB_CACHE || { workers:{}, certs:{}, docs:{} };

    // Workers: store certPdfDataUrl in memory
    try{
      const workers = clone.settings?.workers?.byId || {};
      Object.keys(workers).forEach(id=>{
        const w = workers[id];
        if(w && w.certPdfDataUrl && String(w.certPdfDataUrl).length > 5000){
          window.__CWS_BLOB_CACHE.workers[id] = window.__CWS_BLOB_CACHE.workers[id] || {};
          window.__CWS_BLOB_CACHE.workers[id].certPdfDataUrl = w.certPdfDataUrl;
          w.certPdfDataUrl = "";
          w.certPdfHasData = true;
        }
      });
    }catch(_){}

    // Certs: any pdfDataUrl style fields
    try{
      const certs = clone.certs?.byId || {};
      Object.keys(certs).forEach(id=>{
        const c = certs[id];
        if(!c) return;
        ["pdfDataUrl","dataUrl","fileDataUrl"].forEach(k=>{
          if(c[k] && String(c[k]).length > 5000){
            window.__CWS_BLOB_CACHE.certs[id] = window.__CWS_BLOB_CACHE.certs[id] || {};
            window.__CWS_BLOB_CACHE.certs[id][k] = c[k];
            c[k] = "";
            c.hasData = true;
          }
        });
      });
    }catch(_){}

    // Documents: store file content in memory
    try{
      const docs = clone.documents?.byId || {};
      Object.keys(docs).forEach(id=>{
        const d = docs[id];
        if(!d) return;
        ["dataUrl","fileDataUrl","pdfDataUrl"].forEach(k=>{
          if(d[k] && String(d[k]).length > 5000){
            window.__CWS_BLOB_CACHE.docs[id] = window.__CWS_BLOB_CACHE.docs[id] || {};
            window.__CWS_BLOB_CACHE.docs[id][k] = d[k];
            d[k] = "";
            d.hasData = true;
          }
        });
      });
    }catch(_){}

    return clone;
  }

function save(st){
    const persist = stripForPersist(st);
    try{
      localStorage.setItem(KEY, JSON.stringify(persist));
    }catch(e){
      // QuotaExceeded / SecurityError → keep in-memory state so app continues
      try{ console.error(e); }catch(_){}
      try{ if(window.UI && UI.toast) UI.toast("Opslaan niet mogelijk in localStorage (bijlagen te groot)."); }catch(_){}
      // do not throw; app remains usable, but changes won't persist on reload
    }
  }

  let STATE = load();

  function withAudit(action, entity, entityId, before, after){
    const who = STATE.ui.role === "Viewer" ? "viewer" : "user";
    STATE.audit.events.unshift({
      ts: nowISO(),
      who,
      role: STATE.ui.role,
      action,
      entity,
      entityId,
      before: before ? deepClone(before) : null,
      after: after ? deepClone(after) : null
    });
    // keep audit bounded
    if(STATE.audit.events.length > 2000) STATE.audit.events.length = 2000;
  }

  function setState(next){
    STATE = next;
    save(STATE);
    return STATE;
  }

  function getState(){ return STATE; }

  function clearAll(){
    try{ localStorage.removeItem(KEY); }catch(_){}
    STATE = defaultState();
    save(STATE);
  }

  function resetDemo(){
    const st = defaultState();

    const p1 = {
      id: "P-1001",
      nummer: "P-1001",
      naam: "Tasche Staalbouw – Warmtepompruimte",
      opdrachtgever: "Gemeente Voorbeeldstad",
      exc: "EXC2",
      acceptatieklasse: "B",
      status: "in_controle", // in_controle | conform | afgekeurd | locked
      laatstGewijzigd: nowISO(),
      locked: false
    };
    const p2 = {
      id: "P-1002",
      nummer: "P-1002",
      naam: "Roostervloer – Industriehal",
      opdrachtgever: "Bouwbedrijf Delta",
      exc: "EXC3",
      acceptatieklasse: "C",
      status: "conform",
      laatstGewijzigd: nowISO(),
      locked: false
    };

    st.projects.byId[p1.id] = p1;
    st.projects.byId[p2.id] = p2;
    st.projects.order = [p1.id, p2.id];
    st.ui.activeProjectId = p1.id;

    // Assemblies + welds (demo)
    const a1 = { id:"A-001", projectId:p1.id, code:"ASM-001", name:"Hoofdframe", drawingNo:"DRW-001", revision:"A", status:"open", notes:"" };
    const a2 = { id:"A-002", projectId:p1.id, code:"ASM-002", name:"Voetplaatset", drawingNo:"DRW-002", revision:"B", status:"open", notes:"" };
    st.assemblies.byId[a1.id]=a1; st.assemblies.byId[a2.id]=a2; st.assemblies.byProject[p1.id]=[a1.id,a2.id];
    const w1 = { id:"W-001", projectId:p1.id, assemblyId:a1.id, weldNo:"W-001", locatie:"Frame A – ligger L1", proces:"135", materiaal:"S355", dikte:"8", lassers:"J. de Vries", vtStatus:"open", ndoStatus:"nvt", fotos:0, status:"open", last: nowISO(), wps:"WPS-135-01" };
    const w2 = { id:"W-002", projectId:p1.id, assemblyId:a2.id, weldNo:"W-002", locatie:"Kolom K2 – voetplaat", proces:"111", materiaal:"S235", dikte:"12", lassers:"A. Jansen", vtStatus:"ok", ndoStatus:"open", fotos:1, status:"in_controle", last: nowISO(), wps:"WPS-111-01" };
    st.welds.byId[w1.id]=w1; st.welds.byId[w2.id]=w2;
    st.welds.byProject[p1.id]=[w1.id,w2.id];
    // default controls
    st.controls.byWeld[w1.id] = defaultCriteriaFor(w1, p1);
    st.controls.byWeld[w2.id] = defaultCriteriaFor(w2, p1);

    const a3 = { id:"A-101", projectId:p2.id, code:"ASM-101", name:"Roostervloer", drawingNo:"DRW-101", revision:"A", status:"released", notes:"" };
    st.assemblies.byId[a3.id]=a3; st.assemblies.byProject[p2.id]=[a3.id];
    const w3 = { id:"W-101", projectId:p2.id, assemblyId:a3.id, weldNo:"W-101", locatie:"Rooster – randprofiel", proces:"135", materiaal:"S355", dikte:"6", lassers:"S. Bakker", vtStatus:"ok", ndoStatus:"nvt", fotos:0, status:"conform", last: nowISO(), wps:"WPS-135-01" };
    st.welds.byId[w3.id]=w3;
    st.welds.byProject[p2.id]=[w3.id];
    st.controls.byWeld[w3.id] = defaultCriteriaFor(w3, p2);

    // demo settings (idempotent)
    st.settings.company = st.settings.company || { name:"Tasche Staalbouw", address:"Industrieweg 1, NL", email:"info@tasche.nl", phone:"+31 0 000000" };
    st.settings.workers = st.settings.workers || { byId:{}, order:[] };
    if(!st.settings.workers.byId["WKR-001"]){
      st.settings.workers.byId["WKR-001"] = { id:"WKR-001", naam:"Lasser A", rol:"Lasser", telefoon:"", email:"", adres:"", postcode:"", woonplaats:"", geldigTot:"2026-12-31", certPdfName:"", certPdfMime:"", certPdfDataUrl:"" };
      st.settings.workers.order.push("WKR-001");
    }
    if(!st.settings.workers.byId["WKR-002"]){
      st.settings.workers.byId["WKR-002"] = { id:"WKR-002", naam:"Inspecteur B", rol:"Inspector", telefoon:"", email:"", adres:"", postcode:"", woonplaats:"", geldigTot:"2026-12-31", certPdfName:"", certPdfMime:"", certPdfDataUrl:"" };
      st.settings.workers.order.push("WKR-002");
    }

    st.settings.workers.order = ["WKR-001","WKR-002"];
    st.settings.lists = { processes:["111","135","136","138","141"], ndoMethods:["VT","MT","PT","UT","RT"], materials:["S235","S355","S460"], fillerMaterials:["G3Si1","ER70S-6"] };

    // demo checklist
    st.checklist.byProject[p1.id] = { items: defaultChecklistForProject(p1), signature:{name:"",date:"",signatureText:""}, locked:false };
    st.checklist.byProject[p2.id] = { items: defaultChecklistForProject(p2), signature:{name:"",date:"",signatureText:""}, locked:false };

    st.projectSelections.byProject[p1.id] = { excludedWps:[], excludedWpqr:[], excludedMaterials:[], excludedWelders:[], excludedCerts:[] };
    st.projectSelections.byProject[p2.id] = { excludedWps:[], excludedWpqr:[], excludedMaterials:[], excludedWelders:[], excludedCerts:[] };

    // demo materials
    st.materials.byProject[p1.id] = {
      staal:[
        {id:'S-001', omschrijving:'S355 plaat', norm:'EN 10210', cert:'3.1', hoeveelheid:'6 st', opmerking:''},
        {id:'S-002', omschrijving:'S235 profiel', norm:'EN 10025', cert:'DoP', hoeveelheid:'12 m', opmerking:''}
      ],
      toevoeg:[
        {id:'T-001', omschrijving:'SG2 draad', norm:'EN ISO 14341', batch:'BATCH-21', opmerking:''}
      ]
    };
    // demo revisions store
    st.revisions.byProject[p1.id] = { current:'A', list:[] };
    st.revisions.byProject[p2.id] = { current:'A', list:[] };

    // demo NDO plan
    st.ndoPlan.byWeld[w2.id] = { methods:['MT'], plannedDate:'', status:'open', reportDocIds:[] };
    // demo certs
    const c1 = {id:'C-9606-001', type:'lassers', name:'Lasser A', welderId:'WKR-001', certificateNo:'S00335401077/1VB/001', weldingProcess:'135, 138', typeOfWeld:'FW sl, ml', baseMetal:'1-1', fillerMaterial:'FM1, FM2', weldingPositions:'PA, PB', thicknessRange:'≥ 3.0 mm', diameterRange:'≥ 75.0 mm', ref:'ISO 9606-1', validTo:'2026-12-31', fileDocId:null};
    const c2 = {id:'C-COORD-001', type:'lascoordinator', name:'IWT A. Inspecteur', ref:'IWT', validTo:'2027-06-30', fileDocId:null};
    st.certs.byId[c1.id]=c1; st.certs.byId[c2.id]=c2;
    st.certs.byType.lassers=[c1.id];
    st.certs.byType.lascoordinator=[c2.id];

    st.audit.events = [];
    STATE = st;
    save(STATE);
    return STATE;
  }

  function toggleRole(){
    const roles = ["Admin","Inspector","Viewer"];
    const idx = roles.indexOf(STATE.ui.role);
    const next = roles[(idx+1+roles.length)%roles.length];
    STATE.ui.role = next;
    save(STATE);
    return next;
  }

  // CRUD helpers (generic)
  function upsertProject(p){
    const cur = STATE.projects.byId[p.id];
    if(cur && !canEditProject(cur)) throw new Error("Project is vergrendeld of geen rechten.");
    if(!cur && ((STATE.ui&&STATE.ui.role)==="Viewer")) throw new Error("Geen rechten.");
const before = STATE.projects.byId[p.id] ? deepClone(STATE.projects.byId[p.id]) : null;
    STATE.projects.byId[p.id] = {...(STATE.projects.byId[p.id]||{}), ...p, laatstGewijzigd: nowISO()};
    if(!STATE.projects.order.includes(p.id)) STATE.projects.order.unshift(p.id);
    withAudit(before ? "update":"create", "project", p.id, before, STATE.projects.byId[p.id]);
    save(STATE);
    return STATE.projects.byId[p.id];
  }

  function removeProject(id){
    const before = STATE.projects.byId[id] ? deepClone(STATE.projects.byId[id]) : null;
    if(!before) return false;
    delete STATE.projects.byId[id];
    STATE.projects.order = STATE.projects.order.filter(x=>x!==id);
    // orphan welds/docs lightly (demo app; full removal later)
    withAudit("delete", "project", id, before, null);
    if(STATE.ui.activeProjectId === id) STATE.ui.activeProjectId = STATE.projects.order[0] || null;
    save(STATE);
    return true;
  }


  // ----- Controls (criteria) -----
  const GROUPS = [
    { key:"pre", name:"Voorbereiding (pre-weld)" },
    { key:"proc", name:"Proces (tijdens lassen)" },
    { key:"vt", name:"Visuele inspectie (VT)" },
    { key:"ndo", name:"NDO (MT/PT/UT/RT)" }
  ];

  function defaultCriteriaFor(weld, project){
    // Minimal, extendable dataset aligned with prompt.
    // Fields: id, criterium, norm, vanToepassing, goedgekeurd, opmerking, bewijsId
    const exc = (project?.exc || "EXC2");
    const acc = (project?.acceptatieklasse || "B");
    // IMPORTANT: UI expects groups: pre, mat, weld, ndt, doc.
    // Keep IDs stable; they are also used as criterion_key in the backend checks table.
    
const base = {
  // 1) Voorbereiding
  pre: [
    { id:"pre-01", criterium:"WPS aanwezig", norm:"ISO 15614", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"pre-02", criterium:"WPQR geldig", norm:"ISO 9606", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"pre-03", criterium:"Laspositie correct", norm:"WPS", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"pre-04", criterium:"Lascoördinator aangewezen", norm:"EN 14731", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
  ],

  // 2) Materiaal
  mat: [
    { id:"mat-01", criterium:"Materiaalcertificaat 3.1", norm:"EN 10204", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"mat-02", criterium:"Warmtenummer traceerbaar", norm:"EN 1090", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"mat-03", criterium:"Toevoegmateriaal certificaat", norm:"EN ISO 14341", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"mat-04", criterium:"Opslag condities OK", norm:"Interne eis", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
  ],

  // 3) Uitvoering (visuele lasinspectie - ISO 5817)
  weld: [
    { id:"weld-iso-01", criterium:"Doorlassing", norm:"ISO 5817", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"weld-iso-02", criterium:"Undercut", norm:"ISO 5817", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"weld-iso-03", criterium:"Porositeit", norm:"ISO 5817", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"weld-iso-04", criterium:"Scheuren", norm:"ISO 5817", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
  ],

  // 4) NDT
  ndt: [
    { id:"ndt-01", criterium:"VT uitgevoerd", norm:"ISO 17637", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"ndt-02", criterium:"MT uitgevoerd", norm:"ISO 17638", vanToepassing:false, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"ndt-03", criterium:"UT uitgevoerd", norm:"ISO 17640", vanToepassing:false, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"ndt-04", criterium:"RT uitgevoerd", norm:"ISO 17636", vanToepassing:false, goedgekeurd:false, opmerking:"", bewijsId:null },
  ],

  // 5) Documentatie
  doc: [
    { id:"doc-01", criterium:"WPS bijgevoegd", norm:"", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"doc-02", criterium:"WPQ bijgevoegd", norm:"", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"doc-03", criterium:"NDT rapport bijgevoegd", norm:"", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
    { id:"doc-04", criterium:"Eindrapport opgesteld", norm:"", vanToepassing:true, goedgekeurd:false, opmerking:"", bewijsId:null },
  ]
};
return base;
  }

  function ensureControlsForWeld(weldId){
    const st = STATE;
    if(st.controls.byWeld[weldId]) return st.controls.byWeld[weldId];
    const weld = st.welds.byId[weldId];
    const proj = weld ? st.projects.byId[weld.projectId] : null;
    st.controls.byWeld[weldId] = defaultCriteriaFor(weld, proj);
    save(st);
    return st.controls.byWeld[weldId];
  }

  function setCriterion(weldId, groupKey, critId, patch){
    ensureControlsForWeld(weldId);
    const group = STATE.controls.byWeld[weldId][groupKey];
    if(!group) return false;
    const idx = group.findIndex(c=>c.id===critId);
    if(idx<0) return false;
    const before = deepClone(group[idx]);
    group[idx] = {...group[idx], ...patch};
    withAudit("update", "criterion", weldId+":"+critId, before, group[idx]);
    save(STATE);
    return true;
  }

  
function bulkSet(weldId, groupKey, mode){
  // mode: "all_off" | "all_on" | "approve_applicable" | "reset_norm"
  // UX/SSOT: bulk actions apply to the FULL checklist (all groups), not only the active tab.
  ensureControlsForWeld(weldId);
  const st = STATE;
  const weld = st.welds.byId[weldId];
  const proj = weld ? st.projects.byId[weld.projectId] : null;
  const base = defaultCriteriaFor(weld, proj);

  const applyToGroup = (gkey)=>{
    const group = st.controls.byWeld[weldId][gkey];
    if(!group) return;

    if(mode==="reset_norm"){
      st.controls.byWeld[weldId][gkey] = base[gkey].map(x=>deepClone(x)); // hard reset: wipes opmerkingen/bewijs
      return;
    }

    group.forEach(c=>{
      if(mode==="all_off") { c.vanToepassing = false; c.goedgekeurd = false; c.opmerking = ""; c.bewijsId = null; }
      if(mode==="all_on") { c.goedgekeurd = true; }
      if(mode==="approve_applicable") { c.goedgekeurd = !!c.vanToepassing; }
    });
  };

  ["pre","mat","weld","ndt","doc"].forEach(applyToGroup);

  withAudit(mode==="reset_norm" ? "reset" : "bulk", "criteria_all", weldId, null, st.controls.byWeld[weldId]);
  save(st);
  return true;
}


  function upsertWeld(w){
    // Bugfix: use the passed weld object `w` (previously referenced an undefined `weld`)
    const p = STATE.projects.byId[w.projectId];
    if(p && !canEditProject(p)) throw new Error("Project is vergrendeld of geen rechten.");
const before = STATE.welds.byId[w.id] ? deepClone(STATE.welds.byId[w.id]) : null;
    STATE.welds.byId[w.id] = {...(STATE.welds.byId[w.id]||{}), ...w, last: nowISO()};
    const pid = STATE.welds.byId[w.id].projectId;
    if(!STATE.welds.byProject[pid]) STATE.welds.byProject[pid]=[];
    if(!STATE.welds.byProject[pid].includes(w.id)) STATE.welds.byProject[pid].unshift(w.id);
    withAudit(before ? "update":"create", "weld", w.id, before, STATE.welds.byId[w.id]);
    save(STATE);
    return STATE.welds.byId[w.id];
  }

  function removeWeld(id){
    const before = STATE.welds.byId[id] ? deepClone(STATE.welds.byId[id]) : null;
    if(!before) return false;
    const pid = before.projectId;
    delete STATE.welds.byId[id];
    if(STATE.welds.byProject[pid]) STATE.welds.byProject[pid] = STATE.welds.byProject[pid].filter(x=>x!==id);
    withAudit("delete", "weld", id, before, null);
    save(STATE);
    return true;
  }


  // ----- Documents (project + weld) -----
  function upsertDocument(doc){
    // doc: {id, projectId, weldId|null, name, mime, size, dataUrl, ts}
    const before = STATE.documents.byId[doc.id] ? deepClone(STATE.documents.byId[doc.id]) : null;
    const next = {...(STATE.documents.byId[doc.id]||{}), ...doc, ts: nowISO()};
    STATE.documents.byId[doc.id] = next;

    const pid = next.projectId;
    if(pid){
      if(!STATE.documents.byProject[pid]) STATE.documents.byProject[pid]=[];
      if(!STATE.documents.byProject[pid].includes(next.id)) STATE.documents.byProject[pid].unshift(next.id);
    }
    withAudit(before ? "update":"create", "document", next.id, before, next);
    save(STATE);
    return next;
  }

  function removeDocument(id){
    const before = STATE.documents.byId[id] ? deepClone(STATE.documents.byId[id]) : null;
    if(!before) return false;
    delete STATE.documents.byId[id];
    // remove from project list
    Object.keys(STATE.documents.byProject||{}).forEach(pid=>{
      STATE.documents.byProject[pid] = (STATE.documents.byProject[pid]||[]).filter(x=>x!==id);
    });
    withAudit("delete", "document", id, before, null);
    save(STATE);
    return true;
  }

  // ----- NDO plan -----
  function ensureNdoForWeld(weldId){
    if(STATE.ndoPlan.byWeld[weldId]) return STATE.ndoPlan.byWeld[weldId];
    STATE.ndoPlan.byWeld[weldId] = { methods:[], plannedDate:"", status:"open", reportDocIds:[] };
    save(STATE);
    return STATE.ndoPlan.byWeld[weldId];
  }
  function setNdo(weldId, patch){
    ensureNdoForWeld(weldId);
    const before = deepClone(STATE.ndoPlan.byWeld[weldId]);
    STATE.ndoPlan.byWeld[weldId] = {...STATE.ndoPlan.byWeld[weldId], ...patch};
    withAudit("update", "ndoPlan", weldId, before, STATE.ndoPlan.byWeld[weldId]);
    save(STATE);
    return true;
  }

  // ----- Materials (per project) -----
  function ensureMaterials(projectId){
    if(STATE.materials.byProject[projectId]) return STATE.materials.byProject[projectId];
    STATE.materials.byProject[projectId] = { staal:[], toevoeg:[] };
    save(STATE);
    return STATE.materials.byProject[projectId];
  }
  function upsertMaterial(projectId, kind, item){
    ensureMaterials(projectId);
    const list = STATE.materials.byProject[projectId][kind] || [];
    const idx = list.findIndex(x=>x.id===item.id);
    const before = idx>=0 ? deepClone(list[idx]) : null;
    const next = {...(idx>=0?list[idx]:{}), ...item};
    if(idx>=0) list[idx]=next; else list.unshift(next);
    STATE.materials.byProject[projectId][kind]=list;
    withAudit(before ? "update":"create", "material:"+kind, projectId+":"+item.id, before, next);
    save(STATE);
    return next;
  }
  function removeMaterial(projectId, kind, id){
    ensureMaterials(projectId);
    const list = STATE.materials.byProject[projectId][kind] || [];
    const idx = list.findIndex(x=>x.id===id);
    if(idx<0) return false;
    const before = deepClone(list[idx]);
    list.splice(idx,1);
    STATE.materials.byProject[projectId][kind]=list;
    withAudit("delete", "material:"+kind, projectId+":"+id, before, null);
    save(STATE);
    return true;
  }

  // ----- Certificates -----
  function upsertCert(cert){
    // cert: {id, type:"lassers"|"lascoordinator"|"bedrijf", name, ref, validTo, fileDocId|null}
    const before = STATE.certs.byId[cert.id] ? deepClone(STATE.certs.byId[cert.id]) : null;
    const next = {...(STATE.certs.byId[cert.id]||{}), ...cert, ts: nowISO()};
    STATE.certs.byId[cert.id] = next;
    const t = next.type;
    if(t){
      if(!STATE.certs.byType[t]) STATE.certs.byType[t]=[];
      if(!STATE.certs.byType[t].includes(next.id)) STATE.certs.byType[t].unshift(next.id);
    }
    withAudit(before ? "update":"create", "cert", next.id, before, next);
    save(STATE);
    return next;
  }

  function removeCert(id){
    const before = STATE.certs.byId[id] ? deepClone(STATE.certs.byId[id]) : null;
    if(!before) return false;
    delete STATE.certs.byId[id];
    Object.keys(STATE.certs.byType||{}).forEach(t=>{
      STATE.certs.byType[t] = (STATE.certs.byType[t]||[]).filter(x=>x!==id);
    });
    withAudit("delete", "cert", id, before, null);
    save(STATE);
    return true;
  }

  // ----- Checklist & Conform + Locking -----
  function defaultChecklistForProject(project){
    const exc = project?.exc || "EXC2";
    return [
      { id:"cl-01", title:"Projectgegevens compleet", norm:"EN 1090-1/2", vanToepassing:true, status:"in_controle", opmerking:"" },
      { id:"cl-02", title:"Lassen geregistreerd (IDs/locaties/proces)", norm:"EN 1090-2", vanToepassing:true, status:"in_controle", opmerking:"" },
      { id:"cl-03", title:"VT uitgevoerd en geregistreerd", norm:"ISO 17637", vanToepassing:true, status:"in_controle", opmerking:"" },
      { id:"cl-04", title:"NDO plan opgesteld (indien vereist)", norm:"EN 1090-2", vanToepassing:(exc==="EXC3"||exc==="EXC4"), status:"in_controle", opmerking:"" },
      { id:"cl-05", title:"Materiaalcertificaten gekoppeld", norm:"EN 10204", vanToepassing:true, status:"in_controle", opmerking:"" },
      { id:"cl-06", title:"Certificaten lassers/bedrijf geldig", norm:"ISO 9606-1 / EN 1090", vanToepassing:true, status:"in_controle", opmerking:"" },
      { id:"cl-07", title:"Rapportage gecontroleerd", norm:"Audit-proof dossier", vanToepassing:true, status:"in_controle", opmerking:"" }
    ];
  }

  function ensureChecklist(projectId){
    if(STATE.checklist.byProject[projectId]) return STATE.checklist.byProject[projectId];
    const p = STATE.projects.byId[projectId];
    STATE.checklist.byProject[projectId] = {
      items: defaultChecklistForProject(p),
      signature: { name:"", date:"", signatureText:"" },
      locked: false
    };
    save(STATE);
    return STATE.checklist.byProject[projectId];
  }

  function setChecklistItem(projectId, itemId, patch){
    ensureChecklist(projectId);
    const cl = STATE.checklist.byProject[projectId];
    const idx = cl.items.findIndex(x=>x.id===itemId);
    if(idx<0) return false;
    const before = deepClone(cl.items[idx]);
    cl.items[idx] = {...cl.items[idx], ...patch};
    withAudit("update", "checklistItem", projectId+":"+itemId, before, cl.items[idx]);
    save(STATE);
    return true;
  }

  function bulkChecklist(projectId, mode){
    // "all_off" | "approve_applicable" | "reset_norm"
    ensureChecklist(projectId);
    const cl = STATE.checklist.byProject[projectId];
    if(mode==="reset_norm"){
      const p = STATE.projects.byId[projectId];
      cl.items = defaultChecklistForProject(p);
      withAudit("reset", "checklist", projectId, null, cl.items);
      save(STATE);
      return true;
    }
    cl.items.forEach(it=>{
      if(!it) return;
      if(mode==="all_off"){ it.vanToepassing = false; it.status = "in_controle"; it.opmerking = ""; }
      if(mode==="approve_applicable"){ it.status = "conform"; }
    });
    withAudit("bulk", "checklist", projectId, null, cl.items);
    save(STATE);
    return true;
  }

  function checklistProgress(projectId){
    ensureChecklist(projectId);
    const cl = STATE.checklist.byProject[projectId];
    const applicable = cl.items.filter(i=>i.vanToepassing);
    const ok = applicable.filter(i=>String(i.status||'').toLowerCase()==='conform');
    return { ok: ok.length, total: applicable.length };
  }

  function createRevision(projectId, note){
    // snapshot minimal: whole state slice related to project
    const p = STATE.projects.byId[projectId];
    if(!p) return false;
    if(!STATE.revisions.byProject[projectId]){
      STATE.revisions.byProject[projectId] = { current:"A", list:[] };
    }
    const revObj = STATE.revisions.byProject[projectId];
    const nextLetter = String.fromCharCode(65 + revObj.list.length); // A,B,C...
    const snapshot = {
      project: deepClone(p),
      welds: deepClone((STATE.welds.byProject[projectId]||[]).map(id=>STATE.welds.byId[id]).filter(Boolean)),
      controls: deepClone(Object.fromEntries((STATE.welds.byProject[projectId]||[]).map(id=>[id, STATE.controls.byWeld[id]||null]))),
      documents: deepClone((STATE.documents.byProject[projectId]||[]).map(id=>STATE.documents.byId[id]).filter(Boolean)),
      materials: deepClone(STATE.materials.byProject[projectId]||{st:[],toevoeg:[]}),
      checklist: deepClone(STATE.checklist.byProject[projectId]||null),
      certs: deepClone(Object.values(STATE.certs.byId||{}))
    };
    const entry = { rev: nextLetter, ts: nowISO(), note: note||"", snapshot };
    revObj.list.unshift(entry);
    revObj.current = nextLetter;
    withAudit("create", "revision", projectId+":"+nextLetter, null, entry);
    save(STATE);
    return nextLetter;
  }

  function signAndLockProject(projectId, name, signatureText){
    ensureChecklist(projectId);
    const p = STATE.projects.byId[projectId];
    if(!p) return false;
    const prog = checklistProgress(projectId);
    // must be fully approved (applicable)
    if(prog.ok !== prog.total) return false;

    const cl = STATE.checklist.byProject[projectId];
    cl.signature = { name: String(name||""), date: nowISO().slice(0,10), signatureText: String(signatureText||"") };
    cl.locked = true;

    const before = deepClone(p);
    p.locked = true;
    p.status = "locked";
    p.laatstGewijzigd = nowISO();

    // create revision on lock
    createRevision(projectId, "Project locked / conform verklaring");

    withAudit("lock", "project", projectId, before, p);
    save(STATE);
    return true;
  }

  function unlockProject(projectId){
    // Admin only guard in UI; still keep here
    const p = STATE.projects.byId[projectId];
    if(!p) return false;
    const before = deepClone(p);
    p.locked = false;
    p.status = "in_controle";
    p.laatstGewijzigd = nowISO();
    if(STATE.checklist.byProject[projectId]) STATE.checklist.byProject[projectId].locked = false;
    withAudit("unlock", "project", projectId, before, p);
    save(STATE);
    return true;
  }

  // ----- Instellingen: bedrijf / werknemers / keuzelijsten -----
  function updateCompany(patch){
    const before = deepClone(STATE.settings.company||{});
    STATE.settings.company = {...(STATE.settings.company||{}), ...(patch||{})};
    withAudit("update","settingsCompany","company", before, STATE.settings.company);
    save(STATE);
    return true;
  }

  function upsertWorker(worker){
    const w = {...worker};
    if(!w.id) w.id = "WKR-" + Math.random().toString(16).slice(2,8).toUpperCase();
    const before = deepClone(STATE.settings.workers.byId[w.id]||null);
    STATE.settings.workers.byId[w.id] = {...(STATE.settings.workers.byId[w.id]||{}), ...w};
    if(!STATE.settings.workers.order.includes(w.id)) STATE.settings.workers.order.unshift(w.id);
    withAudit(before ? "update":"create","worker", w.id, before, STATE.settings.workers.byId[w.id]);
    save(STATE);
    return w.id;
  }

  function removeWorker(id){
    const before = deepClone(STATE.settings.workers.byId[id]||null);
    delete STATE.settings.workers.byId[id];
    STATE.settings.workers.order = (STATE.settings.workers.order||[]).filter(x=>x!==id);
    withAudit("delete","worker", id, before, null);
    save(STATE);
    return true;
  }

  function updateList(listKey, values){
    const before = deepClone((STATE.settings.lists||{})[listKey]||[]);
    STATE.settings.lists[listKey] = Array.isArray(values) ? values : before;
    withAudit("update","list", listKey, before, STATE.settings.lists[listKey]);
    save(STATE);
    return true;
  }

  // --- Workflow & compliance helpers ---
  function deriveProjectCompliance(projectId){
    const st = STATE;
    const res = { ok:true, issues:[], warn:[] };

    const weldIds = (st.welds.byProject && st.welds.byProject[projectId]) ? st.welds.byProject[projectId] : [];
    if(!weldIds || !weldIds.length){
      res.ok = false;
      res.issues.push("Geen lassen aanwezig.");
    }
    (weldIds||[]).forEach(id=>{
      const w = st.welds.byId[id];
      if(!w) return;
      if(!(w.materiaal||"").trim()){ res.ok=false; res.issues.push(`Las ${id}: Materiaal ontbreekt.`); }
      if(!(w.dikte||"").toString().trim()){ res.ok=false; res.issues.push(`Las ${id}: Dikte ontbreekt.`); }
      if(!(w.lassers||"").trim()){ res.ok=false; res.issues.push(`Las ${id}: Lasser(s) ontbreekt.`); }
    });

    const cl = (st.checklist && st.checklist.byProject) ? st.checklist.byProject[projectId] : null;
    if(!cl || !Array.isArray(cl.items) || !cl.items.length){
      res.ok = false;
      res.issues.push("Checklist ontbreekt.");
    } else {
      const missing = cl.items.filter(it=>it && it.vanToepassing && String(it.status||'').toLowerCase()!=='conform');
      if(missing.length){
        res.ok = false;
        res.issues.push(`${missing.length} checklist-items niet goedgekeurd.`);
      }
    }

    const docIds = (st.documents && st.documents.byProject) ? (st.documents.byProject[projectId]||[]) : [];
    if(!(docIds||[]).length){
      res.warn.push("Geen bewijsstukken (documenten/foto’s) geüpload.");
    }
    return res;
  }

  function canEditProject(project){
    const role = (STATE.ui && STATE.ui.role) ? STATE.ui.role : "Admin";
    if(role==="Viewer") return false;
    if(project && (project.locked || project.status==="Gesloten")) return false;
    return true;
  }

  function setProjectStatus(projectId, status){
    const p = STATE.projects.byId[projectId];
    if(!p) return false;

    const role = (STATE.ui && STATE.ui.role) ? STATE.ui.role : "Admin";
    if(role==="Viewer"){ throw new Error("Geen rechten."); }

    const allowed = {
      "Concept": ["In controle"],
      "In controle": ["Goedgekeurd","Concept"],
      "Goedgekeurd": ["Gesloten","In controle"],
      "Gesloten": []
    };
    const cur = p.status || "Concept";
    if(!(allowed[cur]||[]).includes(status)){
      throw new Error(`Ongeldige statusovergang: ${cur} → ${status}`);
    }
    if(status==="Goedgekeurd" || status==="Gesloten"){
      const comp = deriveProjectCompliance(projectId);
      if(!comp.ok){
        throw new Error("Project kan niet worden goedgekeurd/gesloten:\n- " + comp.issues.join("\n- "));
      }
    }

    const before = deepClone(p);
    p.status = status;
    p.locked = (status==="Gesloten");
    p.laatstGewijzigd = new Date().toISOString();
    withAudit("update","project_status", projectId, before, deepClone(p));
    save(STATE);
    return true;
  }


  function upsertAssembly(a){
    const before = STATE.assemblies.byId[a.id] ? deepClone(STATE.assemblies.byId[a.id]) : null;
    STATE.assemblies.byId[a.id] = {...(STATE.assemblies.byId[a.id]||{}), ...a, last: nowISO()};
    const pid = STATE.assemblies.byId[a.id].projectId;
    if(!STATE.assemblies.byProject[pid]) STATE.assemblies.byProject[pid]=[];
    if(!STATE.assemblies.byProject[pid].includes(a.id)) STATE.assemblies.byProject[pid].unshift(a.id);
    withAudit(before ? "update":"create", "assembly", a.id, before, STATE.assemblies.byId[a.id]);
    save(STATE);
    return STATE.assemblies.byId[a.id];
  }

  function removeAssembly(id){
    const before = STATE.assemblies.byId[id] ? deepClone(STATE.assemblies.byId[id]) : null;
    if(!before) return false;
    const pid = before.projectId;
    delete STATE.assemblies.byId[id];
    if(STATE.assemblies.byProject[pid]) STATE.assemblies.byProject[pid] = STATE.assemblies.byProject[pid].filter(x=>x!==id);
    Object.values(STATE.welds.byId||{}).forEach(w=>{ if(w && w.assemblyId===id) w.assemblyId = null; });
    withAudit("delete", "assembly", id, before, null);
    save(STATE);
    return true;
  }

  window.CWS = {
    getState,
    setState,
    deriveProjectCompliance,
    canEditProject,
    setProjectStatus,
    clearAll,
    resetDemo,
    toggleRole,
    upsertWorker,
    removeWorker,
    upsertProject,
    removeProject,
    upsertAssembly,
    removeAssembly,
    upsertWeld,
    removeWeld,
    ensureControlsForWeld,
    setCriterion,
    bulkSet,
    upsertDocument,
    removeDocument,
    ensureNdoForWeld,
    setNdo,
    ensureMaterials,
    upsertMaterial,
    removeMaterial,
    upsertCert,
    removeCert,
    ensureChecklist,
    setChecklistItem,
    bulkChecklist,
    checklistProgress,
    signAndLockProject,
    unlockProject,
    createRevision,
    // Instellingen helpers (used by Instellingen page + Wizards)
    updateCompany,
    updateList
  };
})();


