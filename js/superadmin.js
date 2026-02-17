/* Superadmin (Klantbeheer) — Phase 4.0 Fase 1 */
(function(){
  window.__PUBLIC_BASE_URL = window.location.origin;
  const els = {};
  let tenants = [];
  let filtered = [];

  function $(id){ return document.getElementById(id); }
  function fmtDate(d){
    if(!d) return '';
    try{
      const dt = new Date(d);
      if(isNaN(dt.getTime())) return String(d);
      return dt.toISOString().slice(0,10);
    }catch{ return String(d); }
  }
  function boolPill(v){
    return v ? '<span class="pill" style="background:#1f7a4a33;">Ja</span>' : '<span class="pill" style="background:#a33;">Nee</span>';
  }

  function canAccess(){
    const me = window.__AUTH_ME__;
    return me && me.role === 'platform_admin';
  }

  async function load(){
    if(!window.Auth || !window.Auth.platform) throw new Error('Auth.platform ontbreekt');
    tenants = await window.Auth.platform.tenants.list();
    applyFilter();
  }

  function applyFilter(){
    const q = (els.q.value || '').trim().toLowerCase();
    filtered = tenants.filter(t=>{
      if(!q) return true;
      return (t.name||'').toLowerCase().includes(q) || (t.status||'').toLowerCase().includes(q);
    });
    render();
  }

  function render(){
    const tbody = els.rows;
    tbody.innerHTML = filtered.map(t=>`
      <tr data-id="${UI.esc(t.id)}">
        <td>${UI.esc(t.name)}</td>
        <td>${UI.esc(t.status||'')}</td>
        <td>${boolPill(!!t.is_active)}</td>
        <td>${UI.esc(fmtDate(t.trial_until))}</td>
        <td>${UI.esc(fmtDate(t.valid_until))}</td>
        <td>${UI.esc(String(t.seats_purchased ?? ''))}</td>
        <td>${UI.esc(String(t.users_count ?? ''))}</td>
        <td>${UI.esc(String(t.billing_provider ?? 'none'))}</td>
      </tr>
    `).join('');
    els.count.textContent = `${filtered.length} tenants`;
  }

  async function openTenant(id){
    const t = await window.Auth.platform.tenants.get(id);
    const users = await window.Auth.platform.tenants.users.list(id).catch(()=>[]);
    const payments = await window.Auth.platform.tenants.payments(id).catch(()=>[]);
    const audit = await window.Auth.platform.tenants.audit(id).catch(()=>[]);

    const tabBtn = (key,label,active)=>`<button class="btn ${active?'':'ghost'}" data-tab="${key}">${label}</button>`;
    const body = `
      <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        ${tabBtn('alg','Algemeen',true)}
        ${tabBtn('users','Gebruikers',false)}
        ${tabBtn('pay','Betalingen',false)}
        ${tabBtn('audit','Audit',false)}
      </div>
      <div id="saTabAlg">
        <div class="grid2">
          <div>
            <div class="smallmuted">Tenant naam</div>
            <input class="input" id="sa_name" value="${UI.esc(t.name||'')}" />
          </div>
          <div>
            <div class="smallmuted">Status</div>
            <select class="input" id="sa_status">
              ${['active','trial','suspended','cancelled'].map(s=>`<option value="${s}" ${String(t.status)===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <div class="smallmuted">Actief (is_active)</div>
            <select class="input" id="sa_active">
              <option value="true" ${t.is_active?'selected':''}>true</option>
              <option value="false" ${!t.is_active?'selected':''}>false</option>
            </select>
          </div>
          <div>
            <div class="smallmuted">Seats</div>
            <input class="input" id="sa_seats" type="number" min="1" value="${UI.esc(String(t.seats_purchased ?? 1))}" />
          </div>
          <div>
            <div class="smallmuted">Trial tot (UTC)</div>
            <input class="input" id="sa_trial" type="datetime-local" value="${t.trial_until ? new Date(t.trial_until).toISOString().slice(0,16) : ''}" />
          </div>
          <div>
            <div class="smallmuted">Geldig tot (UTC)</div>
            <input class="input" id="sa_valid" type="datetime-local" value="${t.valid_until ? new Date(t.valid_until).toISOString().slice(0,16) : ''}" />
          </div>
          <div>
            <div class="smallmuted">Billing provider</div>
            <select class="input" id="sa_billing">
              ${['none','mollie'].map(s=>`<option value="${s}" ${String(t.billing_provider)===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <div class="smallmuted">Prijs/seat/jaar (cent)</div>
            <input class="input" id="sa_price" type="number" min="0" value="${UI.esc(String(t.price_per_seat_year_cents ?? 0))}" />
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn" id="sa_save">Opslaan</button>
          <button class="btn" id="sa_trialbtn">Start trial (14d)</button>

        <div class="card" style="margin-top:12px; padding:10px;">
          <div style="font-weight:600; margin-bottom:6px;">Billing & Mollie</div>
          <div class="grid2">
            <div>
              <div class="smallmuted">Mollie customer_id</div>
              <input class="input" id="sa_mollie_customer" value="${UI.esc(t.mollie_customer_id||'')}" placeholder="cus_xxx" />
            </div>
            <div>
              <div class="smallmuted">Mollie subscription_id</div>
              <input class="input" id="sa_mollie_sub" value="${UI.esc(t.mollie_subscription_id||'')}" placeholder="sub_xxx" />
            </div>
            <div>
              <div class="smallmuted">Webhook token</div>
              <input class="input" id="sa_webhook_token" value="${UI.esc(t.webhook_token||'')}" readonly />
            </div>
            <div>
              <div class="smallmuted">Interval</div>
              <input class="input" id="sa_mollie_interval" value="12 months" />
            </div>
            <div>
              <div class="smallmuted">Customer naam</div>
              <input class="input" id="sa_mollie_name" value="${UI.esc(t.name||'')}" />
            </div>
            <div>
              <div class="smallmuted">Customer e-mail</div>
              <input class="input" id="sa_mollie_email" value="" placeholder="billing@bedrijf.nl" />
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
            <button class="btn" id="sa_force">Force logout (tenant)</button>
            <button class="btn" id="sa_activate_year">Activeer 1 jaar</button>
            <button class="btn danger" id="sa_cancel">Annuleer (cancel)</button>
            <button class="btn" id="sa_preview_seats">Preview seats</button>
            <button class="btn" id="sa_apply_seats">Toepassen seats</button>
            <span style="flex:1"></span>
            <button class="btn" id="sa_mollie_create_customer">Mollie: customer aanmaken</button>
            <button class="btn" id="sa_mollie_start_sub">Mollie: start abonnement</button>
            <button class="btn" id="sa_mollie_update_seats">Mollie: update seats</button>
            <button class="btn danger" id="sa_mollie_cancel_sub">Mollie: stop abonnement</button>
            <button class="btn" id="sa_mollie_sync">Mollie: sync payments</button>
            <button class="btn" id="sa_mollie_sync_sub">Mollie: sync subscription</button>
          </div>
          <div class="smallmuted" style="margin-top:10px;">
            <b>Subscription status:</b> <span id="sa_sub_status">${UI.esc(t.mollie_subscription_status||"-")}</span>
            &nbsp; | &nbsp; <b>Next payment:</b> <span id="sa_next_pay">${UI.esc(fmtDate(t.mollie_next_payment_date)||"-")}</span>
            &nbsp; | &nbsp; <b>Pending seats:</b> <span id="sa_pending_seats">${UI.esc(String(t.pending_seats ?? '-'))}</span>
            &nbsp; | &nbsp; <b>Effective:</b> <span id="sa_pending_eff">${UI.esc(fmtDate(t.pending_seats_effective_at)||'-')}</span>
          </div>
          <div class="smallmuted" style="margin-top:6px;">
            Webhook URL (voor Mollie): <span style="user-select:all;">${UI.esc((window.__PUBLIC_BASE_URL||'') + '/api/v1/billing/mollie/webhook?tenant_id=' + t.id + '&token=' + (t.webhook_token||''))}</span>
          </div>
        </div>
        </div>
        <div class="smallmuted" style="margin-top:6px;">Tenant ID: ${UI.esc(t.id)}</div>
      </div>

      <div id="saTabUsers" style="display:none;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px;">
          <div>
            <div class="smallmuted">Email</div>
            <input class="input" id="su_email" placeholder="user@bedrijf.nl" />
          </div>
          <div>
            <div class="smallmuted">Password</div>
            <input class="input" id="su_pw" placeholder="Temp password" />
          </div>
          <div>
            <div class="smallmuted">Role</div>
            <select class="input" id="su_role">
              ${['viewer','auditor','qc','tenant_admin'].map(r=>`<option value="${r}">${r}</option>`).join('')}
            </select>
          </div>
          <button class="btn" id="su_add">Toevoegen</button>
          <span class="pill">Seat limit: ${UI.esc(String(t.seats_purchased ?? 1))}</span>
        </div>

        <div class="table-wrap" style="max-height:320px;">
          <table>
            <thead><tr><th>Email</th><th>Actief</th><th>Role</th><th>Actie</th></tr></thead>
            <tbody id="su_rows">
              ${users.map(u=>`
                <tr data-uid="${UI.esc(u.user_id)}">
                  <td>${UI.esc(u.email)}</td>
                  <td>${boolPill(!!u.is_active)}</td>
                  <td>${UI.esc(u.role)}</td>
                  <td>
                    <button class="btn ghost su_toggle">${u.is_active?'Deactiveer':'Activeer'}</button>
                    <button class="btn ghost su_role">Role…</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="saTabPay" style="display:none;">
<div class="smallmuted" style="margin-bottom:8px;">(Fase 4) Handmatig payments toevoegen of Mollie payments syncen via Billing-tab (Algemeen).</div>
<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px;">
  <div>
    <div class="smallmuted">Bedrag (EUR)</div>
    <input class="input" id="sp_amount" type="number" step="0.01" value="0.00" />
  </div>
  <div>
    <div class="smallmuted">Status</div>
    <select class="input" id="sp_status">
      ${['paid','created','failed','refunded','cancelled'].map(s=>`<option value="${s}">${s}</option>`).join('')}
    </select>
  </div>
  <div>
    <div class="smallmuted">Type</div>
    <select class="input" id="sp_type">
      ${['subscription','upgrade','manual'].map(s=>`<option value="${s}">${s}</option>`).join('')}
    </select>
  </div>
  <button class="btn" id="sp_add">Payment toevoegen</button>
</div>

        <div class="table-wrap" style="max-height:320px;">
          <table>
            <thead><tr><th>Datum</th><th>Provider</th><th>Type</th><th>Bedrag</th><th>Status</th><th>ID</th></tr></thead>
            <tbody>
              ${payments.map(p=>`
                <tr>
                  <td>${UI.esc(fmtDate(p.created_at))}</td>
                  <td>${UI.esc(p.provider)}</td>
                  <td>${UI.esc(p.type)}</td>
                  <td>${UI.esc((p.amount_cents/100).toFixed(2))} ${UI.esc(p.currency||'EUR')}</td>
                  <td>${UI.esc(p.status)}</td>
                  <td class="smallmuted">${UI.esc(p.provider_payment_id||p.id)}</td>
                </tr>
              `).join('') || `<tr><td colspan="6" class="smallmuted">Geen payments gevonden</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div id="saTabAudit" style="display:none;">
        <div class="table-wrap" style="max-height:320px;">
          <table>
            <thead><tr><th>Datum</th><th>Action</th><th>User</th><th>Meta</th></tr></thead>
            <tbody>
              ${audit.map(a=>`
                <tr>
                  <td>${UI.esc(fmtDate(a.created_at))}</td>
                  <td>${UI.esc(a.action)}</td>
                  <td class="smallmuted">${UI.esc(a.user_id||'')}</td>
                  <td class="smallmuted">${UI.esc(String(a.meta||''))}</td>
                </tr>
              `).join('') || `<tr><td colspan="4" class="smallmuted">Geen audit events gevonden</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const modal = UI.openModal({
      title: `Tenant 360° — ${t.name}`,
      bodyHtml: body,
      saveLabel: 'Sluiten',
      onSave: async ({close}) => close(),
    });

    function showTab(key){
      document.getElementById('saTabAlg').style.display = key==='alg' ? '' : 'none';
      document.getElementById('saTabUsers').style.display = key==='users' ? '' : 'none';
      document.getElementById('saTabPay').style.display = key==='pay' ? '' : 'none';
      document.getElementById('saTabAudit').style.display = key==='audit' ? '' : 'none';
      document.querySelectorAll('[data-tab]').forEach(b=>{
        const k = b.getAttribute('data-tab');
        b.classList.toggle('ghost', k!==key);
      });
    }

    document.querySelectorAll('[data-tab]').forEach(b=>{
      b.addEventListener('click', ()=> showTab(b.getAttribute('data-tab')));
    });

    document.getElementById('sa_save').addEventListener('click', async ()=>{
      const payload = {
        name: document.getElementById('sa_name').value.trim(),
        status: document.getElementById('sa_status').value,
        is_active: document.getElementById('sa_active').value === 'true',
        seats_purchased: parseInt(document.getElementById('sa_seats').value || '1', 10),
        billing_provider: document.getElementById('sa_billing').value,
        price_per_seat_year_cents: parseInt(document.getElementById('sa_price').value || '0', 10),
      };
      const trial = document.getElementById('sa_trial').value;
      const valid = document.getElementById('sa_valid').value;
      payload.trial_until = trial ? new Date(trial).toISOString() : null;
      payload.valid_until = valid ? new Date(valid).toISOString() : null;

      await window.Auth.platform.tenants.patch(id, payload);
      UI.toast('Tenant opgeslagen');
      await load();
    });

    document.getElementById('sa_trialbtn').addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.startTrial(id);
      UI.toast('Trial gestart');
      await load();
    });



    // Billing / actions
    document.getElementById('sa_force')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.forceLogout(id);
      UI.toast('Force logout uitgevoerd');
    });

    document.getElementById('sa_activate_year')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.billing.activateYear(id);
      UI.toast('Tenant geactiveerd (1 jaar)');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_cancel')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.billing.cancel(id);
      UI.toast('Tenant geannuleerd');
      modal.close(); await openTenant(id);
    });


    document.getElementById('sa_preview_seats')?.addEventListener('click', async ()=>{
      const seats_target = parseInt(document.getElementById('sa_seats').value||'1',10)||1;
      try{
        const prev = await window.Auth.platform.tenants.billing.preview(id, { seats_target });
        const eff = prev.effective_at ? fmtDate(prev.effective_at) : '-';
        const amt = (prev.amount_cents!=null) ? ((prev.amount_cents/100).toFixed(2)+' EUR') : '-';
        UI.toast(`Preview: ${prev.action} → seats ${prev.current_seats}→${prev.target_seats} (eff: ${eff}) bedrag: ${amt}`);
      }catch(err){
        console.error(err);
        UI.toast('Preview mislukt: ' + (err && err.message ? err.message : ''));
      }
    });

    document.getElementById('sa_apply_seats')?.addEventListener('click', async ()=>{
      const seats_target = parseInt(document.getElementById('sa_seats').value||'1',10)||1;
      const current = parseInt(String(t.seats_purchased||1),10)||1;
      try{
        if(seats_target === current){
          return UI.toast('Geen wijziging');
        }
        if(seats_target > current){
          await window.Auth.platform.tenants.billing.upgrade(id, { seats_target });
          UI.toast('Upgrade toegepast');
        } else {
          await window.Auth.platform.tenants.billing.downgrade(id, { seats_target });
          UI.toast('Downgrade ingepland');
        }
        modal.close();
        await openTenant(id);
      }catch(err){
        console.error(err);
        UI.toast('Toepassen mislukt: ' + (err && err.message ? err.message : ''));
      }
    });

    document.getElementById('sa_mollie_create_customer')?.addEventListener('click', async ()=>{
      const name = document.getElementById('sa_mollie_name').value.trim() || (t.name||'');
      const email = document.getElementById('sa_mollie_email').value.trim();
      if(!email) return UI.toast('Customer e-mail verplicht');
      await window.Auth.platform.tenants.mollie.createCustomer(id, { name, email });
      UI.toast('Mollie customer aangemaakt');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_mollie_start_sub')?.addEventListener('click', async ()=>{
      const interval = document.getElementById('sa_mollie_interval').value.trim() || '12 months';
      await window.Auth.platform.tenants.mollie.startSubscription(id, { interval, currency:'EUR', description:'NEN1090 abonnement' });
      UI.toast('Mollie abonnement gestart');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_mollie_update_seats')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.mollie.mollieUpdateSeats(id);
      UI.toast('Mollie seats bijgewerkt');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_mollie_cancel_sub')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.mollie.cancelSubscription(id);
      UI.toast('Mollie abonnement gestopt');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_mollie_sync')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.mollie.syncPayments(id);
      UI.toast('Payments gesynchroniseerd');
      modal.close(); await openTenant(id);
    });

    document.getElementById('sa_mollie_sync_sub')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.mollie.mollieSyncSubscriptionStatus(id);
      UI.toast('Subscription status gesynchroniseerd');
      modal.close(); await openTenant(id);
    });

