export function decimal(value, min, max, label = 'Bonus') {
    const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    const n = Number(raw);
    if (raw === '' || raw == null || typeof raw === 'boolean' || !Number.isFinite(n) || n < min || n > max || Math.abs(n * 100 - Math.round(n * 100)) > 1e-7) throw new Error(`${label}: Zahl ${min} bis ${max}, höchstens zwei Nachkommastellen.`);
    return Math.round(n * 100) / 100;
}
export const rounded = n => Math.round((n + Number.EPSILON) * 100) / 100;
