/** Cliente HTTP mínimo: mismos endpoints que ya expone el backend. */

export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch(path, body !== undefined || method
    ? { method: method ?? 'POST', headers: { 'Content-Type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined }
    : undefined);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error || 'Error de conexión');
  return data as T;
}

export const eur = (c: number) =>
  (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const waShare = (text: string, phone?: string | null) =>
  (phone ? `https://wa.me/${String(phone).replace(/\D/g, '')}` : 'https://wa.me/') +
  `?text=${encodeURIComponent(text)}`;

/** +34633333351 → "+34 633 333 351"; deja tal cual lo que no reconozca. */
export const fmtPhone = (p: string | number) => {
  const s = String(p).replace(/^\+/, '');
  const m = s.match(/^(34)(\d{3})(\d{3})(\d{3})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : '+' + s;
};

export const fmtFecha = (d: string | Date) =>
  new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const CAT_LABELS: Record<string, string> = {
  cerveza: 'Cervezas', vino: 'Vinos', refresco: 'Refrescos', copa: 'Copas',
  botella: 'Botellas', comida: 'Comida', general: 'Otros',
};
export const CAT_ORDER = ['cerveza', 'vino', 'refresco', 'copa', 'botella', 'comida'];

export function sortProducts<T extends { category: string; name: string }>(ps: T[]): T[] {
  return [...ps].sort((a, b) => (CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category)) || a.name.localeCompare(b.name));
}
