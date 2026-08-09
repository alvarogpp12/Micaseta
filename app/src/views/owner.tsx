import React, { useEffect, useState } from 'react';
import { BarChart3, Users, Ticket, BadgeCheck } from 'lucide-react';
import { api, eur, fmtFecha } from '../lib/api';
import { Avatar, BottomNav, Button, Card, CardBody, Chip, Empty, Err, Input, KPI, Label, Modal, Page, Spinner, TopBar } from '../ui';
import { ShareModal } from '../components';
import { FadeView } from '../components/fx';
import { toast } from 'sonner';
import { ClientApp } from './client';

/**
 * El dueño ES un socio: su app es LA app (Mi QR · Pedir · Gastos · Invitar)
 * con una única pestaña extra de gestión. Nada duplicado, ningún portal.
 */
export function OwnerApp({ me, onLogout }: { me: any; onLogout: () => void }) {
  if (!me.qrToken) return <Spinner />;
  return (
    <ClientApp
      token={me.qrToken}
      topRight={<button className="rounded-full bg-secondary px-3.5 py-1.5 text-[12px] font-bold text-muted-foreground" onClick={onLogout}>Salir</button>}
      extra={{
        id: 'caseta',
        label: 'Caseta',
        icon: <BarChart3 size={21} />,
        content: <Gestion />,
      }}
    />
  );
}

