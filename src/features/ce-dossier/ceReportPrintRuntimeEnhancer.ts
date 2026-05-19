import { fetchCeAggregate } from '@/api/ceAggregateApi';

type R = Record<string, unknown>;

declare global {
  interface Window {
    __weldinspectCeReportEnhancerInstalled?: boolean;
    __weldinspectCeReportEnhancerProjectId?: string;
  }
}

function val(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function asArray(value: unknown): R[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object') as R[];
  return [];
}

function first(source: R, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') return String(value);
  }
  return fallback;
}

function normalizeStatus(value: unknown) {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
  if (['conform', 'compliant', 'ok', 'approved', 'goedgekeurd', 'true'].includes(raw)) return 'Compliant';
  if (['not-conform', 'non-conform', 'non-compliant', 'rejected', 'afgekeurd', 'defect', 'failed', 'false'].includes(raw)) return 'Non-compliant';
  if (['not-applicable', 'n-a', 'na'].includes(raw)) return 'N/A';
  if (['missing', 'not-provided'].includes(raw)) return 'Missing';
  return 'In control';
}

function statusClass(value: unknown) {
  const label = normalizeStatus(value);
  if (label === 'Compliant') return 'rpt-status-green';
  if (label === 'Non-compliant' || label === 'Missing') return 'rpt-status-red';
  if (label === 'N/A') return 'rpt-status-muted';
  return 'rpt-status-blue';
}

function weldNo(weld: R) {
  return first(weld, ['weld_number', 'weld_no', 'number', 'code', 'id'], '—');
}

function sameId(a: unknown, b: unknown) {
  return String(a || '').trim() !== '' && String(a || '') === String(b || '');
}

function matchesWeld(inspection: R, weld: R) {
  const no = weldNo(weld);
  return sameId(inspection.weld_id, weld.id)
    || sameId(inspection.weldId, weld.id)
    || sameId(inspection.weld_no, no)
    || sameId(inspection.weld_number, no)
    || sameId(inspection.weld, no)
    || sameId(inspection.code, no);
}

function sectionName(section: R, fallback = 'Inspection') {
  return first(section, ['name', 'title', 'label', 'group', 'group_key', 'section_code', 'code'], fallback);
}

function controlPoint(item: R, index: number) {
  return first(item, ['label', 'title', 'criterion_key', 'name', 'description', 'code', 'item_code', 'template_item_code'], `Controlepunt ${index + 1}`);
}

function itemCode(item: R, index: number) {
  return first(item, ['item_code', 'template_item_code', 'code', 'criterion_key'], `ITEM_${index + 1}`);
}

function statusValue(item: R) {
  return item.result || item.status || item.overall_status || item.default_status || item.value || item.approved;
}

function itemComment(item: R) {
  return first(item, ['comment', 'remark', 'remarks', 'note', 'notes', 'inspection_remarks'], '—');
}

