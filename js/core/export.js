/* Export helpers */
(function(){
  function escCsv(v){
    const s = String(v ?? "");
    return '"' + s.replace(/"/g,'""') + '"';
  }
  function download(filename, blob){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(_){} }, 1500);
  }
  const api = {
    csv(filename, rows){
      const content = (rows||[]).map(r => (r||[]).map(escCsv).join(",")).join("\n");
      download(filename, new Blob([content], {type:"text/csv;charset=utf-8"}));
    },
    toCsv(filename, rows){
      if(!rows || !rows.length){ return api.csv(filename, []); }
      if(Array.isArray(rows[0])) return api.csv(filename, rows);
      const keys = Array.from(rows.reduce((acc,row)=>{ Object.keys(row||{}).forEach(k=>acc.add(k)); return acc; }, new Set()));
      const matrix = [keys].concat(rows.map(r => keys.map(k => r?.[k] ?? "")));
      return api.csv(filename, matrix);
    },
    json(filename, data){
      download(filename, new Blob([JSON.stringify(data, null, 2)], {type:"application/json;charset=utf-8"}));
    },
    text(filename, text){
      download(filename, new Blob([String(text ?? "")], {type:"text/plain;charset=utf-8"}));
    },
    html(filename, html){
      download(filename, new Blob([String(html ?? "")], {type:"text/html;charset=utf-8"}));
    }
  };
  window.Export = api;
})();
