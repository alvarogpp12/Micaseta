import React, { useEffect, useState } from 'react';
import { api, eur, fmtFecha, fmtPhone } from '../lib/api';
import { Avatar, Button, Card, CardBody, Chip, Empty, Err, Input, Kick, Label, LinkBtn, Modal, Page, Spinner, Stats, Titulo, TopBar, cn } from '../ui';
import { ShareModal } from '../components';
import { toast } from 'sonner';
import { ClientApp } from './client';

/**
 * El dueño ES un socio: su app es LA app (dashboard de dos estados) con la
 * gestión del club como módulo extra que se abre desde Inicio.
 */
export function OwnerApp({ me, onLogout }: { me: any; onLogout: () => void }) {
  if (!me.qrToken) return <Spinner />;
  return (
    <ClientApp
      token={me.qrToken}
      onExit={onLogout}
      extra={{ id: 'club', label: 'Mi caseta', content: <Gestion /> }}
    />
  );
}

/** La gestión completa: aforo en vivo, caja, cuentas, socios y equipo. */
function Gestion() {
  return (
    <>
      <Titulo sub="Cuánta gente hay, la caja de hoy y las cuentas de los socios.">Mi caseta</Titulo>
      <Resumen />
      <div className="mt-8"><Socios /></div>
      <div className="mt-8"><DiasFeriaCaseta /></div>
      <div className="mt-8"><Equipo /></div>
    </>
  );
}

function Resumen() {
  const [o, setO] = useState<any>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const load = () => api('/papi/overview', undefined, 'GET').then(setO).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!o) return <Spinner />;
  return (
    <>
      <Card className="mb-3"><CardBody>
        <div className="flex items-center justify-between">
          <Kick className="mb-0">Dentro ahora</Kick>
          {o.aforo?.exacto && <Chip tone="ok">Puerta activa</Chip>}
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-[44px] font-extrabold leading-none tracking-[-.03em] tabular-nums">{o.aforo?.exacto ? '' : '~'}{o.aforo?.n ?? 0}</span>
          <span className="text-[13px] font-bold text-muted-foreground">personas</span>
        </div>
      </CardBody></Card>

      <Card className="mb-3"><div className="banda h-1" /><CardBody>
        <Kick>Caja de hoy</Kick>
        <span className="text-[36px] font-extrabold leading-none tracking-[-.03em] tabular-nums">{eur(o.hoy.total)}</span>
        <Stats items={[[o.entradas, 'Entradas'], [eur(o.pendienteCents), 'Pendiente']]} />
      </CardBody></Card>

      <Card><CardBody>
        <Kick>Cuentas por socio</Kick>
        {o.cuentas.length === 0 && <Empty>Aún no hay consumo registrado. Da de alta socios y envíales su pase.</Empty>}
        {o.cuentas.map((c: any) => (
          <button key={c.socio_id} className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-0"
            onClick={async () => setDetalle({ id: c.socio_id, name: c.socio_name, pending: c.pending_cents, rows: await api(`/papi/cuentas/${c.socio_id}`, undefined, 'GET') })}>
            <Avatar name={c.socio_name} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[14px] font-extrabold">{c.socio_name ?? 'Socio'}</b>
              <small className="text-[11.5px] text-muted-foreground">{c.n_orders} comanda{c.n_orders === 1 ? '' : 's'}</small>
            </div>
            <span className="text-[14px] font-bold tabular-nums">{eur(c.pending_cents)}</span>
          </button>
        ))}
      </CardBody></Card>

      <Modal open={!!detalle} onClose={() => setDetalle(null)}>
        <h2 className="text-lg font-extrabold tracking-tight">Cuenta de {detalle?.name}</h2>
        <div className="mt-2 max-h-[55vh] overflow-y-auto">
          {detalle?.rows.length === 0 && <Empty>Sin comandas.</Empty>}
          {detalle?.rows.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 border-b border-border py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px]">{d.customer_name}{d.es_socio ? ' (socio)' : ''}</b>
                <small className="text-muted-foreground">{fmtFecha(d.created_at)}</small>
              </div>
              <Chip tone={d.settled ? 'ok' : 'muted'}>{d.settled ? 'Liquidada' : 'Pendiente'}</Chip>
              <span className="text-sm font-bold tabular-nums">{eur(d.total_cents)}</span>
            </div>
          ))}
        </div>
        {detalle?.pending > 0 && (
          <Button className="mt-4 w-full" onClick={async () => {
            if (!confirm(`¿Marcar como pagada la cuenta de ${detalle.name} (${eur(detalle.pending)})?`)) return;
            await api(`/papi/cuentas/${detalle.id}/liquidar`, {});
            toast(`Cuenta de ${detalle.name} liquidada`);
            setDetalle(null);
            load();
          }}>Marcar como pagada · {eur(detalle.pending)}</Button>
        )}
        <Button variant="ghost" className="mt-2.5 w-full" onClick={() => setDetalle(null)}>Cerrar</Button>
      </Modal>
    </>
  );
}

