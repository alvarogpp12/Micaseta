import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from '../components/icons';
import { api, eur } from '../lib/api';
import { Button, Card, CardBody, Chip, Empty, Kick, Page, SalirBtn, Spinner, TopBar, cn } from '../ui';
import { Carta, CartBar, PersonCard, Scanner, Veredicto } from '../components';
import { FadeView } from '../components/fx';


/** Camarero: cola de turnos + comanda en barra, con tabs superiores propias. */
export function WaiterApp({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [tab, setTab] = useState('pedidos');
  const [n, setN] = useState<number | null>(null);
  return (
    <>
      <TopBar title={`${me.name} · Barra`} right={<SalirBtn onClick={onLogout} />} />
      <Page className="pb-10">
        <div className="mb-3.5 flex rounded-lg bg-secondary p-[3px]">
          {([['pedidos', `Pedidos${n ? ` · ${n}` : ''}`], ['comanda', 'Comanda']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex-1 rounded-[10px] py-2.5 text-[13px] font-bold transition-colors',
                tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{label}</button>
          ))}
        </div>
        <FadeView id={tab}>
          {tab === 'pedidos' && <Pedidos onCount={setN} />}
          {tab === 'comanda' && <Comanda />}
        </FadeView>
      </Page>
    </>
  );
}

function Pedidos({ onCount }: { onCount: (n: number) => void }) {
  const [list, setList] = useState<any[] | null>(null);
  const load = () => api('/api/pedidos', undefined, 'GET').then((l) => { setList(l); onCount(l.length); }).catch(() => {});
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  if (!list) return <Spinner />;
  return (
    <Card><CardBody>
      {list.length === 0 && <Empty>No hay pedidos en cola. Los que envíen los clientes desde su móvil saldrán aquí.</Empty>}
      {list.map((o) => {
        const lista = o.status === 'lista';
        return (
          <div key={o.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
            <span className={cn('grid h-[52px] min-w-[52px] flex-shrink-0 place-items-center rounded-lg px-1.5 text-[20px] font-black tabular-nums',
              lista ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-foreground')}>{o.pickup_number ?? '·'}</span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[14px] font-extrabold">{o.customer_name ?? 'Cliente'}</b>
              <small className="block text-[11.5px] leading-snug text-muted-foreground">
                {o.items} · {eur(o.total_cents)}
                {o.socio_name && o.socio_name !== o.customer_name ? ` · cta. ${o.socio_name}` : ''}
              </small>
              {lista && <small className="block text-[11.5px] font-bold text-success">● En pantalla</small>}
            </div>
            <button className={cn('min-h-[40px] whitespace-nowrap rounded-lg px-4 text-[12.5px] font-extrabold transition-all active:scale-[.97]',
              lista ? 'bg-success text-success-foreground' : 'bg-primary/[.16] text-primary')}
              onClick={async (e: any) => {
                e.target.disabled = true;
                try { await api(`/api/pedidos/${o.id}/${lista ? 'servir' : 'listo'}`, {}); load(); } catch { e.target.disabled = false; }
              }}>{lista ? 'Entregado' : 'Listo'}</button>
          </div>
        );
      })}
    </CardBody></Card>
  );
}

function Comanda() {
  const [products, setProducts] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [done, setDone] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/products', undefined, 'GET').then(setProducts).catch(() => {}); }, []);

  const onScan = async (qr: string) => {
    try {
      const info = await api('/api/scan', { qr });
      setCurrent({ qr, info }); setQty({}); setDone(null); setErr('');
    } catch (e: any) {
      setCurrent({ qr, info: { name: 'Pase rechazado', ok: false, reason: e.message } });
    }
  };
  const finish = async () => {
    const items = Object.entries(qty).filter(([, q]) => (q as number) > 0).map(([productId, q]) => ({ productId: Number(productId), qty: q }));
    if (!items.length) return;
    setBusy(true); setErr('');
    try {
      const r = await api('/api/orders', { qr: current.qr, items });
      setDone(r); setCurrent(null); setQty({});
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (done) return (
    <Card><CardBody className="py-10 text-center">
      <CheckCircle2 size={44} className="mx-auto text-success" />
      <div className="mt-3 text-2xl font-black tracking-tight tabular-nums">{eur(done.totalCents)}</div>
      <p className="mt-1 text-sm text-muted-foreground">cargados a la cuenta de {done.socioName ?? 'socio'} · comanda #{done.orderId}</p>
      <Button className="mt-6 w-full" onClick={() => setDone(null)}>Escanear otro</Button>
    </CardBody></Card>
  );

  if (!current) return <Scanner onScan={onScan} hint="Escanea el pase del cliente: verás su ficha y su límite antes de picar." />;

  const info = current.info;
  return (
    <>
      <Card><CardBody>
        <PersonCard info={info} />
        {info.remainingCents !== null && info.remainingCents !== undefined && info.ok && (
          <div className="mt-3 rounded-lg bg-secondary/70 px-3 py-2 text-[13px] font-semibold text-muted-foreground">
            Disponible: <b className="text-foreground">{eur(info.remainingCents)}</b> de {eur(info.spendLimitCents)}
          </div>
        )}
        <Button variant="outline" className="mt-3 w-full" onClick={() => setCurrent(null)}>Escanear otro</Button>
      </CardBody></Card>
      {info.ok && (
        <>
          <div className="mt-3 px-1.5"><Carta products={products} qty={qty} setQty={setQty} /></div>
          <CartBar products={products} qty={qty} label="Finalizar comanda" onSend={finish} err={err} busy={busy} />
        </>
      )}
    </>
  );
}

/** Puerta: escáner → veredicto a pantalla completa (verde acceso / rojo rechazo). */
export function DoorApp({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [current, setCurrent] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [historial, setHistorial] = useState<{ name: string; ok: boolean; hora: string; motivo?: string }[]>([]);

  const hora = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const onScan = async (qr: string) => {
    setMsg(null);
    try {
      const info = await api('/api/scan', { qr });
      setCurrent({ qr, info });
      if (!info.ok) setHistorial((h) => [{ name: info.name ?? 'Pase rechazado', ok: false, hora: hora(), motivo: info.reason }, ...h].slice(0, 8));
    } catch (e: any) {
      setCurrent({ qr, info: { name: 'Pase rechazado', ok: false, reason: e.message } });
      setHistorial((h) => [{ name: 'Pase rechazado', ok: false, hora: hora(), motivo: e.message }, ...h].slice(0, 8));
    }
  };

  const tint = current
    ? current.info.ok
      ? 'radial-gradient(120% 70% at 50% -10%, rgba(15,163,107,.12), transparent 65%)'
      : 'radial-gradient(120% 70% at 50% -10%, rgba(255,93,104,.12), transparent 65%)'
    : undefined;

  return (
    <>
      {tint && <div className="pointer-events-none fixed inset-0 z-0" style={{ background: tint }} />}
      <TopBar title={`${me.name} · Puerta`} right={<SalirBtn onClick={onLogout} />} />
      <Page className="pb-10">
        {!current && <>
          <Scanner onScan={onScan} hint="Escanea el pase, comprueba la foto y registra la entrada." />
          {historial.length > 0 && <Ultimas historial={historial} />}
        </>}
        {current && (
          <FadeView id={String(current.qr)}>
            <Veredicto info={current.info} />
            {current.info.ok && !msg?.ok && (
              <Button variant="success" className="mt-6 h-14 w-full" onClick={async () => {
                try {
                  const r = await api('/api/checkin', { qr: current.qr });
                  setMsg({ ok: true, text: 'Entrada registrada: ' + r.name });
                  setHistorial((h) => [{ name: r.name, ok: true, hora: hora() }, ...h].slice(0, 8));
                } catch (e: any) { setMsg({ ok: false, text: e.message }); }
              }}>Registrar entrada</Button>
            )}
            {msg && <p className={cn('mt-3 text-center text-sm font-bold', msg.ok ? 'text-success' : 'text-destructive')}>{msg.text}</p>}
            {current.info.ok ? (
              <p className="mt-1 text-center">
                <button className="px-4 py-3 text-[13px] font-bold text-muted-foreground" onClick={() => { setCurrent(null); setMsg(null); }}>Escanear otro</button>
              </p>
            ) : (
              <>
                <Button variant="outline" className="mt-6 h-14 w-full" onClick={() => { setCurrent(null); setMsg(null); }}>Escanear otro</Button>
                <Card className="mt-4"><CardBody className="py-4">
                  <b className="block text-[14px] font-extrabold tracking-tight">¿Es un error?</b>
                  <small className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">Pide al socio que reenvíe la invitación desde su app; el pase nuevo llega al momento.</small>
                </CardBody></Card>
              </>
            )}
            {historial.length > 0 && <Ultimas historial={historial} />}
          </FadeView>
        )}
      </Page>
    </>
  );
}

const Ultimas = ({ historial }: { historial: { name: string; ok: boolean; hora: string; motivo?: string }[] }) => (
  <Card className="mt-4"><CardBody>
    <Kick>Últimas entradas</Kick>
    {historial.map((h, i) => (
      <div key={i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] font-extrabold">{h.name}</b>
          <small className="text-[11.5px] text-muted-foreground">{h.hora}{h.motivo ? ` · ${h.motivo}` : ''}</small>
        </div>
        <Chip tone={h.ok ? 'ok' : 'bad'}>{h.ok ? 'OK' : 'Rechazado'}</Chip>
      </div>
    ))}
  </CardBody></Card>
);
