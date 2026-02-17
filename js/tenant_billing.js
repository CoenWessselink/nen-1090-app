(function(){
  const $ = (id)=>document.getElementById(id);

  function fmtDate(s){
    if(!s) return "–";
    try{
      const d = new Date(s);
      if(isNaN(d.getTime())) return String(s);
      return d.toLocaleString();
    }catch(e){
      return String(s);
    }
  }

  function setText(id, v){
    const el=$(id); if(el) el.textContent = (v===null || v===undefined || v==="") ? "–" : String(v);
  }

  async function load(){
    setText("hint","laden…");
    try{
      const st = await Auth.tenantBilling.status();
      window.__BILLING_STATUS__ = st;

      setText("kStatus", st.status || "–");
      setText("kSeats", st.seats_purchased);
      setText("kUsers", st.users_count);
      setText("kValid", st.valid_until ? fmtDate(st.valid_until) : "–");

      setText("vTrial", st.trial_until ? fmtDate(st.trial_until) : "–");
      setText("vProvider", st.billing_provider || "none");
      setText("vMollieStatus", st.mollie_subscription_status || "–");
      setText("vNextPay", st.mollie_next_payment_date ? fmtDate(st.mollie_next_payment_date) : "–");

      const pend = (st.pending_seats ? `${st.pending_seats} (vanaf ${fmtDate(st.pending_seats_effective_at)})` : "–");
      setText("vPending", pend);

      const inp=$("targetSeats");
      if(inp && (!inp.value || Number(inp.value)<=0)) inp.value = st.seats_purchased || 1;

      setText("hint","ok");
    }catch(err){
      console.error(err);
      setText("hint", "fout: " + (err && err.message ? err.message : err));
    }
  }

  async function preview(){
    const target = Number(($("targetSeats")||{}).value || 0);
    if(!target || target<1){ UI.toast("Vul een geldig seat aantal in"); return; }
    try{
      const p = await Auth.tenantBilling.preview({target_seats: target});
      const txt = `Huidig: ${p.current_seats} → Nieuw: ${p.target_seats} • Actie: ${p.action}` + (p.effective_at ? ` • Ingang: ${fmtDate(p.effective_at)}` : "") + (p.amount_cents_year ? ` • Jaarbedrag: €${(p.amount_cents_year/100).toFixed(2)}` : "");
      setText("previewText", txt);
    }catch(err){
      console.error(err);
      UI.toast("Preview fout: " + (err && err.data && err.data.detail ? JSON.stringify(err.data.detail) : err.message));
    }
  }

  async function apply(){
    const target = Number(($("targetSeats")||{}).value || 0);
    if(!target || target<1){ UI.toast("Vul een geldig seat aantal in"); return; }

    const st = window.__BILLING_STATUS__ || {};
    const cur = Number(st.seats_purchased || 0);
    const action = target > cur ? "upgrade" : (target < cur ? "downgrade (gepland)" : "noop");
    if(target === cur){ UI.toast("Geen wijziging"); return; }

    if(!confirm(`Seats wijzigen: ${cur} → ${target}\nActie: ${action}\nDoorgaan?`)) return;

    try{
      await Auth.tenantBilling.change({target_seats: target});
      UI.toast("Opgeslagen");
      await load();
      await preview();
    }catch(err){
      console.error(err);
      UI.toast("Opslaan fout: " + (err && err.data && err.data.detail ? JSON.stringify(err.data.detail) : err.message));
    }
  }

  function bind(){
    const r=$("btnRefresh"); if(r) r.addEventListener("click", load);
    const p=$("btnPreview"); if(p) p.addEventListener("click", preview);
    const a=$("btnApply"); if(a) a.addEventListener("click", apply);
  }

  bind();
  load();
})();