// Payments tab: manual add
const spAdd = document.getElementById('sp_add');
if(spAdd){
  spAdd.addEventListener('click', async ()=>{
    const eur = parseFloat(document.getElementById('sp_amount').value || '0');
    const amount_cents = Math.round(eur * 100);
    const status = document.getElementById('sp_status').value;
    const type = document.getElementById('sp_type').value;
    await window.Auth.platform.tenants.paymentsManual(id, { amount_cents, status, type, currency: 'EUR' });
    UI.toast('Payment toegevoegd');
    modal.close();
    await openTenant(id);
  });
}
    // Users tab actions
    const suRows = document.getElementById('su_rows');
    if(suRows){
      suRows.addEventListener('click', async (e)=>{
        const tr = e.target.closest('tr[data-uid]');
        if(!tr) return;
        const uid = tr.getAttribute('data-uid');
        if(e.target.classList.contains('su_toggle')){
          const isActiveNow = tr.querySelector('td:nth-child(2) .pill')?.textContent === 'Ja';
          await window.Auth.platform.tenants.users.patch(id, uid, { is_active: !isActiveNow });
          UI.toast('User bijgewerkt');
          await openTenant(id); // re-open modal fresh
          modal.close();
        }
        if(e.target.classList.contains('su_role')){
          const current = tr.querySelector('td:nth-child(3)')?.textContent || 'viewer';
          UI.modalForm({
            title: 'Wijzig role',
            fields: [{ key:'role', label:'Role', type:'select', options:['viewer','auditor','qc','tenant_admin','platform_admin'], default: current }],
            values: { role: current },
            onSubmit: async (vals)=>{
              await window.Auth.platform.tenants.users.patch(id, uid, { role: vals.role });
              UI.toast('Role bijgewerkt');
              return true;
            }
          });
        }
      });
    }

    document.getElementById('su_add')?.addEventListener('click', async ()=>{
      const email = document.getElementById('su_email').value.trim();
      const pw = document.getElementById('su_pw').value;
      const role = document.getElementById('su_role').value;
      if(!email || !pw) return UI.toast('Email + password verplicht');
      try{
        await window.Auth.platform.tenants.users.create(id, { email, password: pw, role, is_active: true });
        UI.toast('User toegevoegd');
        modal.close();
        await load();
      }catch(err){
        console.error(err);
        UI.toast('Toevoegen mislukt: ' + (err && err.message ? err.message : ''));
      }
    });
  }

  async function openNewTenant(){
    const body = `
      <div class="grid2">
        <div>
          <div class="smallmuted">Tenant naam</div>
          <input class="input" id="nt_name" placeholder="Bijv. Tasche Staalbouw" />
        </div>
        <div>
          <div class="smallmuted">Status</div>
          <select class="input" id="nt_status">
            ${['trial','active','suspended','cancelled'].map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <div class="smallmuted">Trial dagen</div>
          <input class="input" id="nt_trial_days" type="number" min="1" value="14" />
        </div>
        <div>
          <div class="smallmuted">Seats</div>
          <input class="input" id="nt_seats" type="number" min="1" value="1" />
        </div>
      </div>
      <div style="margin-top:12px;">
        <div class="kbd">Optioneel: maak direct de eerste tenant-admin gebruiker aan</div>
        <div class="grid2" style="margin-top:8px;">
          <div>
            <div class="smallmuted">Admin email</div>
            <input class="input" id="nt_admin_email" placeholder="admin@bedrijf.nl" />
          </div>
          <div>
            <div class="smallmuted">Admin password</div>
            <input class="input" id="nt_admin_pw" placeholder="Temp password" />
          </div>
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Nieuwe tenant',
      bodyHtml: body,
      saveLabel: 'Aanmaken',
      onSave: async ({close}) => {
        const name = document.getElementById('nt_name').value.trim();
        const status = document.getElementById('nt_status').value;
        const trial_days = parseInt(document.getElementById('nt_trial_days').value || '14', 10);
        const seats_purchased = parseInt(document.getElementById('nt_seats').value || '1', 10);
        const email = document.getElementById('nt_admin_email').value.trim();
        const pw = document.getElementById('nt_admin_pw').value;

        if(!name) { UI.toast('Tenant naam verplicht'); return false; }

        const payload = {
          name,
          status,
          trial_days: status === 'trial' ? (trial_days || 14) : null,
          seats_purchased: seats_purchased || 1,
          is_active: true,
        };
        if(email && pw){
          payload.create_admin = { email, password: pw, role: 'tenant_admin', is_active: true };
        }
        await window.Auth.platform.tenants.create(payload);
        UI.toast('Tenant aangemaakt');
        close();
        await load();
        return true;
      }
    });
  }

  function bind(){
    els.q.addEventListener('input', applyFilter);
    els.btnRefresh.addEventListener('click', async ()=>{
      await load().catch(e=>{ console.error(e); UI.toast('Load error'); });
    });

    els.btnNewTenant?.addEventListener('click', ()=>{
      openNewTenant().catch(err=>{ console.error(err); UI.toast('Nieuwe tenant error'); });
    });

    els.btnExportCsv?.addEventListener('click', async ()=>{
      try{
        const csv = await window.Auth.platform.tenants.exportCsv();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tenants.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }catch(err){ console.error(err); UI.toast('Export error'); }
    });

    els.rows.addEventListener('dblclick', (e)=>{
      const tr = e.target.closest('tr[data-id]');
      if(!tr) return;
      const id = tr.getAttribute('data-id');
      openTenant(id).catch(err=>{ console.error(err); UI.toast('Open tenant error'); });
    });
  }

  async function boot(){
    els.q = $('q');
    els.rows = $('rows');
    els.count = $('count');
    els.btnRefresh = $('btnRefresh');
    els.btnNewTenant = $('btnNewTenant');
    els.btnExportCsv = $('btnExportCsv');

    // basic auth gate
    await window.Auth.me().catch(()=>null); // populates __AUTH_ME__ via Shell
    if(!canAccess()){
      $('rows').innerHTML = `<tr><td colspan="8" class="smallmuted">Geen toegang. Log in met tenant <b>platform</b> en role <b>platform_admin</b>.</td></tr>`;
      $('count').textContent = '0 tenants';
      return;
    }

    await load();
    bind();
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
