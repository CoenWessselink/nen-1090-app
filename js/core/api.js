window.CWSApi = (function(){
  const API_BASE = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1';
  async function request(path, options){
    const response = await fetch(`${API_BASE}${path}`, options || {});
    if(!response.ok) throw new Error(`API ${response.status}`);
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.text();
  }
  return { API_BASE, request };
})();
