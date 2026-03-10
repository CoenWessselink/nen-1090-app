(function(){
  const state = {
    tenants: [],
    filtered: [],
    detail: null,
    users: [],
    payments: [],
    audit: []
  };

  const els = {};

  function $(id){ return document.getElementById(id); }
  function esc(v){ return window.UI && UI.esc ? UI.esc(v) : String(v ?? ''); }
  function toast(msg){ if(window.UI && UI.toast) UI.toast(msg); else alert(msg); }

  function fmtDate(v){
    if(!v) return '';
    try{
      const d = new Date(v);
      if(Number.isNaN(d.getTime())) return String(v);
      return d.toISOString().slice(0,10);
    }catch(_){ return String(v); }
  }

  function fmtDateTime(v){
    if(!v) return '';
    try{
      const d = new Date(v);
      if(Number.isNaN(d.getTime())) return String(v);
      return d.toISOString().slice(0,16).replace('T',' ');
    }catch(_){ return String(v); }
  }

  function moneyCents(v){
    const cents = Number(v || 0);
    return `€ ${(cents/100).toFixed(2)}`;
  }

  function boolPill(v){
    return v
      ? '<span class="pill" style="background:#dcfce7;color:#166534;">Ja</span>'
      : '<span class="pill" style="background:#fee2e2;color:#991b1b;">Nee</span>';
  }

  function statusBadge(status){
    const s = String(status || '').toLowerCase();
    const map = {
      active: ['#dcfce7','#166534','Active'],
      trial: ['#dbeafe','#1d4ed8','Trial'],
      suspended: ['#fee2e2','#991b1b','Suspended'],
      cancelled: ['#f3f4f6','#374151','Cancelled']
    };
    const item = map[s] || ['#e2e8f0','#334155', status || '-'];
    return `<span class="pill" style="background:${item[0]};color:${item[1]};">${esc(item[2])}</span>`;
  }

  function currentRole(){
    if(window.__AUTH_ME__ && window.__AUTH_ME__.role) return window.__AUTH_ME__.role;
    try{
      if(window.Auth && window.Auth.getAccessToken){
        const tok = window.Auth.getAccessToken();
        if(tok){
          const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
          return payload.role || '';
        }
      }
    }catch(_){ }
    return '';
  }

  function requirePlatformAdmin(){
    const ok = currentRole() === 'platform_admin';
    const denied = $('accessDenied');
    const content = $('superadminContent');
    if(denied) denied.style.display = ok ? 'none' : 'block';
    if(content) content.style.display = ok ? 'block' : 'none';
    return ok;
  }

  async function loadTenants(){
    if(!window.Auth || !window.Auth.platform) throw new Error('Auth.platform ontbreekt.');
    const list = await window.Auth.platform.tenants.list();
    state.tenants = Array.isArray(list) ? list : [];
    applyFilter();
  }

  function applyFilter(){
    const q = String(els.q.value || '').trim().toLowerCase();
    const status = String(els.statusFilter.value || 'all');
    const billing = String(els.billingFilter.value || 'all');
    state.filtered = state.tenants.filter((t)=>{
      if(status !== 'all' && String(t.status || '').toLowerCase() !== status) return false;
      if(billing !== 'all' && String(t.billing_provider || '').toLowerCase() !== billing) return false;
      if(!q) return true;
      const hay = [
        t.name,
        t.status,
        t.billing_provider,
        t.mollie_customer_id,
        t.mollie_subscription_id,
        t.id
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
    renderCards();
    renderTable();
  }

  function renderCards(){
    const all = state.tenants;
    const totalUsers = all.reduce((n,t)=> n + Number(t.users_count || 0), 0);
    const totalSeats = all.reduce((n,t)=> n + Number(t.seats_purchased || 0), 0);
    $('kpiTenants').textContent = String(all.length);
    $('kpiActive').textContent = String(all.filter(t=>String(t.status||'')==='active').length);
    $('kpiTrial').textContent = String(all.filter(t=>String(t.status||'')==='trial').length);
    $('kpiUsers').textContent = String(totalUsers);
    $('kpiSeats').textContent = String(totalSeats);
  }

  function renderTable(){
    const tbody = els.rows;
    if(!state.filtered.length){
      tbody.innerHTML = '<tr><td colspan="9" class="sa-empty">Geen tenants gevonden.</td></tr>';
      $('count').textContent = '0 tenants';
      return;
    }
    tbody.innerHTML = state.filtered.map((t)=>`
      <tr data-id="${esc(t.id)}">
        <td>
          <div style="font-weight:800;">${esc(t.name)}</div>
          <div class="sa-muted">${esc(t.id)}</div>
        </td>
        <td>${statusBadge(t.status)}</td>
        <td>${boolPill(!!t.is_active)}</td>
        <td>${esc(fmtDate(t.trial_until))}</td>
        <td>${esc(fmtDate(t.valid_until))}</td>
        <td>${esc(String(t.seats_purchased ?? 0))}</td>
        <td>${esc(String(t.users_count ?? 0))}</td>
        <td>${esc(String(t.billing_provider || 'none'))}</td>
        <td>
          <div class="sa-actions">
            <button class="btn btnManage" data-id="${esc(t.id)}">Open</button>
          </div>
        </td>
      </tr>
    `).join('');
    $('count').textContent = `${state.filtered.length} tenants`;
  }

  function exportCsv(){
    const rows = [
      ['Tenant','Tenant ID','Status','Actief','Trial tot','Geldig tot','Seats','Users','Billing provider','Mollie customer','Mollie subscription']
    ].concat(state.filtered.map((t)=>[
      t.name || '',
      t.id || '',
      t.status || '',
      t.is_active ? 'Ja' : 'Nee',
      fmtDate(t.trial_until),
      fmtDate(t.valid_until),
      t.seats_purchased ?? '',
      t.users_count ?? '',
      t.billing_provider || 'none',
      t.mollie_customer_id || '',
      t.mollie_subscription_id || ''
    ]));
    const csv = rows.map(r=>r.map(v=>`"${String(v ?? '').replaceAll('"','""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    UI.downloadBlob('klantbeheer_tenants.csv', blob);
  }

  function openCreateTenantModal(){
    UI.modalForm({
      title: 'Nieuwe tenant',
      submitLabel: 'Tenant aanmaken',
      values: {
        name: '',
        status: 'trial',
        trial_days: '14',
        seats_purchased: '3',
        price_per_seat_year_cents: '9900',
        billing_provider: 'none',
        admin_email: '',
        admin_password: '',
        admin_role: 'tenant_admin'
      },
      fields: [
        { key:'name', label:'Tenant naam', type:'text' },
        { key:'status', label:'Status', type:'select', options:['trial','active','suspended','cancelled'] },
        { key:'trial_days', label:'Trial dagen', type:'number' },
        { key:'seats_purchased', label:'Seats', type:'number' },
        { key:'price_per_seat_year_cents', label:'Prijs/seat/jaar (cent)', type:'number' },
        { key:'billing_provider', label:'Billing provider', type:'select', options:['none','mollie'] },
        { key:'admin_email', label:'Eerste admin e-mail', type:'text', placeholder:'admin@bedrijf.nl' },
        { key:'admin_password', label:'Eerste admin wachtwoord', type:'password' },
        { key:'admin_role', label:'Admin rol', type:'select', options:['tenant_admin','planner','viewer'] }
      ],
      onSubmit: async (vals)=>{
        const payload = {
          name: String(vals.name || '').trim(),
          status: String(vals.status || 'trial'),
          trial_days: Number(vals.trial_days || 14),
          seats_purchased: Number(vals.seats_purchased || 1),
          price_per_seat_year_cents: Number(vals.price_per_seat_year_cents || 0),
          billing_provider: String(vals.billing_provider || 'none'),
          is_active: true
        };
        if(!payload.name) throw new Error('Tenant naam is verplicht.');
        const adminEmail = String(vals.admin_email || '').trim();
        const adminPassword = String(vals.admin_password || '').trim();
        if(adminEmail){
          if(!adminPassword) throw new Error('Geef een wachtwoord op voor de eerste admin.');
          payload.create_admin = {
            email: adminEmail,
            password: adminPassword,
            role: String(vals.admin_role || 'tenant_admin'),
            is_active: true
          };
        }
        await window.Auth.platform.tenants.create(payload);
        toast('Tenant aangemaakt');
        await loadTenants();
      }
    });
  }

  async function loadTenantDetail(tenantId){
    const [tenant, users, payments, audit] = await Promise.all([
      window.Auth.platform.tenants.get(tenantId),
      window.Auth.platform.tenants.users.list(tenantId).catch(()=>[]),
      window.Auth.platform.tenants.payments(tenantId).catch(()=>[]),
      window.Auth.platform.tenants.audit(tenantId).catch(()=>[])
    ]);
    state.detail = tenant;
    state.users = Array.isArray(users) ? users : [];
    state.payments = Array.isArray(payments) ? payments : [];
    state.audit = Array.isArray(audit) ? audit : [];
  }

  function renderDetailModal(){
    const t = state.detail;
    const usersRows = state.users.length ? state.users.map((u)=>`
      <tr data-user-id="${esc(u.user_id)}">
        <td>${esc(u.email)}</td>
        <td>${boolPill(!!u.is_active)}</td>
        <td>${esc(u.role)}</td>
        <td class="sa-right">
          <button class="btn js-user-toggle" data-id="${esc(u.user_id)}">${u.is_active ? 'Deactiveer' : 'Activeer'}</button>
          <button class="btn js-user-role" data-id="${esc(u.user_id)}">Rol wijzigen</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="sa-empty">Nog geen gebruikers</td></tr>';

    const paymentRows = state.payments.length ? state.payments.map((p)=>`
      <tr>
        <td>${esc(fmtDateTime(p.created_at))}</td>
        <td>${esc(p.provider || '')}</td>
        <td>${esc(p.type || '')}</td>
        <td>${esc(moneyCents(p.amount_cents || 0))}</td>
        <td>${esc(p.status || '')}</td>
        <td class="sa-muted">${esc(p.provider_payment_id || p.id || '')}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="sa-empty">Nog geen payments</td></tr>';

    const auditRows = state.audit.length ? state.audit.map((a)=>`
      <tr>
        <td>${esc(fmtDateTime(a.created_at))}</td>
        <td>${esc(a.action || '')}</td>
        <td>${esc(a.user_id || '')}</td>
        <td class="sa-muted">${esc(a.meta || '')}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="sa-empty">Nog geen auditregels</td></tr>';

    const body = `
      <div class="sa-tabs">
        <button class="btn js-tab active" data-tab="general">Algemeen</button>
        <button class="btn js-tab" data-tab="users">Gebruikers</button>
        <button class="btn js-tab" data-tab="billing">Billing</button>
        <button class="btn js-tab" data-tab="audit">Audit</button>
      </div>

      <div class="sa-tabpane active" data-pane="general">
        <div class="sa-kpi-line">
          ${statusBadge(t.status)}
          <span class="sa-chip">Users: ${esc(String(t.users_count ?? 0))}</span>
          <span class="sa-chip">Seats: ${esc(String(t.seats_purchased ?? 0))}</span>
          <span class="sa-chip">Billing: ${esc(String(t.billing_provider || 'none'))}</span>
        </div>
        <div class="sa-modal-grid" style="margin-top:12px;">
          <div class="sa-field"><label class="sa-label">Tenant naam</label><input class="input" id="td_name" value="${esc(t.name || '')}" /></div>
          <div class="sa-field"><label class="sa-label">Status</label><select class="input" id="td_status">${['trial','active','suspended','cancelled'].map(v=>`<option value="${v}" ${String(t.status)===v?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="sa-field"><label class="sa-label">Actief</label><select class="input" id="td_active"><option value="true" ${t.is_active ? 'selected' : ''}>true</option><option value="false" ${!t.is_active ? 'selected' : ''}>false</option></select></div>
          <div class="sa-field"><label class="sa-label">Seats</label><input class="input" id="td_seats" type="number" min="1" value="${esc(String(t.seats_purchased ?? 1))}" /></div>
          <div class="sa-field"><label class="sa-label">Trial tot</label><input class="input" id="td_trial_until" type="datetime-local" value="${t.trial_until ? esc(new Date(t.trial_until).toISOString().slice(0,16)) : ''}" /></div>
          <div class="sa-field"><label class="sa-label">Geldig tot</label><input class="input" id="td_valid_until" type="datetime-local" value="${t.valid_until ? esc(new Date(t.valid_until).toISOString().slice(0,16)) : ''}" /></div>
          <div class="sa-field"><label class="sa-label">Billing provider</label><select class="input" id="td_billing_provider">${['none','mollie'].map(v=>`<option value="${v}" ${String(t.billing_provider)===v?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="sa-field"><label class="sa-label">Prijs/seat/jaar (cent)</label><input class="input" id="td_price_per_seat" type="number" min="0" value="${esc(String(t.price_per_seat_year_cents ?? 0))}" /></div>
        </div>
        <div class="sa-actions" style="margin-top:12px;">
          <button class="btn js-save-general">Opslaan</button>
          <button class="btn js-start-trial">Start trial (14d)</button>
          <button class="btn js-force-logout">Force logout</button>
        </div>
      </div>

      <div class="sa-tabpane" data-pane="users">
        <div class="sa-modal-grid-3">
          <div class="sa-field"><label class="sa-label">E-mail</label><input class="input" id="tu_email" placeholder="user@bedrijf.nl" /></div>
          <div class="sa-field"><label class="sa-label">Wachtwoord</label><input class="input" id="tu_password" type="password" placeholder="Tijdelijk wachtwoord" /></div>
          <div class="sa-field"><label class="sa-label">Rol</label><select class="input" id="tu_role">${['tenant_admin','planner','viewer','auditor','qc'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
        </div>
        <div class="sa-actions" style="margin-top:12px;justify-content:flex-start;">
          <button class="btn js-add-user">Gebruiker toevoegen</button>
        </div>
        <div class="table-wrap" style="margin-top:12px;max-height:320px;">
          <table>
            <thead><tr><th>E-mail</th><th>Actief</th><th>Rol</th><th>Actie</th></tr></thead>
            <tbody id="tenantUsersRows">${usersRows}</tbody>
          </table>
        </div>
      </div>

      <div class="sa-tabpane" data-pane="billing">
        <div class="sa-grid-2">
          <div class="card pad">
            <div style="font-weight:800;">Billing status</div>
            <div class="sa-stack" style="margin-top:10px;">
              <div><span class="sa-label">Provider</span><div>${esc(t.billing_provider || 'none')}</div></div>
              <div><span class="sa-label">Mollie customer</span><div>${esc(t.mollie_customer_id || '-')}</div></div>
              <div><span class="sa-label">Mollie subscription</span><div>${esc(t.mollie_subscription_id || '-')}</div></div>
              <div><span class="sa-label">Status</span><div>${esc(t.mollie_subscription_status || '-')}</div></div>
              <div><span class="sa-label">Volgende betaling</span><div>${esc(fmtDate(t.mollie_next_payment_date) || '-')}</div></div>
            </div>
            <div class="sa-linkline" style="margin-top:10px;">Webhook token: ${esc(t.webhook_token || '-')}</div>
          </div>
          <div class="card pad">
            <div style="font-weight:800;">Seats beheren</div>
            <div class="sa-modal-grid" style="margin-top:10px;">
              <div class="sa-field"><label class="sa-label">Doel seats</label><input class="input" id="tb_target_seats" type="number" min="1" value="${esc(String(t.seats_purchased ?? 1))}" /></div>
              <div class="sa-field"><label class="sa-label">Preview</label><div id="tb_preview_result" class="sa-muted">Nog geen preview uitgevoerd.</div></div>
            </div>
            <div class="sa-actions" style="margin-top:12px;justify-content:flex-start;">
              <button class="btn js-preview-seats">Preview seats</button>
              <button class="btn js-apply-seats">Toepassen seats</button>
              <button class="btn js-activate-year">Activeer 1 jaar</button>
              <button class="btn sa-danger js-cancel-tenant">Annuleer tenant</button>
            </div>
          </div>
        </div>
        <div class="card pad" style="margin-top:12px;">
          <div style="font-weight:800;">Handmatig payment toevoegen</div>
          <div class="sa-modal-grid-3" style="margin-top:10px;">
            <div class="sa-field"><label class="sa-label">Bedrag (EUR)</label><input class="input" id="tp_amount" type="number" step="0.01" value="0.00" /></div>
            <div class="sa-field"><label class="sa-label">Status</label><select class="input" id="tp_status">${['paid','created','failed','refunded','cancelled'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
            <div class="sa-field"><label class="sa-label">Type</label><select class="input" id="tp_type">${['subscription','upgrade','manual'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
          </div>
          <div class="sa-actions" style="margin-top:12px;justify-content:flex-start;"><button class="btn js-add-payment">Payment toevoegen</button></div>
          <div class="table-wrap" style="margin-top:12px;max-height:260px;">
            <table>
              <thead><tr><th>Datum</th><th>Provider</th><th>Type</th><th>Bedrag</th><th>Status</th><th>ID</th></tr></thead>
              <tbody id="tenantPaymentRows">${paymentRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sa-tabpane" data-pane="audit">
        <div class="table-wrap" style="max-height:420px;">
          <table>
            <thead><tr><th>Datum</th><th>Action</th><th>User</th><th>Meta</th></tr></thead>
            <tbody id="tenantAuditRows">${auditRows}</tbody>
          </table>
        </div>
      </div>
    `;

    UI.openModal({
      title: `Tenant 360° — ${t.name}`,
      bodyHtml: body,
      saveLabel: 'Sluiten',
      onSave: ({close}) => close()
    });

    bindDetailModalEvents();
  }

  function bindDetailModalEvents(){
    const body = $('uiModalBody');
    if(!body) return;

    body.querySelectorAll('.js-tab').forEach((btn)=>{
      btn.addEventListener('click', ()=>{
        body.querySelectorAll('.js-tab').forEach(x=>x.classList.remove('active'));
        body.querySelectorAll('.sa-tabpane').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.getAttribute('data-tab');
        const pane = body.querySelector(`[data-pane="${key}"]`);
        if(pane) pane.classList.add('active');
      });
    });

    body.querySelector('.js-save-general')?.addEventListener('click', async ()=>{
      const payload = {
        name: $('td_name').value.trim(),
        status: $('td_status').value,
        is_active: $('td_active').value === 'true',
        seats_purchased: Number($('td_seats').value || 1),
        trial_until: $('td_trial_until').value ? new Date($('td_trial_until').value).toISOString() : null,
        valid_until: $('td_valid_until').value ? new Date($('td_valid_until').value).toISOString() : null,
        billing_provider: $('td_billing_provider').value,
        price_per_seat_year_cents: Number($('td_price_per_seat').value || 0)
      };
      await window.Auth.platform.tenants.patch(state.detail.id, payload);
      toast('Tenant opgeslagen');
      await loadTenants();
      await refreshDetail();
    });

    body.querySelector('.js-start-trial')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.startTrial(state.detail.id, { days: 14 });
      toast('Trial gestart');
      await loadTenants();
      await refreshDetail();
    });

    body.querySelector('.js-force-logout')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.forceLogout(state.detail.id);
      toast('Force logout uitgevoerd');
      await refreshDetail();
    });

    body.querySelector('.js-add-user')?.addEventListener('click', async ()=>{
      const email = $('tu_email').value.trim();
      const password = $('tu_password').value.trim();
      const role = $('tu_role').value;
      if(!email || !password) throw new Error('E-mail en wachtwoord zijn verplicht.');
      await window.Auth.platform.tenants.users.create(state.detail.id, { email, password, role, is_active: true });
      toast('Gebruiker toegevoegd');
      await loadTenants();
      await refreshDetail('users');
    });

    body.addEventListener('click', async (e)=>{
      const toggleBtn = e.target.closest('.js-user-toggle');
      if(toggleBtn){
        const id = toggleBtn.getAttribute('data-id');
        const current = state.users.find(u=>u.user_id === id);
        if(!current) return;
        await window.Auth.platform.tenants.users.patch(state.detail.id, id, { is_active: !current.is_active });
        toast('Gebruiker bijgewerkt');
        await loadTenants();
        await refreshDetail('users');
        return;
      }
      const roleBtn = e.target.closest('.js-user-role');
      if(roleBtn){
        const id = roleBtn.getAttribute('data-id');
        const current = state.users.find(u=>u.user_id === id);
        if(!current) return;
        const nextRole = prompt('Nieuwe rol', current.role || 'viewer');
        if(!nextRole) return;
        await window.Auth.platform.tenants.users.patch(state.detail.id, id, { role: nextRole });
        toast('Rol bijgewerkt');
        await refreshDetail('users');
        return;
      }
    });

    body.querySelector('.js-preview-seats')?.addEventListener('click', async ()=>{
      const target = Number($('tb_target_seats').value || 1);
      const preview = await window.Auth.platform.tenants.billing.previewSeats(state.detail.id, { seats_target: target });
      $('tb_preview_result').textContent = `${preview.action || '-'} • ${preview.notes || ''} • ${preview.amount_cents ? moneyCents(preview.amount_cents) : '€ 0.00'}`;
    });

    body.querySelector('.js-apply-seats')?.addEventListener('click', async ()=>{
      const target = Number($('tb_target_seats').value || 1);
      await window.Auth.platform.tenants.billing.applySeats(state.detail.id, { seats_purchased: target });
      toast('Seats bijgewerkt');
      await loadTenants();
      await refreshDetail('billing');
    });

    body.querySelector('.js-activate-year')?.addEventListener('click', async ()=>{
      await window.Auth.platform.tenants.billing.activateYear(state.detail.id);
      toast('Tenant 1 jaar geactiveerd');
      await loadTenants();
      await refreshDetail('billing');
    });

    body.querySelector('.js-cancel-tenant')?.addEventListener('click', async ()=>{
      const ok = confirm(`Tenant ${state.detail.name} annuleren?`);
      if(!ok) return;
      await window.Auth.platform.tenants.billing.cancel(state.detail.id);
      toast('Tenant geannuleerd');
      await loadTenants();
      await refreshDetail('billing');
    });

    body.querySelector('.js-add-payment')?.addEventListener('click', async ()=>{
      const amount = Number($('tp_amount').value || 0);
      await window.Auth.platform.tenants.paymentsManual(state.detail.id, {
        provider: 'manual',
        type: $('tp_type').value,
        amount_cents: Math.round(amount * 100),
        currency: 'EUR',
        status: $('tp_status').value
      });
      toast('Payment toegevoegd');
      await refreshDetail('billing');
    });
  }

  async function refreshDetail(focusTab){
    const id = state.detail.id;
    await loadTenantDetail(id);
    renderDetailModal();
    if(focusTab){
      setTimeout(()=>{
        const btn = document.querySelector(`#uiModalBody .js-tab[data-tab="${focusTab}"]`);
        if(btn) btn.click();
      }, 0);
    }
  }

  function bindEvents(){
    els.q.addEventListener('input', applyFilter);
    els.statusFilter.addEventListener('change', applyFilter);
    els.billingFilter.addEventListener('change', applyFilter);
    $('btnRefresh').addEventListener('click', async ()=>{
      await loadTenants();
      toast('Tenants ververst');
    });
    $('btnNewTenant').addEventListener('click', openCreateTenantModal);
    $('btnExportCsv').addEventListener('click', exportCsv);

    els.rows.addEventListener('click', async (e)=>{
      const btn = e.target.closest('.btnManage');
      if(!btn) return;
      await loadTenantDetail(btn.getAttribute('data-id'));
      renderDetailModal();
    });

    UI.bindRowDblClick(els.rows, async (id)=>{
      await loadTenantDetail(id);
      renderDetailModal();
    });
  }

  async function boot(){
    els.q = $('q');
    els.statusFilter = $('statusFilter');
    els.billingFilter = $('billingFilter');
    els.rows = $('rows');

    if(!requirePlatformAdmin()) return;
    bindEvents();
    try{
      await loadTenants();
    }catch(err){
      console.error(err);
      els.rows.innerHTML = `<tr><td colspan="9" class="sa-empty">Laden mislukt: ${esc(err.message || err)}</td></tr>`;
      toast('Klantbeheer laden mislukt');
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
