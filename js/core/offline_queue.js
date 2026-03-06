/*
  NEN1090 Offline Queue
  - Stores critical write-actions locally when offline
  - Replays them when the connection is back (and user is logged in)

  Current use:
  - Lascontrole inspections: upsertForWeld + resetToNormForWeld

  Storage: IndexedDB (fallback to localStorage)
*/
(function(){
  const DB_NAME = 'nen1090_offline';
  const DB_VER = 1;
  const STORE = 'queue';

  function isOfflineError(e){
    const msg = String((e && (e.code || e.message)) || e || '');
    return msg.includes('API_OFFLINE') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch');
  }

  function now(){ return new Date().toISOString(); }

  async function openDb(){
    if(!('indexedDB' in window)) return null;
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('ts','ts');
          os.createIndex('type','type');
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function idbAdd(item){
    const db = await openDb();
    if(!db) throw new Error('IDB_NOT_AVAILABLE');
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).add(item);
      tx.oncomplete = ()=> resolve(true);
      tx.onerror = ()=> reject(tx.error);
    });
  }

  async function idbAll(){
    const db = await openDb();
    if(!db) return [];
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function idbDelete(id){
    const db = await openDb();
    if(!db) return false;
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = ()=> resolve(true);
      tx.onerror = ()=> reject(tx.error);
    });
  }

  // localStorage fallback (very small)
  const LS_KEY = 'nen1090.offline.queue';
  function lsRead(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]') || []; }catch(_){ return []; }
  }
  function lsWrite(list){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0,200))); }catch(_){ }
  }

  async function enqueue(type, payload){
    const item = { ts: now(), type, payload };
    try{
      await idbAdd(item);
      return true;
    }catch(_){
      const list = lsRead();
      list.push(item);
      lsWrite(list);
      return true;
    }
  }

  async function all(){
    try{
      const list = await idbAll();
      if(list && list.length) return list;
    }catch(_){ }
    return lsRead();
  }

  async function removeItem(item){
    if(item && typeof item.id !== 'undefined'){
      try{ await idbDelete(item.id); return; }catch(_){ }
    }
    // fallback remove by ts+type
    const list = lsRead().filter(x=> !(x.ts===item.ts && x.type===item.type));
    lsWrite(list);
  }

  async function flush(){
    if(!navigator.onLine) return { ok:false, reason:'offline' };
    if(!window.Auth || !window.Auth.getAccessToken || !window.Auth.getAccessToken()) return { ok:false, reason:'not_logged_in' };

    const items = await all();
    let done = 0, failed = 0;

    for(const item of items){
      try{
        if(item.type === 'inspection_upsert'){
          const { weldUuid, payload } = item.payload || {};
          if(weldUuid) await window.Auth.inspections.upsertForWeld(weldUuid, payload);
        }
        if(item.type === 'inspection_reset_to_norm'){
          const { weldUuid, payload } = item.payload || {};
          if(weldUuid) await window.Auth.inspections.resetToNormForWeld(weldUuid, payload || {});
        }
        await removeItem(item);
        done++;
      }catch(e){
        // if still offline or backend unreachable, stop early
        if(isOfflineError(e)){
          failed++;
          break;
        }
        failed++;
        // keep item for retry
      }
    }

    return { ok:true, done, failed };
  }

  window.OfflineQueue = {
    enqueue,
    all,
    flush,
    isOfflineError,
  };
})();
