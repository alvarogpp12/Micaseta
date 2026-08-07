export type Role = 'admin' | 'socio' | 'mesero' | 'puerta' | 'invitado';
export type UserStatus = 'activo' | 'pendiente' | 'suspendido';
export type InvitationStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';

export interface User {
  id: number;
  phone: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  photo: Uint8Array | null;
  qr_version: number;
  created_at: string | Date;
}

export interface Invitation {
  id: number;
  socio_id: number;
  guest_id: number | null;
  guest_phone: string;
  parent_id: number | null;
  status: InvitationStatus;
  access_mode: 'fecha' | 'siempre';
  valid_date: string | null;
  spend_limit_cents: number | null;
  max_companions: number;
  created_at: string | Date;
  cancelled_at: string | Date | null;
}

export interface Product {
  id: number;
  name: string;
  price_cents: number;
  category: string;
  active: boolean;
}

/** Resultado de comprobar acceso/consumo al escanear un QR. */
export interface AccessInfo {
  ok: boolean;
  reason: string;
  user: User;
  invitation: Invitation | null;
  hostName: string | null;
  spendLimitCents: number | null; // null = abierto
  spentCents: number;
  remainingCents: number | null; // null = abierto
}

export function euros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + '€';
}

export function parseEuros(raw: string): number | null {
  const m = raw.replace(',', '.').match(/^\s*(\d+(?:\.\d{1,2})?)\s*€?\s*$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * 100);
}

/** Fecha local YYYY-MM-DD (la vigencia de invitaciones se compara por día). */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