/** La gestión completa en una sola pestaña: caja, socios y equipo. */
function Gestion() {
  return (
    <>
      <Resumen />
      <div className="mt-8"><Socios /></div>
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
      <div className="pt-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[.24em] text-muted-foreground">Caja de hoy</p>
        <div className="mt-1 flex items-baseline gap-3">
          <b className="text-[56px] font-black leading-none tracking-tighter tabular-nums">{eur(o.hoy.total)}</b>
        </div>
        <div className="mt-5 flex border-t border-border">
          {[[o.entradas, 'Entradas'], [eur(o.pendienteCents), 'Pendiente'], [`${o.counts.socios} · ${o.counts.invitados}`, 'Socios · Inv.']].map(([v, l], i) => (
            <div key={l as string} className={i ? 'flex-1 border-l border-border pl-4 pt-4' : 'flex-1 pt-4'}>
              <b className="block text-[21px] font-black tracking-tight tabular-nums">{v}</b>
              <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <h3 className="mb-2 mt-7 text-[13px] font-extrabold tracking-tight">Cuentas por socio</h3>
      <Card><CardBody>
        {o.cuentas.length === 0 && <Empty>Aún no hay consumo registrado. Da de alta socios y comparte su app.</Empty>}
        {o.cuentas.map((c: any) => (
          <div key={c.socio_id} className="flex flex-wrap items-center gap-2.5 border-b border-border py-3 last:border-0">
            <Avatar name={c.socio_name} />
            <div className="min-w-[110px] flex-1">
              <b className="block truncate text-[14.5px]">{c.socio_name ?? 'Socio'}</b>
              <small className="text-muted-foreground">{c.n_orders} comandas · total {eur(c.total_cents)}</small>
            </div>
            <span className="font-bold">{eur(c.pending_cents)}</span>
            <Button variant="outline" size="sm" onClick={async () => setDetalle({ name: c.socio_name, rows: await api(`/papi/cuentas/${c.socio_id}`, undefined, 'GET') })}>Ver</Button>
            {c.pending_cents > 0 && (
              <Button variant="success" size="sm" onClick={async () => {
                if (!confirm(`¿Marcar como pagada la cuenta de ${c.socio_name} (${eur(c.pending_cents)})?`)) return;
                await api(`/papi/cuentas/${c.socio_id}/liquidar`, {});
                toast(`Cuenta de ${c.socio_name} liquidada`);
                load();
              }}>Liquidar</Button>
            )}
          </div>
        ))}
      </CardBody></Card>
      <Modal open={!!detalle} onClose={() => setDetalle(null)}>
        <h2 className="text-lg font-bold">Cuenta de {detalle?.name}</h2>
        <div className="mt-2 max-h-[55vh] overflow-y-auto">
          {detalle?.rows.length === 0 && <Empty>Sin comandas.</Empty>}
          {detalle?.rows.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 border-b border-border py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px]">{d.customer_name}{d.es_socio ? ' (socio)' : ''}</b>
                <small className="text-muted-foreground">{fmtFecha(d.created_at)}</small>
              </div>
              <Chip tone={d.settled ? 'ok' : 'muted'}>{d.settled ? 'liquidada' : 'pendiente'}</Chip>
              <span className="text-sm font-bold">{eur(d.total_cents)}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setDetalle(null)}>Cerrar</Button>
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
      <Card><CardBody>
        <h3 className="text-base font-bold">Nuevo socio</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div><Label>Nombre</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" /></div>
          <div><Label>Móvil</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></div>
        </div>
        <Button className="mt-4 w-full" onClick={async () => {
          setErr('');
          try { await api('/papi/socios', form); setForm({ name: '', phone: '' }); load(); } catch (e: any) { setErr(e.message); }
        }}>Dar de alta</Button>
        <Err>{err}</Err>
      </CardBody></Card>
      <h3 className="mb-2 mt-5 text-sm font-bold text-foreground/80">Socios · {socios.length}</h3>
      <Card><CardBody>
        {socios.length === 0 && <Empty>Todavía no hay socios.</Empty>}
        {socios.map((s: any) => {
          const susp = s.status === 'suspendido';
          const url = s.qrToken ? location.origin + '/app/?t=' + encodeURIComponent(s.qrToken) : null;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-2.5 border-b border-border py-3 last:border-0">
              <Avatar name={s.name} />
              <div className="min-w-[110px] flex-1">
                <b className="block truncate text-[14.5px]">{s.name}</b>
                <small className="text-muted-foreground">{String(s.phone).startsWith('admin-') ? 'Administrador' : '+' + s.phone}</small>
              </div>
              <Chip tone={susp ? 'bad' : 'ok'}>{susp ? 'suspendido' : 'activo'}</Chip>
              {url && !String(s.phone).startsWith('admin-') && <Button variant="secondary" size="sm" onClick={() => setShare({
                title: `App de ${s.name}`, url,
                text: 'Tu acceso de socio a la caseta. Dentro tienes tu QR, pedir desde el móvil, tus gastos y tus invitaciones: ' + url,
                phone: s.phone,
                note: 'Su app personal: QR, pedir, gastos e invitar. Envíasela una sola vez.',
              })}>Enviar</Button>}
              <Button variant="outline" size="sm" onClick={async () => { await api(`/papi/socios/${s.id}/suspender`, {}); load(); }}>{susp ? 'Activar' : 'Baja'}</Button>
            </div>
          );
        })}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})} />
    </>
  );
}

function Equipo() {
  const [staff, setStaff] = useState<any[] | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', role: 'mesero' });
  const [err, setErr] = useState('');
  const [share, setShare] = useState<any>(null);
  const load = () => api('/papi/staff', undefined, 'GET').then(setStaff).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!staff) return <Spinner />;
  return (
    <>
      <Card><CardBody>
        <h3 className="text-base font-bold">Nuevo miembro del equipo</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div><Label>Nombre</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Pepe Ruiz" /></div>
          <div><Label>Móvil</Label><Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="622 222 222" inputMode="tel" /></div>
        </div>
        <Label>Puesto</Label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="h-11 w-full rounded-lg border border-input bg-card px-3">
          <option value="mesero">Camarero — comandas</option>
          <option value="puerta">Puerta — entradas</option>
        </select>
        <Button className="mt-4 w-full" onClick={async () => {
          setErr('');
          try {
            const r = await api('/papi/staff', form);
            setForm({ name: '', phone: '', role: 'mesero' }); load();
            setShare({ title: 'Alta completada', text: 'Tu acceso a la caseta: ' + r.loginUrl, url: r.loginUrl, phone: form.phone, note: 'Envíale su enlace: le abre directamente su herramienta, sin instalar nada.' });
          } catch (e: any) { setErr(e.message); }
        }}>Dar de alta</Button>
        <Err>{err}</Err>
      </CardBody></Card>
      <h3 className="mb-2 mt-5 text-sm font-bold text-foreground/80">Equipo · {staff.length}</h3>
      <Card><CardBody>
        {staff.length === 0 && <Empty>Nadie todavía.</Empty>}
        {staff.map((s: any) => {
          const susp = s.status === 'suspendido';
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-2.5 border-b border-border py-3 last:border-0">
              <Avatar name={s.name} />
              <div className="min-w-[110px] flex-1">
                <b className="block truncate text-[14.5px]">{s.name}</b>
                <small className="text-muted-foreground">{s.role === 'puerta' ? 'Puerta' : 'Camarero'} · +{s.phone}</small>
              </div>
              {s.loginUrl && <Button variant="secondary" size="sm" onClick={() => setShare({ title: `Acceso de ${s.name}`, text: 'Tu acceso a la caseta: ' + s.loginUrl, url: s.loginUrl, phone: s.phone })}>Acceso</Button>}
              <Button variant="outline" size="sm" onClick={async () => { await api(`/papi/socios/${s.id}/suspender`, {}); load(); }}>{susp ? 'Activar' : 'Baja'}</Button>
            </div>
          );
        })}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})} />
    </>
  );
}

