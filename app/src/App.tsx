import React, { useEffect, useState } from 'react';
import { Spinner, TopBar } from './ui';
import { ClientApp, GuestRegister } from './views/client';
import { DoorApp, WaiterApp } from './views/staff';
import { LoginView, OwnerApp } from './views/owner';
import { api } from './lib/api';

/**
 * La app única: resuelve quién eres y te lleva a tu mundo.
 *  - ?i=<token>  invitado registrándose desde su link de invitación
 *  - ?t=<token>  cliente (socio o invitado) con su QR firmado
 *  - cookie de staff  → camarero o puerta
 *  - cookie de panel  → dueño
 *  - nada             → login/registro
 */
export default function App() {
  const params = new URLSearchParams(location.search);
  const invite = params.get('i');
  const token = params.get('t');

  // El carnet se recuerda en el dispositivo: al instalar el acceso directo,
  // la app abre en /app/ sin ?t y recupera el token guardado.
  if (token) try { localStorage.setItem('micaseta_t', token); } catch {}

  if (invite) return <GuestRegister token={invite} />;
  if (token) return <ClientApp token={token} />;
  return <SessionGate />;
}

function SessionGate() {
  const [state, setState] = useState<{ kind: string; me?: any }>({ kind: 'loading' });

  const resolve = async () => {
    try {
      const staff = await api('/api/me', undefined, 'GET');
      setState({ kind: staff.role === 'puerta' ? 'door' : 'waiter', me: staff });
      return;
    } catch {}
    try {
      const owner = await api('/papi/me', undefined, 'GET');
      setState({ kind: 'owner', me: owner });
      return;
    } catch {}
    // Sin sesión: si este dispositivo guardó un carnet, ábrelo
    try {
      const stored = localStorage.getItem('micaseta_t');
      if (stored) { setState({ kind: 'client', me: stored }); return; }
    } catch {}
    setState({ kind: 'login' });
  };
  useEffect(() => { resolve(); }, []);

  if (state.kind === 'loading') return <><TopBar /><Spinner /></>;
  if (state.kind === 'client') return <ClientApp token={state.me} />;
  if (state.kind === 'waiter') return <WaiterApp me={state.me} />;
  if (state.kind === 'door') return <DoorApp me={state.me} />;
  if (state.kind === 'owner') return (
    <OwnerApp me={state.me} onLogout={async () => { await api('/papi/logout', {}); setState({ kind: 'login' }); }} />
  );
  return <LoginView onDone={resolve} />;
}
