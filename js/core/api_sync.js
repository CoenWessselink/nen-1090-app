(function(){
  function apiBase(){
    const raw = localStorage.getItem('API_BASE_URL') || window.__API_BASE_URL__ || '/api/v1';
    return String(raw).replace(/\/+$/, '');
  }
  async function request(path, options){
    const res = await fetch(apiBase() + path, {
      headers: { 'Content-Type': 'application/json', ...(options && options.headers ? options.headers : {}) },
      ...(options||{})
    });
    if(!res.ok){
      const text = await res.text().catch(()=> '');
      throw new Error(`API ${res.status}${text ? `: ${text.slice(0,120)}` : ''}`);
    }
    const type = res.headers.get('content-type') || '';
    return type.includes('application/json') ? res.json() : res.text();
  }

  function state(){ return window.CWS.getState(); }

  function activeProject(){
    const st = state();
    return st.projects.byId[st.ui.activeProjectId] || null;
  }

  function projectPayload(projectId){
    const st = state();
    const project = st.projects.byId[projectId];
    if(!project) throw new Error('Geen actief project geselecteerd.');
    const assemblyIds = st.assemblies.byProject[projectId] || [];
    const weldIds = st.welds.byProject[projectId] || [];
    const assemblies = assemblyIds.map(id => st.assemblies.byId[id]).filter(Boolean);
    const welds = weldIds.map(id => st.welds.byId[id]).filter(Boolean);
    const inspections = welds.map(w => ({ weld_id: w.id, checks: st.controls.byWeld[w.id] || {} }));
    const photos = (st.documents.byProject[projectId] || []).map(id => st.documents.byId[id]).filter(Boolean).filter(d => d.kind === 'photo').map(d => ({
      id: d.id,
      weld_id: d.weldId || null,
      project_id: d.projectId,
      name: d.name,
      mime: d.mime,
      captured_at: d.ts,
      has_data: !!(d.dataUrl || d.fileDataUrl || d.pdfDataUrl || d.hasData)
    }));
    return { project, assemblies, welds, inspections, photos };
  }

  async function pushActiveProject(){
    const p = activeProject();
    if(!p) throw new Error('Geen actief project.');
    const payload = projectPayload(p.id);
    await request('/projects/import_bundle', { method:'POST', body: JSON.stringify(payload) });
    return { ok:true, projectId:p.id };
  }

  async function pullProjects(){
    const data = await request('/projects');
    return Array.isArray(data) ? data : (data.items || []);
  }

  async function ceExport(projectId){
    return request(`/ce_export/${encodeURIComponent(projectId)}`);
  }

  window.CWSApiSync = {
    apiBase,
    request,
    pushActiveProject,
    pullProjects,
    ceExport,
    projectPayload
  };
})();