function Socios() {
  const [socios, setSocios] = useState<any[] | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [err, setErr] = useState('');
  const [share, setShare] = useState<any>(null);
  const load = () => api('/papi/socios', undefined, 'GET').then(setSocios).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!socios) return <Spinner />;
  return (
    <>
      <Card className="mb-3"><CardBody>
        <Kick>Nuevo socio</Kick>
        <div className="grid grid-cols-2 gap-2.5">
          <div><Label className="mt-0">Nombre</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" /></div>
          <div><Label className="mt-0">Móvil</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></div>
        </div>
        <Button className="mt-4 w-full" onClick={async () => {
          setErr('');
          try { await api('/papi/socios', form); setForm({ name: '', phone: '' }); load(); } catch (e: any) { setErr(e.message); }
        }}>Dar de alta</Button>
        <Err>{err}</Err>
      </CardBody></Card>
      <Card><CardBody>
        <Kick>Socios · {socios.length}</Kick>
        {socios.length === 0 && <Empty>Todavía no hay socios.</Empty>}
        {socios.map((s: any) => {
          const susp = s.status === 'suspendido';
          const url = s.qrToken ? location.origin + '/app/?t=' + encodeURIComponent(s.qrToken) : null;
          return (
            <div key={s.id} className="border-b border-border py-3.5 last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[17px] font-extrabold tracking-tight">{s.name}</b>
                  <small className="block truncate text-[14px] text-muted-foreground">
                    {String(s.phone).startsWith('admin-') ? 'Administrador' : fmtPhone(s.phone)}
                  </small>
                </div>
                <Chip tone={susp ? 'bad' : 'ok'}>{susp ? 'Suspendido' : 'Activo'}</Chip>
              </div>
              <div className="mt-2.5 flex gap-2 pl-[56px]">
                {url && !String(s.phone).startsWith('admin-') && <LinkBtn onClick={() => setShare({
                  title: `Pase de ${s.name}`, url,
                  text: 'Tu acceso de socio a la caseta. Dentro tienes tu pase, pedir desde el móvil, tu cuenta y tus invitaciones: ' + url,
                  phone: s.phone,
                  note: 'Su app personal: pase, pedir, cuenta e invitar. Envíasela una sola vez.',
                })}>Enviar su pase ›</LinkBtn>}
                <Button variant="ghost" size="sm" className="px-3" onClick={async () => { await api(`/papi/socios/${s.id}/suspender`, {}); load(); }}>{susp ? 'Activar' : 'Dar de baja'}</Button>
              </div>
            </div>
          );
        })}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})} />
    </>
  );
}

