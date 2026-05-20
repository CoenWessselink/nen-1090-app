import type { ReactElement } from 'react';

type R = Record<string, unknown>;

function val(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function resultLabel(value?: unknown) {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
  if (['conform', 'compliant', 'ok', 'approved', 'goedgekeurd', 'true'].includes(raw)) return 'Compliant';
  if (['not-conform', 'non-conform', 'non-compliant', 'rejected', 'afgekeurd', 'defect', 'failed', 'false'].includes(raw)) return 'Non-compliant';
  if (['not-applicable', 'n-a', 'na'].includes(raw)) return 'N/A';
  if (['missing', 'not-provided'].includes(raw)) return 'Missing';
  return 'In control';
}

function resultClass(value?: unknown) {
  const label = resultLabel(value);
  if (label === 'Compliant') return 'rpt-status-green';
  if (label === 'Non-compliant') return 'rpt-status-red';
  if (label === 'Missing') return 'rpt-status-red';
  if (label === 'N/A') return 'rpt-status-muted';
  return 'rpt-status-blue';
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

function normalizeControlsFromInspection(inspection: R): R[] {
  const rows: R[] = [];
  const sections = asArray(inspection.sections);
  sections.forEach((section) => {
    const group = sectionName(section);
    asArray(section.items || section.checks || section.results).forEach((item, index) => {
      rows.push({ ...item, group, _source: 'section', _sort: rows.length, _item_index: index });
    });
  });

  asArray(inspection.results).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _source: 'results', _sort: rows.length, _item_index: index }));
  asArray(inspection.checks).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _source: 'checks', _sort: rows.length, _item_index: index }));
  asArray(inspection.items).forEach((item, index) => rows.push({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _source: 'items', _sort: rows.length, _item_index: index }));

  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const key = `${itemCode(row, index)}|${controlPoint(row, index)}|${first(row, ['group'], '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function controlsForWeld(weld: R, inspections: R[]): R[] {
  const matched = inspections.filter((inspection) => matchesWeld(inspection, weld));
  const controls = matched.flatMap(normalizeControlsFromInspection);
  if (controls.length) return controls;

  const embedded = asArray(weld.inspection_checks || weld.checks || weld.results || weld.inspection_results || weld.items);
  if (embedded.length) return embedded.map((item, index) => ({ ...item, group: first(item, ['group', 'section_name', 'section_code'], 'Inspection'), _sort: index, _item_index: index }));

  return [];
}

export function inspectionForWeld(weld: R, inspections: R[]): R | null {
  return inspections.find((inspection) => matchesWeld(inspection, weld)) || null;
}

export function controlsCountForWeld(weld: R, inspections: R[]) {
  return controlsForWeld(weld, inspections).length;
}

export function renderedControlsCompleteness(welds: R[], inspections: R[]) {
  const total = welds.length;
  const withControls = welds.filter((weld) => controlsForWeld(weld, inspections).length > 0).length;
  const rows = welds.reduce((sum, weld) => sum + controlsForWeld(weld, inspections).length, 0);
  return { total, withControls, missing: Math.max(total - withControls, 0), rows };
}

export function renderControlStatus(value: unknown): ReactElement {
  return <span className={resultClass(value)}>{resultLabel(value)}</span>;
}

export function RenderWeldControlsTable({ weld, inspections }: { weld: R; inspections: R[] }) {
  const controls = controlsForWeld(weld, inspections);
  if (!controls.length) {
    return (
      <table className="rpt-table rpt-table-compact rpt-control-table">
        <thead><tr><th>Completeness issue</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody><tr><td>Executed inspection controls</td><td className="rpt-status-red">Missing</td><td>No stored check-level control points found for this weld. Summary remains included, but this weld is incomplete.</td></tr></tbody>
      </table>
    );
  }

  return (
    <table className="rpt-table rpt-table-compact rpt-control-table rpt-control-table-simplified">
      <thead>
        <tr>
          <th>#</th>
          <th>Groep / sectie</th>
          <th>Controlepunt</th>
          <th>Status</th>
          <th>Opmerking</th>
        </tr>
      </thead>
      <tbody>
        {controls.map((control, index) => (
          <tr key={`${itemCode(control, index)}-${index}`}>
            <td>{index + 1}</td>
            <td>{val(control.group || control.section_name || control.section_code || 'Inspection')}</td>
            <td>{controlPoint(control, index)}</td>
            <td>{renderControlStatus(statusValue(control))}</td>
            <td>{itemComment(control)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RenderInspectionCompletenessRow({ welds, inspections }: { welds: R[]; inspections: R[] }) {
  const completeness = renderedControlsCompleteness(welds, inspections);
  const status = completeness.total > 0 && completeness.missing === 0 ? 'Compliant' : completeness.withControls > 0 ? 'In control' : 'Missing';
  return (
    <tr>
      <td>Performed inspection controls per weld</td>
      <td className={status === 'Compliant' ? 'rpt-status-green' : status === 'Missing' ? 'rpt-status-red' : 'rpt-status-blue'}>{status}</td>
      <td>{completeness.withControls}/{completeness.total} welds have check-level control rows; {completeness.rows} total control rows rendered; {completeness.missing} weld(s) incomplete.</td>
    </tr>
  );
}

export function RenderControlsAuditRows({ welds, inspections }: { welds: R[]; inspections: R[] }) {
  const completeness = renderedControlsCompleteness(welds, inspections);
  return (
    <>
      <tr><td>Performed control rows</td><td>{completeness.rows}</td></tr>
      <tr><td>Welds with control rows</td><td>{completeness.withControls}/{completeness.total}</td></tr>
      <tr><td>Welds missing control rows</td><td>{completeness.missing}</td></tr>
    </>
  );
}

export function controlRowsLabel(weld: R, inspections: R[]) {
  const count = controlsCountForWeld(weld, inspections);
  return count ? String(count) : 'Missing';
}
