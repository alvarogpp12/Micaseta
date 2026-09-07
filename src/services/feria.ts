import type { DB } from '../db/index.js';
import type { Caseta } from '../domain/types.js';
import { todayStr } from '../domain/types.js';

/**
 * Los días de feria: la caseta puede fijarlos (Mi caseta); si no, usamos las
 * fechas oficiales conocidas de la Feria de Abril, y si tampoco hay para ese
 * año, la semana que empieza hoy. Son los días que ofrece el selector de
 * "solo un día" al invitar.
 */
const OFICIALES: Record<number, [string, string]> = {
  2025: ['2025-05-04', '2025-05-10'],
  2026: ['2026-04-19', '2026-04-25'],
};

export interface Feria { start: string; end: string; days: string[]; source: 'caseta' | 'oficial' | 'semana' }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toStr = (v: string | Date | null | undefined) => (v instanceof Date ? ymd(v) : v ? String(v).slice(0, 10) : null);

export function listDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  for (let i = 0; d <= last && i < 31; i++) { out.push(ymd(d)); d.setDate(d.getDate() + 1); }
  return out;
}

export function feriaFor(caseta: Pick<Caseta, 'feria_start' | 'feria_end'> | null, today = todayStr()): Feria {
  const cs = toStr(caseta?.feria_start), ce = toStr(caseta?.feria_end);
  if (cs && ce && cs <= ce) return { start: cs, end: ce, days: listDays(cs, ce), source: 'caseta' };
  const year = Number(today.slice(0, 4));
  // La feria de este año, o la del que viene si la de este ya pasó
  for (const y of [year, year + 1]) {
    const of = OFICIALES[y];
    if (of && of[1] >= today) return { start: of[0], end: of[1], days: listDays(of[0], of[1]), source: 'oficial' };
  }
  const end = new Date(today + 'T12:00:00'); end.setDate(end.getDate() + 6);
  return { start: today, end: ymd(end), days: listDays(today, ymd(end)), source: 'semana' };
}

export async function setFeria(db: DB, casetaId: number, start: string | null, end: string | null): Promise<void> {
  await db.query('UPDATE casetas SET feria_start = $1, feria_end = $2 WHERE id = $3', [start, end, casetaId]);
}