/** Los días de feria: los que ofrece el selector al invitar "solo un día". */
function DiasFeriaCaseta() {
  const [feria, setFeria] = useState<any>(null);
  const [form, setForm] = useState({ start: '', end: '' });
  const [err, setErr] = useState('');
  const fmt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
  useEffect(() => { api('/papi/me', undefined, 'GET').then((m) => setFeria(m.feria)).catch(() => {}); }, []);
  if (!feria) return null;
  return (
    <Card><CardBody>
      <Kick>Días de feria</Kick>
      <b className="block text-[18px] font-extrabold tracking-tight">Del {fmt(feria.start)} al {fmt(feria.end)}</b>
      <small className="mt-1 block text-[14px] leading-snug text-muted-foreground">
        {feria.source === 'caseta' ? 'Los has puesto tú.' : feria.source === 'oficial' ? 'Fechas oficiales de la Feria de Abril; puedes cambiarlas.' : 'No hay fechas para este año: se ofrece la semana en curso. Ponlas aquí.'}
        {' '}Son los días que ve un socio al invitar "solo un día".
      </small>
      <div className="grid grid-cols-2 gap-2.5">
        <div><Label>Primer día</Label><Input type="date" value={form.start} onChange={(e: any) => setForm({ ...form, start: e.target.value })} /></div>
        <div><Label>Último día</Label><Input type="date" value={form.end} onChange={(e: any) => setForm({ ...form, end: e.target.value })} /></div>
      </div>
      <Button className="mt-4 w-full" disabled={!form.start || !form.end} onClick={async () => {
        setErr('');
        try { const r = await api('/papi/caseta/feria', form); setFeria(r.feria); setForm({ start: '', end: '' }); toast('Días de feria guardados'); }
        catch (e: any) { setErr(e.message); }
      }}>Guardar los días</Button>
      <Err>{err}</Err>
    </CardBody></Card>
  );
}

function Equipo() {
  const [codigo, setCodigo] = useState<{ code: string; expiresInSec: number } | null>(null);
  useEffect(() => {
    const cargar = () => api('/papi/me', undefined, 'GET').then((m) => setCodigo(m.staffCode ?? null)).catch(() => {});
    cargar();
    const id = setInterval(cargar, 60000); // el código rota cada hora: refresca la cuenta atrás
    return () => clearInterval(id);
  }, []);
  const [staff, setStaff] = useState<any[] | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', role: 'mesero' });
  const [err, setErr] = useState('');
  const [share, setShare] = useState<any>(null);
  const load = () => api('/papi/staff', undefined, 'GET').then(setStaff).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!staff) return <Spinner />;
  return (
    <>
      {codigo && (
        <Card className="mb-3"><CardBody className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-extrabold tracking-tight">Código del equipo</b>
            <small className="text-[11.5px] leading-snug text-muted-foreground">
              Entran en la app, eligen puesto y lo teclean. Por seguridad <b className="text-primary">se renueva en {Math.max(1, Math.round(codigo.expiresInSec / 60))} min</b>.
            </small>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(codigo.code); toast('Código copiado'); }}
            className="rounded-lg bg-primary/[.14] px-4 py-2.5 text-[20px] font-extrabold tabular-nums tracking-[.18em] text-primary">
            {codigo.code.slice(0, 3)} {codigo.code.slice(3)}
          </button>
        </CardBody></Card>
      )}
      <Card className="mb-3"><CardBody>
        <Kick>Nuevo miembro del equipo</Kick>
        <div className="grid grid-cols-2 gap-2.5">
          <div><Label className="mt-0">Nombre</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Pepe Ruiz" /></div>
          <div><Label className="mt-0">Móvil</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="622 222 222" inputMode="tel" /></div>
        </div>
        <Label>Puesto</Label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="h-12 w-full rounded-lg bg-secondary px-4 font-medium text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/60">
          <option value="mesero">Barra — comandas</option>
          <option value="puerta">Puerta — entradas</option>
        </select>
        <Button className="mt-4 w-full" onClick={async () => {
          setErr('');
          try {
            const r = await api('/papi/staff', form);
            setForm({ name: '', phone: '', role: 'mesero' }); load();
            setShare({ title: 'Alta completada', text: 'Tu acceso al club: ' + r.loginUrl, url: r.loginUrl, phone: form.phone, note: 'Envíale su enlace: le abre directamente su herramienta, sin instalar nada.' });
          } catch (e: any) { setErr(e.message); }
        }}>Dar de alta</Button>
        <Err>{err}</Err>
      </CardBody></Card>
      <Card><CardBody>
        <Kick>Equipo · {staff.length}</Kick>
        {staff.length === 0 && <Empty>Nadie todavía.</Empty>}
        {staff.map((s: any) => {
          const susp = s.status === 'suspendido';
          return (
            <div key={s.id} className="border-b border-border py-3.5 last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[17px] font-extrabold tracking-tight">{s.name}</b>
                  <small className="block truncate text-[14px] text-muted-foreground">{s.role === 'puerta' ? 'Puerta' : 'Barra'} · {fmtPhone(s.phone)}</small>
                </div>
                <Chip tone={susp ? 'bad' : 'ok'}>{susp ? 'Sin acceso' : 'Con acceso'}</Chip>
              </div>
              <div className="mt-2.5 flex gap-2 pl-[56px]">
                {s.loginUrl && !susp && <LinkBtn onClick={() => setShare({ title: `Acceso de ${s.name}`, text: 'Tu acceso a la caseta: ' + s.loginUrl, url: s.loginUrl, phone: s.phone })}>Enviar acceso ›</LinkBtn>}
                <Button variant="ghost" size="sm" className="px-3" onClick={async () => { await api(`/papi/socios/${s.id}/suspender`, {}); load(); }}>{susp ? 'Dar acceso' : 'Quitar acceso'}</Button>
              </div>
            </div>
          );
        })}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})} />
    </>
  );
}

