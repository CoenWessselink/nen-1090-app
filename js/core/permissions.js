/* Permissions — simple role gates (expand later) */
(function(){
  const roleRank = { "Admin": 3, "Inspector": 2, "Viewer": 1 };
  function canEdit(){
    const st = window.CWS.getState();
    return roleRank[st.ui.role] >= 2;
  }
  function canAdmin(){
    const st = window.CWS.getState();
    return roleRank[st.ui.role] >= 3;
  }
  window.Permissions = { canEdit, canAdmin };
})();
