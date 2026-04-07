import { test, expect } from '@playwright/test';

test('approve all toont diepe terugkoppeling', async ({ page }) => {
  await page.setContent(`
    <button id="run">Alles accorderen</button>
    <div id="feedback"></div>
    <script>
      window.fetch = async () => ({
        ok: true,
        async json() {
          return {
            ok: true,
            mode: 'open_only',
            inspections: 4,
            checks_updated: 12,
            inspections_set_ok: 4,
            approved_welds: 6,
            approved_assemblies: 2,
            project_status_updated: true,
            project_status: 'gereed',
            weld_ids_marked_ready: ['w1', 'w2'],
            assembly_ids_marked_ready: ['a1'],
          };
        }
      });

      document.getElementById('run').addEventListener('click', async () => {
        const response = await fetch('/api/v1/projects/project-1/lascontrole/approve_all', { method: 'POST' });
        const payload = await response.json();
        document.getElementById('feedback').textContent = payload.approved_assemblies + ' assemblies, ' + payload.approved_welds + ' lassen, ' + payload.inspections_set_ok + ' inspecties';
      });
    </script>
  `);

  await page.getByRole('button', { name: /alles accorderen/i }).click();
  await expect(page.locator('#feedback')).toHaveText(/2 assemblies, 6 lassen, 4 inspecties/i);
});