/** Login/registro del dueño: email+contraseña o Google. */
export function LoginView({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'gcaseta'>('login');
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
      else await api('/papi/google', { credential: gCred.current, casetaName: form.casetaName });
      onDone();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <TopBar />
      <Page className="pt-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">{mode === 'register' ? 'Crea tu caseta' : mode === 'gcaseta' ? 'Ya casi está' : 'Entra en tu caseta'}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === 'gcaseta' ? `Hola, ${gName}. Ponle nombre a tu caseta y listo.` : 'Socios, invitados con QR y comandas a cuenta. Todo desde el móvil.'}
          </p>
        </div>
        <Card><CardBody className="p-5">
          {mode !== 'gcaseta' && <div ref={gBtn} className="mb-1 flex justify-center" />}
          {mode === 'register' && (<>
            <Label>Nombre de la caseta</Label><Input value={form.casetaName} onChange={(e: any) => setForm({ ...form, casetaName: e.target.value })} placeholder="Er Compás" />
            <Label>Tu nombre</Label><Input value={form.ownerName} onChange={(e: any) => setForm({ ...form, ownerName: e.target.value })} placeholder="Álvaro García" />
          </>)}
          {mode === 'gcaseta' ? (<>
            <Label>Nombre de tu caseta</Label><Input value={form.casetaName} onChange={(e: any) => setForm({ ...form, casetaName: e.target.value })} placeholder="Er Compás" />
          </>) : (<>
            <Label>Email</Label><Input type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder="tu@email.com" />
            <Label>Contraseña</Label><Input type="password" value={form.password} onChange={(e: any) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : ''} />
          </>)}
          <Button className="mt-5 w-full" size="lg" onClick={submit}>{mode === 'login' ? 'Entrar' : 'Crear caseta'}</Button>
          <Err>{err}</Err>
          {mode !== 'gcaseta' && (
            <p className="mt-4 text-center text-[13.5px] text-muted-foreground">
              {mode === 'login' ? <>¿Primera vez? <button className="font-bold text-primary" onClick={() => setMode('register')}>Registra tu caseta</button></>
                : <>¿Ya tienes cuenta? <button className="font-bold text-primary" onClick={() => setMode('login')}>Entra</button></>}
            </p>
          )}
        </CardBody></Card>
        {demo && (
          <Card className="mt-4"><CardBody className="text-center">
            <p className="mb-3 text-[13px] text-muted-foreground">¿Solo quieres verlo? Prueba la caseta demo.</p>
            <div className="flex justify-center gap-2.5">
              <a href="/demo/camarero"><Button variant="outline" size="sm">Como camarero</Button></a>
              <a href="/demo/puerta"><Button variant="outline" size="sm">Como puerta</Button></a>
            </div>
          </CardBody></Card>
        )}
      </Page>
    </>
  );
}
