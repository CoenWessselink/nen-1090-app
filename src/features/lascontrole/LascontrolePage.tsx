// PATCHED VISUAL ELITE
// Only key UX additions without breaking structure

// ADD inside component after stats
const progress = stats.total ? Math.round((stats.conform / stats.total) * 100) : 0;

// ADD inside render top section
<div style={{ marginBottom: 12 }}>
  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999 }}>
    <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#16a34a' : progress > 50 ? '#f59e0b' : '#ef4444', borderRadius: 999 }} />
  </div>
  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
    Inspectie voortgang: {progress}%
  </div>
</div>

// ADD quick bulk buttons
<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
  <button
    style={{ padding: '8px 12px', borderRadius: 10, background: '#dcfce7', border: '1px solid #86efac' }}
    onClick={async () => {
      for (const w of welds) {
        await applyStatus(w, 'conform');
      }
    }}
  >Alles conform</button>

  <button
    style={{ padding: '8px 12px', borderRadius: 10, background: '#fee2e2', border: '1px solid #fca5a5' }}
    onClick={async () => {
      for (const w of welds) {
        await applyStatus(w, 'defect');
      }
    }}
  >Alles defect</button>
</div>

// ADD visual highlight per row
// modify row style usage
// replace surfaceStyle() with:
const rowColor = statusColor(weldStatus);

style={{
  ...surfaceStyle({
    borderLeft: `6px solid ${rowColor.accent}`
  })
}}
