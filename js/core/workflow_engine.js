export function normalizeStatus(value = '') {
  const raw = String(value || '').toLowerCase();
  if (['approved', 'conform', 'ok', 'gereed', 'ready'].includes(raw)) return 'conform';
  if (['rejected', 'afgekeurd', 'nok', 'blocked'].includes(raw)) return 'afgekeurd';
  if (['in_control', 'in control', 'in-controle', 'in_controle', 'open'].includes(raw)) return 'in-controle';
  return 'in-controle';
}

export function deriveDossierProgress(preview, welds = []) {
  const completeness = Number(preview?.completeness_percentage ?? preview?.completeness ?? 0);
  const counts = {
    welds: welds.length,
    conform: welds.filter((w) => normalizeStatus(w.status) === 'conform').length,
    afgekeurd: welds.filter((w) => normalizeStatus(w.status) === 'afgekeurd').length,
    open: welds.filter((w) => normalizeStatus(w.status) === 'in-controle').length,
  };
  const documents = Number(preview?.documents_percentage ?? preview?.documents ?? Math.max(0, completeness - 12));
  const inspections = Number(preview?.inspections_percentage ?? preview?.inspections ?? Math.max(0, completeness - 4));
  const materials = Number(preview?.materials_percentage ?? preview?.materials ?? Math.max(0, completeness - 8));
  return { completeness, documents, inspections, materials, counts };
}
