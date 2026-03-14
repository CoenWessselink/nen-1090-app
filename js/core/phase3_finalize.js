(function(){
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function text(sel, scope){ return (scope||document).querySelector(sel)?.textContent?.trim() || ''; }
  function bindCardsFromRows(opts){
    const tableBody = document.querySelector(opts.tbody);
    const host = document.querySelector(opts.host);
    if(!tableBody || !host) return;
    function render(){
      const rows = [...tableBody.querySelectorAll('tr[data-id], tr[data-user-id]')];
      if(!rows.length){
        const empty = tableBody.querySelector('tr td')?.textContent?.trim() || 'Geen resultaten';
        host.innerHTML = `<article class="mobile-card"><div class="mobile-card-title">Geen resultaten</div><div class="mobile-card-sub">${esc(empty)}</div></article>`;
        return;
      }
      host.innerHTML = rows.map((tr)=> opts.mapRow(tr)).join('');
      host.querySelectorAll('[data-open-id]').forEach((btn)=>btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-open-id');
        const target = tableBody.querySelector(`button[data-id="${CSS.escape(id)}"]`) || tableBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
        if(target?.click) target.click();
      }));
    }
    render();
    const obs = new MutationObserver(render);
    obs.observe(tableBody, { childList:true, subtree:true, characterData:true });
  }
  window.Phase3Finalize = { bindCardsFromRows, text, esc };
})();
