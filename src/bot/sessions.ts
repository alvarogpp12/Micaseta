/**
 * Estado de conversación por teléfono (máquina de estados en memoria).
 * Si el proceso se reinicia, la gente simplemente vuelve al menú.
 */
export interface Session {
  state: string;
  data: Record<string, any>;
}

const sessions = new Map<string, Session>();

export function getSession(phone: string): Session {
  let s = sessions.get(phone);
  if (!s) {
    s = { state: 'idle', data: {} };
    sessions.set(phone, s);
  }
  return s;
}

export function clearSession(phone: string): void {
  sessions.delete(phone);
}