function controlsFromInspection(inspection: R): R[] {
  const rows: R[] = [];
  asArray(inspection.sections).forEach((section) => {
    const group = sectionName(section);
    asArray(section.items || section.checks || section.results).forEach((item, index) => rows.push({ ...item, group, _index: index }));
  });
  asArray(inspection.results).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _index: index }));
  asArray(inspection.checks).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _index: index }));
  asArray(inspection.items).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _index: index }));
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const key = `${itemCode(row, index)}|${controlPoint(row, index)}|${first(row, ['group'], '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function controlsForWeld(weld: R, inspections: R[]) {
  const matched = inspections.filter((inspection) => matchesWeld(inspection, weld));
  const fromInspections = matched.flatMap(controlsFromInspection);
  if (fromInspections.length) return fromInspections;
  return asArray(weld.inspection_checks || weld.checks || weld.results || weld.inspection_results || weld.items);
}

function tableCell(text: string, className?: string) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function buildControlsTable(weld: R, inspections: R[]) {
  const table = document.createElement('table');
  table.className = 'rpt-table rpt-table-compact rpt-control-table';
  const thead = document.createElement('thead');
  const head = document.createElement('tr');
  ['#', 'Groep / sectie', 'Controlepunt', 'Item code', 'Status', 'Waarde', 'Opmerking'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  });
  thead.appendChild(head);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const controls = controlsForWeld(weld, inspections);
  if (!controls.length) {
    const tr = document.createElement('tr');
    tr.appendChild(tableCell('1'));
    tr.appendChild(tableCell('Inspection completeness'));
    tr.appendChild(tableCell('Executed inspection controls'));
    tr.appendChild(tableCell('—'));
    tr.appendChild(tableCell('Missing', 'rpt-status-red'));
    tr.appendChild(tableCell('—'));
    tr.appendChild(tableCell('No stored check-level control points found for this weld.'));
    tbody.appendChild(tr);
  } else {
    controls.forEach((control, index) => {
      const status = normalizeStatus(statusValue(control));
      const tr = document.createElement('tr');
      tr.appendChild(tableCell(String(index + 1)));
      tr.appendChild(tableCell(val(control.group || control.section_name || control.section_code || 'Inspection')));
      tr.appendChild(tableCell(controlPoint(control, index)));
      tr.appendChild(tableCell(itemCode(control, index)));
      tr.appendChild(tableCell(status, statusClass(status)));
      tr.appendChild(tableCell(val(control.measured_value || control.value || control.input_value || '')));
      tr.appendChild(tableCell(itemComment(control)));
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  return table;
}

function addChecklistRow(welds: R[], inspections: R[]) {
  const checklist = document.querySelector('#dossier-checklist tbody');
  if (!checklist || checklist.querySelector('[data-ce-controls-row="1"]')) return;
  const total = welds.length;
  const withControls = welds.filter((weld) => controlsForWeld(weld, inspections).length > 0).length;
  const rows = welds.reduce((sum, weld) => sum + controlsForWeld(weld, inspections).length, 0);
  const missing = Math.max(total - withControls, 0);
  const status = total > 0 && missing === 0 ? 'Compliant' : withControls > 0 ? 'In control' : 'Missing';
  const tr = document.createElement('tr');
  tr.dataset.ceControlsRow = '1';
  tr.appendChild(tableCell('Performed inspection controls per weld'));
  tr.appendChild(tableCell(status, status === 'Compliant' ? 'rpt-status-green' : status === 'Missing' ? 'rpt-status-red' : 'rpt-status-blue'));
  tr.appendChild(tableCell(`${withControls}/${total} welds have check-level control rows; ${rows} total control rows rendered; ${missing} weld(s) incomplete.`));
  checklist.appendChild(tr);
}

function addWeldRegisterChecks(welds: R[], inspections: R[]) {
  const table = document.querySelector('#weld-register table');
  const head = table?.querySelector('thead tr');
  const bodyRows = Array.from(table?.querySelectorAll('tbody tr') || []);
  if (!table || !head || head.querySelector('[data-ce-checks-col="1"]')) return;
  const th = document.createElement('th');
  th.dataset.ceChecksCol = '1';
  th.textContent = 'Checks';
  head.insertBefore(th, head.lastElementChild);
  bodyRows.forEach((row, index) => {
    const td = document.createElement('td');
    const count = controlsForWeld(welds[index] || {}, inspections).length;
    td.textContent = count ? String(count) : 'Missing';
    td.className = count ? 'rpt-status-green' : 'rpt-status-red';
    row.insertBefore(td, row.lastElementChild);
  });
}

function addDetailedControlTables(welds: R[], inspections: R[]) {
  const section = document.querySelector('#weld-inspections .rpt-body');
  if (!section || section.querySelector('[data-ce-controls-enhanced="1"]')) return;
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.rpt-inspection-card'));
  cards.forEach((card, index) => {
    const title = document.createElement('h3');
    title.textContent = 'Executed inspection controls';
    title.dataset.ceControlsEnhanced = index === 0 ? '1' : '0';
    card.appendChild(title);
    card.appendChild(buildControlsTable(welds[index] || {}, inspections));
  });
}

function addAuditRows(welds: R[], inspections: R[]) {
  const audit = document.querySelector('#audit-trail table.rpt-meta-table tbody');
  if (!audit || audit.querySelector('[data-ce-controls-audit="1"]')) return;
  const total = welds.length;
  const withControls = welds.filter((weld) => controlsForWeld(weld, inspections).length > 0).length;
  const rows = welds.reduce((sum, weld) => sum + controlsForWeld(weld, inspections).length, 0);
  const entries: Array<[string, string]> = [
    ['Performed control rows', String(rows)],
    ['Welds with control rows', `${withControls}/${total}`],
    ['Welds missing control rows', String(Math.max(total - withControls, 0))],
  ];
  entries.forEach(([label, value], index) => {
    const tr = document.createElement('tr');
    if (index === 0) tr.dataset.ceControlsAudit = '1';
    tr.appendChild(tableCell(label));
    tr.appendChild(tableCell(value));
    audit.appendChild(tr);
  });
}

async function enhanceCurrentReport() {
  const match = window.location.pathname.match(/\/projecten\/([^/]+)\/ce-report/);
  if (!match) return;
  const projectId = match[1];
  if (!document.querySelector('.rpt-page-wrap')) return;
  if (window.__weldinspectCeReportEnhancerProjectId === projectId && document.querySelector('[data-ce-controls-enhanced="1"]')) return;
  window.__weldinspectCeReportEnhancerProjectId = projectId;
  try {
    const aggregate = await fetchCeAggregate(projectId);
    const welds = asArray(aggregate.welds);
    const inspections = asArray(aggregate.inspections);
    addChecklistRow(welds, inspections);
    addWeldRegisterChecks(welds, inspections);
    addDetailedControlTables(welds, inspections);
    addAuditRows(welds, inspections);
    document.documentElement.setAttribute('data-ce-report-ready', '1');
  } catch {
    // Keep the original report renderable if the enhancement endpoint is unavailable.
  }
}

export function installCeReportRuntimeEnhancer() {
  if (typeof window === 'undefined' || window.__weldinspectCeReportEnhancerInstalled) return;
  window.__weldinspectCeReportEnhancerInstalled = true;
  const run = () => { void enhanceCurrentReport(); };
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
  run();
}

installCeReportRuntimeEnhancer();
