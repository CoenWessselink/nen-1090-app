/* Export stub (extend later: PDF/ZIP export per prompt) */
(function(){
  window.Export = {
    csv(filename, rows){
      try{
        const content = rows.map(r=>r.map(v=>{
          const s = String(v ?? "");
          return '"' + s.replace(/"/g,'""') + '"';
        }).join(",")).join("\n");
        const blob = new Blob([content], {type:"text/csv;charset=utf-8"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }catch(e){
        console.error(e);
      }
    }
  };
})();
