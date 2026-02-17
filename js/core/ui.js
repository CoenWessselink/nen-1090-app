/* UI helpers: toast, modal, contextmenu (minimal) */
(function(){
  function toast(msg){
    const el = document.getElementById("toast");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>el.classList.remove("show"), 2200);
  }

  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

  window.UI = { toast, esc };
})();


// ---- Modal Form (popup) ----
(function(){
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

  function ensureBackdrop(){
    let bd = document.getElementById("uiModalBackdrop");
    if(bd) return bd;
    bd = document.createElement("div");
    bd.id = "uiModalBackdrop";
    bd.className = "modal-backdrop";
    bd.style.display = "none";
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span id="uiModalTitle">Bewerken</span>
          <button class="close" id="uiModalClose" aria-label="Sluiten">✕</button>
        </div>
        <div class="modal-body" id="uiModalBody"></div>
        <div class="footerbar" style="justify-content:flex-end; gap:10px;">
          <button class="btn" id="uiModalCancel">Annuleren</button>
          <button class="btn" id="uiModalSave">Opslaan</button>
        </div>
      </div>
    `;
    document.body.appendChild(bd);
    return bd;
  }

  function openModal({title, bodyHtml, onSave, onCancel, saveLabel}){
    const bd = ensureBackdrop();
    // Save focus so we can restore it on close (avoids aria-hidden focus warnings)
    const prevFocus = document.activeElement;
    bd.style.display = "flex";
    bd.setAttribute("aria-hidden","false");
    document.getElementById("uiModalTitle").textContent = title || "Bewerken";
    document.getElementById("uiModalBody").innerHTML = bodyHtml || "";
    const btnClose = document.getElementById("uiModalClose");
    const btnCancel = document.getElementById("uiModalCancel");
    const btnSave = document.getElementById("uiModalSave");
    btnSave.textContent = saveLabel || "Opslaan";

    function close(){
      // Restore focus before hiding the modal from the accessibility tree.
      try{
        if(prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
        else document.body.focus?.();
      }catch(_e){}
      bd.style.display = "none";
      bd.setAttribute("aria-hidden","true");
      document.getElementById("uiModalBody").innerHTML = "";
      btnClose.onclick = btnCancel.onclick = btnSave.onclick = null;
      bd.onclick = null;
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e){ if(e.key==="Escape"){ close(); onCancel?.(); } }

    btnClose.onclick = ()=>{ close(); onCancel?.(); };
    btnCancel.onclick = ()=>{ close(); onCancel?.(); };
    btnSave.onclick = async ()=>{
      try{
        await onSave?.({close});
      }catch(e){
        console.error(e);
        window.__CWS_LAST_ERROR = e;
        UI.toast("Opslaan mislukt: " + (e && (e.message||e.toString()) ? (e.message||e.toString()) : "Onbekend"));
      }
    };
    bd.onclick = (e)=>{ if(e.target===bd){ close(); onCancel?.(); } };
    document.addEventListener("keydown", onKey);
    return { close };
  }

  function modalForm({title, fields, values, onSubmit, submitLabel}){
    const v = values || {};
    const rows = (fields||[]).map(f=>{
      const id = "mf_" + f.key;
      const val = v[f.key] ?? f.default ?? "";
      const type = f.type || "text";
      const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : "";
      const ro = f.readonly ? " readonly" : "";
      const dis = f.disabled ? " disabled" : "";
      const label = esc(f.label || f.key);
      let inputHtml = "";
      if(type==="select"){
        const opts = (f.options||[]).map(o=>{
          const ov = typeof o==="string" ? o : o.value;
          const ol = typeof o==="string" ? o : o.label;
          const sel = String(ov)===String(val) ? " selected" : "";
          return `<option value="${esc(ov)}"${sel}>${esc(ol)}</option>`;
        }).join("");
        inputHtml = `<select class="input" id="${id}"${dis}>${opts}</select>`;
      }else if(type==="textarea"){
        inputHtml = `<textarea class="input" id="${id}" rows="${f.rows||3}"${ph}${ro}${dis}>${esc(val)}</textarea>`;
      }else{
        inputHtml = `<input class="input" id="${id}" type="${esc(type)}" value="${esc(val)}"${ph}${ro}${dis} />`;
      }
      return `<div style="display:grid; grid-template-columns:220px 1fr; gap:10px; align-items:center; margin:8px 0;">
        <div class="smallmuted" style="font-weight:800">${label}</div>
        <div>${inputHtml}</div>
      </div>`;
    }).join("");

    return openModal({
      title: title || "Bewerken",
      bodyHtml: `<div>${rows}</div>`,
      saveLabel: submitLabel || "Opslaan",
      onSave: async ({close})=>{
        const out = {};
        (fields||[]).forEach(f=>{
          const id = "mf_" + f.key;
          const el = document.getElementById(id);
          if(!el) return;
          out[f.key] = el.value;
        });
        const res = await onSubmit?.(out);
        if(res !== false) close();
      }
    });
  }

  UI.openModal = openModal;
  UI.modalForm = modalForm;
})();

// ---- Table helpers ----
(function(){
  UI.bindRowDblClick = function(tbody, handler){
    if(!tbody) return;
    tbody.addEventListener("dblclick", (e)=>{
      const tr = e.target.closest("tr[data-id]");
      if(!tr) return;
      handler(tr.getAttribute("data-id"), tr);
    });
  };
})();

// ---- Download helper ----
(function(){
  UI.downloadBlob = function(filename, blob){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(_){ } }, 2000);
  };
})();

// ---- Context menu (right-click) ----
(function(){
  function ensure(){
    let el = document.getElementById("uiContextMenu");
    if(el) return el;
    el = document.createElement("div");
    el.id = "uiContextMenu";
    el.style.position = "fixed";
    el.style.zIndex = "9999";
    el.style.minWidth = "180px";
    el.style.background = "white";
    el.style.border = "1px solid rgba(15,23,42,0.15)";
    el.style.borderRadius = "12px";
    el.style.boxShadow = "0 12px 30px rgba(15,23,42,0.18)";
    el.style.padding = "6px";
    el.style.display = "none";
    el.innerHTML = `<div id="uiContextItems"></div>`;
    document.body.appendChild(el);

    function hide(){ el.style.display="none"; el.innerHTML = `<div id="uiContextItems"></div>`; }
    window.addEventListener("click", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("keydown", (e)=>{ if(e.key==="Escape") hide(); });
    return el;
  }

  UI.showContextMenu = function(items, x, y){
    const el = ensure();
    const wrap = document.createElement("div");
    (items||[]).filter(Boolean).forEach(it=>{
      if(it.separator){
        const hr = document.createElement("div");
        hr.style.height="1px";
        hr.style.background="rgba(15,23,42,0.10)";
        hr.style.margin="6px 0";
        wrap.appendChild(hr);
        return;
      }
      const b = document.createElement("button");
      b.className = "btn";
      b.style.width="100%";
      b.style.textAlign="left";
      b.style.display="flex";
      b.style.justifyContent="space-between";
      b.style.padding="8px 10px";
      b.style.margin="2px 0";
      b.style.borderRadius="10px";
      b.style.background="transparent";
      b.style.border="0";
      b.style.cursor="pointer";
      b.onmouseenter = ()=>{ b.style.background="rgba(59,130,246,0.10)"; };
      b.onmouseleave = ()=>{ b.style.background="transparent"; };
      b.innerHTML = `<span>${UI.esc(it.label||"Actie")}</span><span class="smallmuted">${UI.esc(it.hint||"")}</span>`;
      b.onclick = (e)=>{
        e.stopPropagation();
        el.style.display="none";
        try{ it.onClick && it.onClick(); }catch(err){ console.error(err); UI.toast("Actie mislukt."); }
      };
      if(it.disabled){
        b.disabled = true;
        b.style.opacity="0.5";
        b.style.cursor="not-allowed";
      }
      wrap.appendChild(b);
    });
    el.innerHTML = "";
    el.appendChild(wrap);

    // keep inside viewport
    el.style.display="block";
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = x, top = y;
    if(left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
    if(top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
    el.style.left = Math.max(pad, left) + "px";
    el.style.top = Math.max(pad, top) + "px";
  };
})();

// ---- Project 360 modal ----
(function(){
  UI.openProject360 = function(projectId){
    try{
      const st = window.CWS.getState();
      const p = st.projects.byId[projectId];
      if(!p){ UI.toast("Project niet gevonden."); return; }

      const stats = {
        lassen: (st.welds?.byProject?.[projectId]||[]).length,
        docs: (st.documents?.byProject?.[projectId]||[]).length,
        checklist: (st.checklist?.byProject?.[projectId]||[]).length || 0,
        revisies: (st.revisions?.byProject?.[projectId]||[]).length || 0
      };

      UI.openModal({
        title:`Project 360° — ${UI.esc(p.nummer)} ${UI.esc(p.naam||"")}`,
        saveLabel:"Sluiten",
        bodyHtml: `
          <div class="pillrow" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <span class="pillmini">Status: ${UI.esc(p.status||"-")}</span>
            <span class="pillmini">Lassen: ${stats.lassen}</span>
            <span class="pillmini">Docs: ${stats.docs}</span>
            <span class="pillmini">Checklist: ${stats.checklist}</span>
            <span class="pillmini">Revisies: ${stats.revisies}</span>
          </div>

          <div class="card" style="margin-bottom:10px">
            <div class="card-title">Algemeen</div>
            <div class="grid2">
              <div><strong>Projectnr</strong><div>${UI.esc(p.nummer)}</div></div>
              <div><strong>Naam</strong><div>${UI.esc(p.naam||"")}</div></div>
              <div><strong>Opdrachtgever</strong><div>${UI.esc(p.opdrachtgever||"")}</div></div>
              <div><strong>Locatie</strong><div>${UI.esc(p.locatie||"")}</div></div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Navigatie</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" id="p360_edit">Bewerk project</button>
              <button class="btn" id="p360_las">Ga naar Lascontrole</button>
              <button class="btn" id="p360_docs">Documenten</button>
              <button class="btn" id="p360_check">Checklist</button>
            </div>
          </div>
        `,
        onSave: ({close})=>close()
      });

      document.getElementById("p360_edit").onclick = ()=>{ UI.closeModal(); editProject(projectId); };
      document.getElementById("p360_las").onclick = ()=>{
        const st2 = window.CWS.getState();
        st2.ui.activeProjectId = projectId;
        window.CWS.setState(st2);
        location.href = "./lascontrole.html?r="+Date.now();
      };
      document.getElementById("p360_docs").onclick = ()=>{
        const st2 = window.CWS.getState();
        st2.ui.activeProjectId = projectId;
        window.CWS.setState(st2);
        location.href = "./lascontrole.html#docs";
      };
      document.getElementById("p360_check").onclick = ()=>{
        const st2 = window.CWS.getState();
        st2.ui.activeProjectId = projectId;
        window.CWS.setState(st2);
        location.href = "./lascontrole.html#checklist";
      };
    }catch(e){
      console.error(e);
      UI.toast("Project 360 fout.");
    }
  };
})();

// ---- Column manager (show/hide + order) ----
(function(){
  UI.columnManager = function({title, columns, stateKey, onApply}){
    const st = window.CWS.getState();
    st.ui.view = st.ui.view || {};
    const cfg = st.ui.view[stateKey] || { order: columns.map(c=>c.key), hidden: [] };
    const order = (cfg.order||[]).filter(k=>columns.some(c=>c.key===k));
    // include any new cols not in order
    columns.forEach(c=>{ if(!order.includes(c.key)) order.push(c.key); });
    const hidden = new Set(cfg.hidden||[]);

    const body = `
      <div class="kbd" style="margin-bottom:10px">Sleep om volgorde te wijzigen • Vink uit om te verbergen</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th style="width:36px"></th><th>Kolom</th><th style="width:140px">Zichtbaar</th></tr></thead>
          <tbody id="cm_rows">
            ${order.map(k=>{
              const col = columns.find(c=>c.key===k);
              const label = col ? col.label : k;
              const vis = !hidden.has(k);
              return `<tr data-id="${UI.esc(k)}" draggable="true" style="cursor:grab">
                <td class="smallmuted">≡</td>
                <td>${UI.esc(label)}</td>
                <td><input type="checkbox" ${vis?'checked':''} data-vis="${UI.esc(k)}"></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    UI.openModal({
      title: title || "Kolommen",
      saveLabel: "Toepassen",
      bodyHtml: body,
      onSave: ({close})=>{
        // read final order + hidden
        const tb = document.getElementById("cm_rows");
        const newOrder = [...tb.querySelectorAll("tr[data-id]")].map(tr=>tr.getAttribute("data-id"));
        const newHidden = [];
        tb.querySelectorAll("input[data-vis]").forEach(ch=>{
          const k = ch.getAttribute("data-vis");
          if(!ch.checked) newHidden.push(k);
        });
        const st2 = window.CWS.getState();
        st2.ui.view = st2.ui.view || {};
        st2.ui.view[stateKey] = { order:newOrder, hidden:newHidden };
        window.CWS.setState(st2);
        try{ onApply && onApply(st2.ui.view[stateKey]); }catch(e){ console.error(e); }
        close();
      }
    });

    // drag reorder
    const tbody = document.getElementById("cm_rows");
    let dragEl = null;
    tbody.addEventListener("dragstart",(e)=>{
      const tr = e.target.closest("tr[data-id]");
      if(!tr) return;
      dragEl = tr;
      e.dataTransfer.effectAllowed = "move";
    });
    tbody.addEventListener("dragover",(e)=>{
      e.preventDefault();
      const tr = e.target.closest("tr[data-id]");
      if(!tr || !dragEl || tr===dragEl) return;
      const rect = tr.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height/2;
      tbody.insertBefore(dragEl, before ? tr : tr.nextSibling);
    });
    tbody.addEventListener("drop",(e)=>{ e.preventDefault(); dragEl=null; });
  };
})();


  // Global error helpers (debug-friendly, file:// safe)
  window.addEventListener('error', (ev)=>{
    try{
      window.__CWS_LAST_ERROR = ev.error || ev.message;
      if(ev && ev.message) UI.toast("Fout: " + ev.message);
    }catch(_){}
  });
  window.addEventListener('unhandledrejection', (ev)=>{
    try{
      window.__CWS_LAST_ERROR = ev.reason;
      const msg = (ev.reason && (ev.reason.message||ev.reason.toString())) ? (ev.reason.message||ev.reason.toString()) : "Onbekend";
      UI.toast("Promise fout: " + msg);
    }catch(_){}
  });
