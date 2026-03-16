import { getProjects, getDashboardMetrics, getWelds, getCePreview, pickActiveProjectId, getTenantStatus } from './api_shape_bridge.js';
import { deriveDossierProgress, normalizeStatus } from './workflow_engine.js';

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function esc(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#039;'); }

function statusPill(status) {
  const normalized = normalizeStatus(status);
  const label = normalized === 'conform' ? 'Conform' : normalized === 'afgekeurd' ? 'Afgekeurd' : 'In controle';
  const cls = normalized === 'conform' ? 'conform' : normalized === 'afgekeurd' ? 'afgekeurd' : 'in-controle';
  return `<span class="status-pill ${cls}">${label}</span>`;
}

async function bindDashboard() {
  if (!document.body.matches('[data-title="Dashboard"]')) return;
  const cards = qsa('.stats-grid .stat-card');
  const recentList = qsa('.feature-grid .list-card')[0];
  const completenessCard = qsa('.feature-grid .list-card')[1];
  const [projects, metrics, tenant] = await Promise.all([
    getProjects().catch(() => []),
    getDashboardMetrics().catch(() => null),
    getTenantStatus().catch(() => null),
  ]);
  if (cards[0]) {
    qs('.stat-value', cards[0]).textContent = String(metrics?.active_projects ?? projects.length ?? 0);
    qs('.stat-note', cards[0]).textContent = `${metrics?.in_control_projects ?? 0} in controle · ${metrics?.approved_projects ?? 0} conform`;
  }
  if (cards[1]) {
    qs('.stat-value', cards[1]).textContent = String(metrics?.open_inspections ?? 0);
    qs('.stat-note', cards[1]).textContent = `${metrics?.audit_needed ?? 0} vereisen opvolging`;
  }
  if (cards[2]) {
    qs('.stat-value', cards[2]).textContent = String(metrics?.ce_ready ?? 0);
    qs('.stat-note', cards[2]).textContent = `${metrics?.document_blockers ?? 0} dossierblokkades`;
  }
  if (recentList) {
    const titleButton = qs('.list-head .btn', recentList);
    if (titleButton && tenant?.status) titleButton.textContent = `Tenant: ${tenant.status}`;
    const rowsHtml = (projects.slice(0, 3)).map((p) => `
      <div class="list-item">
        <div>
          <div class="list-name">${esc(p.nummer || '-')} ${esc(p.naam || '')}</div>
          <div class="list-sub">${esc(p.opdrachtgever || '-')} · ${esc(p.executieklasse || '-')} · ${esc(p.acceptatieklasse || '-')}</div>
        </div>
        ${statusPill(p.status)}
      </div>`).join('');
    qsa('.list-item', recentList).forEach((el) => el.remove());
    recentList.insertAdjacentHTML('beforeend', rowsHtml || '<div class="empty-state">Geen projecten gevonden.</div>');
  }
  if (completenessCard && metrics) {
    const sections = [
      ['WPS & WPQR', Number(metrics.wps_coverage ?? 0)],
      ['Inspecties', Number(metrics.inspection_coverage ?? 0)],
      ['Documenten', Number(metrics.document_coverage ?? 0)],
    ];
    completenessCard.innerHTML = `<div class="list-head"><h2 class="list-title">Completeness</h2></div>` + sections.map(([label, pct]) => `
      <div class="stat-label" style="margin-top:${label === 'WPS & WPQR' ? 0 : 14}px">${esc(label)}</div>
      <div class="metric-bar"><div class="metric-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`).join('');
  }
}

async function bindLascontrole() {
  if (!document.body.matches('[data-title^="Lascontrole"]')) return;
  const projects = await getProjects().catch(() => []);
  const projectId = pickActiveProjectId(projects);
  const welds = await getWelds(projectId).catch(() => []);
  const tbody = qs('.lc-table tbody');
  if (tbody) {
    tbody.innerHTML = (welds.slice(0, 8)).map((w) => `
      <tr>
        <td><div class="lc-code">${esc(w.weld_number || '-')}</div><div class="lc-meta">${esc(w.segment || '-')}</div></td>
        <td>${esc(w.project_name || '-')}</td>
        <td>${esc(w.inspection || '-')}</td>
        <td>${esc(w.material || '-')}</td>
        <td>${statusPill(w.status)}</td>
        <td>⋯</td>
      </tr>`).join('') || '<tr><td colspan="6">Geen lassen gevonden.</td></tr>';
  }
  const counts = {
    total: welds.length,
    conform: welds.filter((w) => normalizeStatus(w.status) === 'conform').length,
    open: welds.filter((w) => normalizeStatus(w.status) === 'in-controle').length,
    rejected: welds.filter((w) => normalizeStatus(w.status) === 'afgekeurd').length,
  };
  const bars = qsa('.metric strong');
  if (bars[0]) bars[0].textContent = `${counts.total ? Math.round((counts.conform / counts.total) * 100) : 0}%`;
  if (bars[1]) bars[1].textContent = `${counts.total ? Math.round((counts.rejected / counts.total) * 100) : 0}%`;
  if (bars[2]) bars[2].textContent = `${counts.total ? Math.round((counts.open / counts.total) * 100) : 0}%`;
}

async function bindCeDossier() {
  if (!document.body.matches('[data-title="CE Dossier"]')) return;
  const projects = await getProjects().catch(() => []);
  const projectId = pickActiveProjectId(projects);
  const activeProject = projects.find((p) => p.id === projectId) || projects[0] || null;
  const [preview, welds] = await Promise.all([
    getCePreview(projectId).catch(() => null),
    getWelds(projectId).catch(() => []),
  ]);
  const progress = deriveDossierProgress(preview || {}, welds);
  const title = qs('.ce-card strong');
  if (title && activeProject) title.textContent = `Project ${activeProject.nummer || '-'} · ${activeProject.naam || ''}`.trim();
  const tbody = qs('.ce-table tbody');
  if (tbody) {
    tbody.innerHTML = welds.slice(0, 8).map((w) => `
      <tr>
        <td>${esc(w.weld_number || '-')}</td>
        <td>${esc(preview?.wps_code || 'WPS-001')}</td>
        <td>${esc(preview?.welder_name || 'Nog koppelen')}</td>
        <td>${esc(w.inspection || '-')}</td>
        <td>${statusPill(w.status)}</td>
      </tr>`).join('') || '<tr><td colspan="5">Nog geen CE-gegevens beschikbaar.</td></tr>';
  }
  const checks = qsa('.ce-side-section .ce-check');
  const pcts = [100, progress.inspections, progress.materials, progress.documents];
  checks.forEach((el, idx) => {
    const strong = qs('strong', el);
    if (strong && typeof pcts[idx] !== 'undefined') strong.textContent = `${Math.max(0, Math.min(100, Math.round(Number(pcts[idx]) || 0)))}%`;
  });
  const bar = qs('.ce-progress span');
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, Math.round(Number(progress.completeness) || 0)))}%`;
  const muted = qs('.ce-side-section .ce-muted');
  if (muted && preview?.export_version) muted.textContent = `Laatste export ${preview.exported_at || '-'} · versie ${preview.export_version}`;
}

async function boot() {
  await Promise.allSettled([bindDashboard(), bindLascontrole(), bindCeDossier()]);
}

document.addEventListener('DOMContentLoaded', boot);