/** Acceso: login del responsable + alta del equipo + demo, como módulos. */
export function LoginView({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'gcaseta' | 'staff'>('login');
  const [staffRole, setStaffRole] = useState<'mesero' | 'puerta'>('mesero');
  const [staff, setStaff] = useState({ name: '', phone: '', code: '' });
  const [form, setForm] = useState({ casetaName: '', ownerName: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [gName, setGName] = useState('');
  const gCred = React.useRef<string | null>(null);
  const gBtn = React.useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    api('/gapi/config', undefined, 'GET').then((cfg) => {
      setDemo(!!cfg.demo);
      if (!cfg.googleClientId) return;
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => {
        (window as any).google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: async (resp: any) => {
            gCred.current = resp.credential;
            try {
              const r = await api('/papi/google', { credential: resp.credential });
              if (r.needsCaseta) { setGName(r.name); setMode('gcaseta'); return; }
              onDone();
            } catch (e: any) { setErr(e.message); }
          },
        });
        if (gBtn.current) (window as any).google.accounts.id.renderButton(gBtn.current, { theme: 'outline', size: 'large', width: 300, text: 'continue_with', locale: 'es' });
      };
      document.head.appendChild(s);
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setErr('');
    try {
      if (mode === 'login') await api('/papi/login', { email: form.email, password: form.password });
      else if (mode === 'register') await api('/papi/register', form);
      else if (mode === 'staff') await api('/gapi/staff/alta', { ...staff, role: staffRole });
      else await api('/papi/google', { credential: gCred.current, casetaName: form.casetaName });
      onDone();
    } catch (e: any) { setErr(e.message); }
  };

  if (mode === 'staff') return (
    <>
      <TopBar />
      <Page className="pt-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Únete a tu club</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Teclea el código de 6 dígitos que te ha dado el responsable.</p>
        </div>
        <Card><CardBody className="p-5">
          <Label className="mt-0">Tu puesto</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {([['mesero', 'Barra', 'Comandas y pedidos'], ['puerta', 'Puerta', 'Control de entrada']] as const).map(([id, b, s]) => (
              <button key={id} type="button" onClick={() => setStaffRole(id)}
                className={cn('rounded-lg p-3.5 text-left transition-all', id === staffRole ? 'bg-primary/[.16] ring-2 ring-primary' : 'bg-secondary')}>
                <b className="block text-sm font-extrabold">{b}</b>
                <small className="mt-1 block text-[11.5px] leading-snug text-muted-foreground">{s}</small>
              </button>
            ))}
          </div>
          <Label>Código del club</Label>
          <Input value={staff.code} onChange={(e: any) => setStaff({ ...staff, code: e.target.value })}
            placeholder="000 000" inputMode="numeric" autoComplete="one-time-code"
            className="text-center text-[22px] font-extrabold tracking-[.3em] tabular-nums" />
          <Label>Tu nombre</Label>
          <Input value={staff.name} onChange={(e: any) => setStaff({ ...staff, name: e.target.value })} placeholder="Pepe Ruiz" />
          <Label>Tu móvil</Label>
          <Input value={staff.phone} onChange={(e: any) => setStaff({ ...staff, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" />
          <Button className="mt-5 w-full" size="lg" onClick={submit}>Entrar a trabajar</Button>
          <Err>{err}</Err>
          <p className="mt-4 text-center text-[13.5px] text-muted-foreground">
            ¿Eres el responsable? <button className="font-bold text-primary" onClick={() => setMode('login')}>Entra aquí</button>
          </p>
        </CardBody></Card>
      </Page>
    </>
  );

  return (
    <>
      <Page>
        <div className="px-1 pb-6 pt-11 text-center">
          <span className="text-[34px] font-extrabold tracking-[-.03em]">micaseta<i className="not-italic text-primary">.</i></span>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
            {mode === 'gcaseta' ? `Hola, ${gName}. Ponle nombre a tu club y listo.` : <>Tu club, sin listas en papel.<br />Socios con pase QR y comandas a cuenta.</>}
          </p>
        </div>

        {/* El pase asomando tras el módulo de login */}
        <div className="relative z-0 mx-7 -mb-3.5 overflow-hidden rounded-t-xl border border-b-0 border-papel-borde bg-papel text-tinta shadow-[0_-10px_40px_rgba(61,90,245,.1)]">
          <div className="banda h-2" />
          <div className="flex items-baseline justify-between px-4 pb-5 pt-3">
            <b className="text-[15px] font-extrabold tracking-[-.03em]">{mode === 'register' || mode === 'gcaseta' ? 'Tu club' : 'Tu pase'}</b>
            <small className="kick text-[10.5px] font-bold text-primary">micaseta</small>
          </div>
        </div>

        <Card className="relative z-10"><CardBody className="p-5">
          {mode !== 'gcaseta' && <div ref={gBtn} className="mb-1 flex justify-center empty:hidden" />}
          {mode === 'register' && (<>
            <Label className="mt-0">Nombre del club</Label><Input value={form.casetaName} onChange={(e: any) => setForm({ ...form, casetaName: e.target.value })} placeholder="Club Vela" />
            <Label>Tu nombre</Label><Input value={form.ownerName} onChange={(e: any) => setForm({ ...form, ownerName: e.target.value })} placeholder="Álvaro García" />
          </>)}
          {mode === 'gcaseta' ? (<>
            <Label className="mt-0">Nombre de tu club</Label><Input value={form.casetaName} onChange={(e: any) => setForm({ ...form, casetaName: e.target.value })} placeholder="Club Vela" />
          </>) : (<>
            <Label className="mt-0">Email</Label><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder="tu@email.com" />
            <Label>Contraseña</Label><Input type="password" value={form.password} onChange={(e: any) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : ''} />
          </>)}
          <Button className="mt-[18px] w-full" size="lg" onClick={submit}>{mode === 'login' ? 'Entrar' : 'Crear club'}</Button>
          {mode === 'login' && <Button variant="outline" className="mt-2.5 w-full" onClick={() => setMode('register')}>¿Primera vez? Registra tu club</Button>}
          {mode === 'register' && (
            <p className="mt-4 text-center text-[13.5px] text-muted-foreground">
              ¿Ya tienes cuenta? <button className="font-bold text-primary" onClick={() => setMode('login')}>Entra</button>
            </p>
          )}
          <Err>{err}</Err>
        </CardBody></Card>

        <Card className="mt-3"><CardBody className="flex items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-extrabold tracking-tight">¿Trabajas en un club?</b>
            <small className="text-[11.5px] leading-snug text-muted-foreground">Teclea el código de 6 dígitos de tu equipo y elige puesto.</small>
          </div>
          <LinkBtn onClick={() => setMode('staff')}>Unirme ›</LinkBtn>
        </CardBody></Card>
        {demo && (
          <Card className="mt-3"><CardBody className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <b className="block text-[14px] font-extrabold tracking-tight">Club demo</b>
              <small className="text-[11.5px] leading-snug text-muted-foreground">Pruébalo como camarero o como puerta, sin registro.</small>
            </div>
            <a href="/demo/camarero" className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-primary/[.14] px-3.5 text-[12.5px] font-bold text-primary">Barra ›</a>
            <a href="/demo/puerta" className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-primary/[.14] px-3.5 text-[12.5px] font-bold text-primary">Puerta ›</a>
          </CardBody></Card>
        )}
      </Page>
    </>
  );
}
