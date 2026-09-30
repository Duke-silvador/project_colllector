const SUPABASE_URL = 'https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY_STORAGE = 'tradeflow_testlab_publishable_key';
const SESSION_STORAGE = 'tradeflow_testlab_session';
const TENANTS = {
  a: { slug: 'test-business-a', id: 'f50fb889-c615-4e55-84d4-f0fd9f48b0b0', label: 'Customer A / Test Business A' },
  b: { slug: 'test-business-b', id: '373598f0-7d35-41be-8ed2-3cc7ee9709c7', label: 'Customer B / Test Business B' }
};
const CUSTOMER_READ_TESTS = [
  ['customer_get_profile', 'Customer profile'], ['customer_get_addresses', 'Customer addresses'],
  ['customer_get_buying_requests', 'Buying requests'], ['customer_get_buying_items', 'Buying items'],
  ['customer_get_trading_values', 'Trading Values'], ['customer_get_offers', 'Offers'],
  ['customer_get_acquisitions', 'Acquisitions'], ['customer_get_trade_ins', 'Trade-ins'],
  ['customer_get_order_trade_ins', 'Order trade-ins'], ['customer_get_orders', 'Orders'],
  ['customer_get_order_items', 'Order items'], ['customer_get_fulfilments', 'Fulfilments'],
  ['customer_get_returns', 'Returns']
];
const PROTECTED_TABLES = ['customers', 'customer_addresses', 'buying_requests', 'buying_items', 'offers', 'retail_orders', 'retail_order_items', 'returns', 'trade_in_transactions'];
const STAFF_ROLE_RESTRICTIONS = [
  ['staff.manage', false], ['tenant.manage', false], ['website.manage', false],
  ['website.publish', false], ['finance.manage', false], ['audit.view', false]
];
let supabaseKey = null;
let session = null;
let mode = 'signup';
const $ = (id) => document.getElementById(id);
function status(text, type = '') { const el = $('connection-status'); if (el) { el.className = `small ${type}`.trim(); el.textContent = text || ''; } }
function message(text, type = '') { const el = $('message'); if (!el) return; el.className = type; el.textContent = text || ''; }
function setMode(nextMode) { mode = nextMode; document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode)); $('name-fields').hidden = mode !== 'signup'; $('auth-submit').textContent = mode === 'signup' ? 'Create customer account' : 'Sign in'; $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password'; message(''); }
async function api(path, options = {}) {
  if (!supabaseKey) throw new Error('TradeFlow Supabase is not connected.');
  const headers = new Headers(options.headers || {}); headers.set('apikey', supabaseKey); headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers }); const text = await response.text(); let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) { const detail = body?.msg || body?.message || body?.error_description || body?.error || text || `HTTP ${response.status}`; const error = new Error(detail); error.status = response.status; throw error; }
  return body;
}
async function findExistingCustomer() {
  if (!session?.user?.id) return [];
  const rows = await api('/rest/v1/rpc/test_lab_current_customer', { method: 'GET' });
  const existing = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = row.tenant_id === TENANTS.a.id ? 'a' : row.tenant_id === TENANTS.b.id ? 'b' : null;
    if (!key) throw new Error('Authenticated account is linked to a non-test tenant.');
    existing.push({ key, row: { id: row.customer_id, tenant_id: row.tenant_id } });
  }
  return existing;
}
async function showExistingCustomerIfPresent() {
  try {
    const existing = await findExistingCustomer();
    if (existing.length > 1) throw new Error('Security test data error: this Auth account is linked to more than one test tenant.');
    if (existing.length === 1) {
      const found = existing[0];
      showReady('Customer account ready.', `${TENANTS[found.key].label} is already registered for this Auth account. Customer ID: ${found.row.id}`);
      return true;
    }
  } catch (error) {
    message(error.message || String(error), 'error');
    return false;
  }
  return false;
}
async function connect(key) {
  const button = $('save-config');
  try { status('Connect button clicked. Starting connection test…'); if (!key || !key.startsWith('sb_')) { status('Enter the TradeFlow Supabase publishable key beginning with sb_.', 'error'); return; }
    button.disabled = true; button.textContent = 'Connecting…'; status('Testing the TradeFlow Supabase HTTPS API…'); supabaseKey = key; localStorage.setItem(KEY_STORAGE, key); await api('/auth/v1/settings'); status('Connected.'); $('config').hidden = true; $('app').hidden = false; await restoreSession();
  } catch (error) { supabaseKey = null; button.disabled = false; button.textContent = 'Connect'; status(`Connection failed: ${error.message || error}`, 'error'); message(`Connection failed: ${error.message || error}`, 'error'); }
}
function saveSession(nextSession) { session = nextSession || null; if (session?.access_token) localStorage.setItem(SESSION_STORAGE, JSON.stringify(session)); else localStorage.removeItem(SESSION_STORAGE); }
async function restoreSession() { const saved = localStorage.getItem(SESSION_STORAGE); if (!saved) { refreshSessionUI(null); return; } try { const parsed = JSON.parse(saved); if (!parsed?.access_token) throw new Error('Invalid saved session.'); session = parsed; const user = await api('/auth/v1/user'); session.user = user; localStorage.setItem(SESSION_STORAGE, JSON.stringify(session)); refreshSessionUI(session); await showExistingCustomerIfPresent(); } catch { saveSession(null); refreshSessionUI(null); } }
function refreshSessionUI(currentSession) { if (currentSession?.user) { $('session-panel').hidden = false; $('auth-panel').hidden = true; $('session-email').textContent = currentSession.user.email || ''; $('onboarding-panel').hidden = false; $('ready-panel').hidden = true; } else { $('session-panel').hidden = true; $('auth-panel').hidden = false; $('onboarding-panel').hidden = true; $('ready-panel').hidden = true; } }
async function signUp(email, password) { const data = await api('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) }); if (data?.access_token) { saveSession(data); return true; } return false; }
async function signIn(email, password) { const data = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }); saveSession(data); const user = await api('/auth/v1/user'); session.user = user; localStorage.setItem(SESSION_STORAGE, JSON.stringify(session)); }
function showReady(label, detail, type = 'success') { $('onboarding-panel').hidden = true; $('ready-panel').hidden = false; $('ready-text').textContent = detail; message(label, type); }
async function completeOnboarding() {
  const firstName = $('onboard-first-name').value.trim(); const lastName = $('onboard-last-name').value.trim() || null; const tenantSlug = $('tenant-slug').value;
  if (!firstName) return message('First name is required.', 'error');
  message('Checking for an existing customer registration…');
  try {
    const existing = await findExistingCustomer();
    if (existing.length === 1) {
      const found = existing[0]; const label = TENANTS[found.key].label;
      showReady('Existing customer registration found. You can continue to the security test.', `${label} is already registered for this Auth account. Customer ID: ${found.row.id}`);
      return;
    }
    if (existing.length > 1) throw new Error('Security test data error: this Auth account is linked to more than one test tenant.');
    message('Creating the customer record…');
    const data = await api('/rest/v1/rpc/customer_complete_test_registration', { method: 'POST', body: JSON.stringify({ p_tenant_slug: tenantSlug, p_first_name: firstName, p_last_name: lastName }) });
    showReady('Customer record created.', `${tenantSlug === 'test-business-a' ? 'Customer A / Test Business A' : 'Customer B / Test Business B'} is ready. Customer ID: ${data}`);
  } catch (error) { message(error.message || String(error), 'error'); }
}
function resultRow(label, passed, detail) { return `<div class="security-result ${passed ? 'pass' : 'fail'}"><strong>${passed ? 'PASS' : 'FAIL'} — ${label}</strong><span>${detail}</span></div>`; }
async function runSecurityTest() {
  const button = $('run-security-test'), results = $('security-results'); button.disabled = true; button.textContent = 'Running security test…'; results.hidden = false; results.innerHTML = '<p>Testing the current authenticated session against both test tenants, memberships and protected tables…</p>';
  const rows = []; let passCount = 0;
  try {
    if (!session?.access_token || !session?.user?.id) throw new Error('No authenticated customer session is available.');
    const identityRows = await api('/rest/v1/rpc/test_lab_current_customer', { method: 'GET' });
    const identity = Array.isArray(identityRows) ? identityRows : [];
    const ownKey = identity.length === 1 ? (identity[0].tenant_id === TENANTS.a.id ? 'a' : identity[0].tenant_id === TENANTS.b.id ? 'b' : null) : null;
    const passedIdentity = identity.length === 1 && !!ownKey;
    if (passedIdentity) passCount++;
    rows.push(resultRow('Customer identity resolves to exactly one tenant', passedIdentity, passedIdentity ? `${TENANTS[ownKey].label} is the authenticated customer tenant.` : `Unexpected authenticated customer identity count or tenant mapping: ${identity.length} record(s).`));
    if (passedIdentity) {
      const otherKey = ownKey === 'a' ? 'b' : 'a';
      for (const [fn, label] of CUSTOMER_READ_TESTS) {
        try {
          const data = await api(`/rest/v1/rpc/${fn}?p_tenant_id=${encodeURIComponent(TENANTS[otherKey].id)}`, { method: 'GET' });
          const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
          const passedRead = count === 0;
          if (passedRead) passCount++;
          rows.push(resultRow(`Cross-tenant ${label}`, passedRead, passedRead ? '0 records returned from the opposite tenant.' : `${count} record(s) returned — tenant isolation failure.`));
        } catch (error) {
          const capabilityGuard = String(error.message || '').includes('Subscription capability required:');
          if (capabilityGuard) passCount++;
          rows.push(resultRow(`Cross-tenant ${label}`, capabilityGuard, capabilityGuard ? `The opposite tenant rejected the call through its subscription capability guard (${error.message}).` : `Unexpected HTTP ${error.status || '?'}: ${error.message}`));
        }
      }
      const membershipOwn = await api(`/rest/v1/tenant_memberships?select=tenant_id,role_code,status&tenant_id=eq.${encodeURIComponent(TENANTS[ownKey].id)}&user_id=eq.${encodeURIComponent(session.user.id)}`, { method: 'GET' });
      const membershipOther = await api(`/rest/v1/tenant_memberships?select=tenant_id,role_code,status&tenant_id=eq.${encodeURIComponent(TENANTS[otherKey].id)}&user_id=eq.${encodeURIComponent(session.user.id)}`, { method: 'GET' });
      const ownMembershipPass = Array.isArray(membershipOwn) && membershipOwn.length === 1 && membershipOwn[0].status === 'active'; if (ownMembershipPass) passCount++;
      rows.push(resultRow('Own tenant membership is visible and active', ownMembershipPass, ownMembershipPass ? `One active ${membershipOwn[0].role_code} membership returned for ${TENANTS[ownKey].label}.` : 'Unexpected own membership count/status.'));
      const otherMembershipPass = Array.isArray(membershipOther) && membershipOther.length === 0; if (otherMembershipPass) passCount++;
      rows.push(resultRow('Cross-tenant membership is hidden', otherMembershipPass, otherMembershipPass ? '0 membership records returned for the opposite tenant.' : `${membershipOther.length} membership record(s) returned — membership isolation failure.`));
      const ownTenant = await api(`/rest/v1/tenants?select=id,slug&slug=eq.${encodeURIComponent(TENANTS[ownKey].slug)}`, { method: 'GET' });
      const otherTenant = await api(`/rest/v1/tenants?select=id,slug&slug=eq.${encodeURIComponent(TENANTS[otherKey].slug)}`, { method: 'GET' });
      const ownTenantPass = Array.isArray(ownTenant) && ownTenant.length === 1; if (ownTenantPass) passCount++;
      rows.push(resultRow('Own tenant record is visible', ownTenantPass, ownTenantPass ? 'The authenticated member can resolve its own tenant.' : 'Own tenant record was not visible as expected.'));
      const otherTenantPass = Array.isArray(otherTenant) && otherTenant.length === 0; if (otherTenantPass) passCount++;
      rows.push(resultRow('Cross-tenant tenant record is hidden', otherTenantPass, otherTenantPass ? '0 tenant records returned for the opposite tenant.' : `${otherTenant.length} tenant record(s) returned — tenant isolation failure.`));
      for (const table of PROTECTED_TABLES) {
        try { await api(`/rest/v1/${table}?select=*`, { method: 'GET' }); rows.push(resultRow(`Direct access blocked — ${table}`, false, 'The authenticated browser received a successful response from a protected table.')); }
        catch (error) { const passedTable = error.status === 401 || error.status === 403; if (passedTable) passCount++; rows.push(resultRow(`Direct access blocked — ${table}`, passedTable, passedTable ? `HTTP ${error.status} as expected.` : `Unexpected HTTP ${error.status || '?'}: ${error.message}`)); }
      }
      const roles = await api('/rest/v1/roles?select=id,code,active&active=eq.true&order=sort_order', { method: 'GET' });
      const roleCodes = new Set((Array.isArray(roles) ? roles : []).map((r) => r.code)); const rolesPresent = ['owner','admin','staff'].every((r) => roleCodes.has(r)); if (rolesPresent) passCount++;
      rows.push(resultRow('System roles are present', rolesPresent, rolesPresent ? 'Owner, Administrator and Staff roles are active.' : 'One or more required system roles are missing.'));
      const perms = await api('/rest/v1/role_permissions?select=role_id,permission_id', { method: 'GET' });
      const permissions = await api('/rest/v1/permissions?select=id,code,active&active=eq.true', { method: 'GET' });
      const permissionMap = new Map((Array.isArray(permissions) ? permissions : []).map((p) => [p.id, p.code])); const roleIdMap = new Map((Array.isArray(roles) ? roles : []).map((r) => [r.code, r.id]));
      const staffPermissions = new Set((Array.isArray(perms) ? perms : []).filter((rp) => rp.role_id === roleIdMap.get('staff')).map((rp) => permissionMap.get(rp.permission_id)).filter(Boolean));
      for (const [code, expected] of STAFF_ROLE_RESTRICTIONS) { const actual = staffPermissions.has(code); const passed = actual === expected; if (passed) passCount++; rows.push(resultRow(`Staff role restriction — ${code}`, passed, passed ? `Staff permission state is ${actual ? 'enabled' : 'not granted'} as expected.` : `Staff permission state is ${actual ? 'enabled' : 'not granted'} but expected ${expected ? 'enabled' : 'not granted'}.`)); }
    }
    const total = rows.length; const failed = rows.filter((row) => row.includes('class="security-result fail"')).length;
    results.innerHTML = `<h3>Authenticated Tenant &amp; Staff Security Test</h3><p><strong>${passCount}/${total} checks passed.</strong> ${failed ? `${failed} check(s) require attention.` : 'All checks passed.'}</p>${rows.join('')}`;
  } catch (error) { results.innerHTML = `<p class="error"><strong>Test could not complete:</strong> ${error.message || error}</p>${rows.join('')}`; }
  finally { button.disabled = false; button.textContent = 'Run tenant-isolation security test again'; }
}
function initialise() {
  status('Test Lab loaded. Enter the publishable key and click Connect.'); $('save-config').addEventListener('click', () => connect($('supabase-key').value.trim())); document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('auth-form').addEventListener('submit', async (event) => { event.preventDefault(); message('Working…'); const email = $('email').value.trim(), password = $('password').value; try { if (mode === 'signup') { $('onboard-first-name').value = $('first-name').value.trim(); $('onboard-last-name').value = $('last-name').value.trim(); const hasSession = await signUp(email, password); if (!hasSession) { message('Account created. Check your email to confirm the account, then sign in.'); setMode('login'); return; } } else { await signIn(email, password); } refreshSessionUI(session); await showExistingCustomerIfPresent(); if ($('onboarding-panel').hidden === false && !$('message').classList.contains('error')) message('Signed in. Complete customer setup below.'); } catch (error) { message(error.message || String(error), 'error'); } });
  $('complete-onboarding').addEventListener('click', completeOnboarding); $('sign-out').addEventListener('click', () => { saveSession(null); refreshSessionUI(null); message('Signed out.'); });
  const savedKey = localStorage.getItem(KEY_STORAGE); if (savedKey) $('supabase-key').value = savedKey;
  if (savedKey) connect(savedKey); else refreshSessionUI(null);
}
window.addEventListener('DOMContentLoaded', initialise);
