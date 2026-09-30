// TradeFlow Customer Test Lab — existing-account detection repair.
// Uses the dedicated test-only identity resolver so subscription guards do not
// prevent the lab from recognising an already-linked customer account.
async function findExistingCustomer() {
  if (!session?.user?.id) return [];
  const rows = await api('/rest/v1/rpc/test_lab_current_customer_v2', { method: 'GET' });
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row) => {
    const key = row.tenant_id === TENANTS.a.id ? 'a' : row.tenant_id === TENANTS.b.id ? 'b' : null;
    if (!key) throw new Error('Security test data error: authenticated customer is linked to an unrecognised tenant.');
    return { key, row: { id: row.customer_id, tenant_id: row.tenant_id } };
  });
}
