import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, ScanLine } from '../components/icons';
import { api, eur } from '../lib/api';
import { Button, Card, CardBody, Chip, Dock, Empty, Kick, Page, SalirBtn, Spinner, cn } from '../ui';
import { Carta, CartBar, PersonCard, Scanner, Veredicto } from '../components';
import { FadeView } from '../components/fx';

/** Cabecera de la herramienta del equipo: qué eres, quién eres, y Salir. */
function Cabecera({ titulo, sub, onLogout }: { titulo: string; sub: string; onLogout: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-1 pt-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-black leading-[1.05] tracking-[-.035em]">{titulo}</h1>
        <p className="mt-1 truncate text-[15px] font-semibold text-muted-foreground">{sub}</p>
      </div>
      <SalirBtn onClick={onLogout} />
    </div>
  );
}

/** Barra: la cola de pedidos del móvil y la comanda con escáner, en dos pestañas con nombre. */
export function WaiterApp({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [tab, setTab] = useState('pedidos');
  const [n, setN] = useState<number>(0);
  return (
    <>
      <Page className="pt-0">
        <Cabecera titulo={tab === 'pedidos' ? 'Pedidos' : 'Comanda'} sub={`${me.name} · Barra`} onLogout={onLogout} />
        <div className="mt-4">
          <FadeView id={tab}>
            {tab === 'pedidos' && <Pedidos onCount={setN} />}
            {tab === 'comanda' && <Comanda />}
          </FadeView>
        </div>
      </Page>
      <Dock tab={tab} onTab={setTab} tabs={[
        { id: 'pedidos', label: n ? `Pedidos · ${n}` : 'Pedidos', icon: <ClipboardList size={26} /> },
        { id: 'comanda', label: 'Comanda', icon: <ScanLine size={26} /> },
      ]} />
    </>
  );
}

function Pedidos({ onCount }: { onCount: (n: number) => void }) {
  const [list, setList] = useState<any[] | null>(null);
  const load = () => api('/api/pedidos', undefined, 'GET').then((l) => { setList(l); onCount(l.length); }).catch(() => {});
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  if (!list) return <Spinner />;
  if (list.length === 0) return (
    <div className="mt-12 text-center">
      <p className="text-[19px] font-extrabold tracking-tight">No hay pedidos en cola</p>
      <p className="mx-auto mt-2 max-w-[290px] text-[15px] leading-relaxed text-muted-foreground">Los que envíen los clientes desde su móvil saldrán aquí con su número.</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {list.map((o) => {
        const lista = o.status === 'lista';
        return (
          <Card key={o.id} className={cn(lista && 'ring-2 ring-success')}>
            <CardBody className="flex items-center gap-4 p-4">
              <span className={cn('grid h-16 min-w-16 flex-shrink-0 place-items-center rounded-2xl px-2 text-[28px] font-black tabular-nums',
                lista ? 'bg-success text-white' : 'bg-foreground text-white')}>{o.pickup_number ?? '·'}</span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[18px] font-extrabold tracking-tight">{o.customer_name ?? 'Cliente'}</b>
                <span className="mt-0.5 block text-[15px] font-semibold leading-snug">{o.items}</span>
                <small className="mt-0.5 block text-[14px] text-muted-foreground">
                  {eur(o.total_cents)}{o.socio_name && o.socio_name !== o.customer_name ? ` · a cuenta de ${o.socio_name}` : ''}
                  {lista ? ' · en pantalla' : ''}
                </small>
              </div>
            </CardBody>
            <button className={cn('flex h-14 w-full items-center justify-center gap-2 border-t border-border text-[17px] font-extrabold transition-all active:brightness-95',
              lista ? 'bg-success/[.12] text-success' : 'bg-primary/[.12] text-primary')}
              onClick={async (e: any) => {
                e.currentTarget.disabled = true;
                try { await api(`/api/pedidos/${o.id}/${lista ? 'servir' : 'listo'}`, {}); load(); } catch { e.currentTarget.disabled = false; }
              }}>
              <CheckCircle2 size={22} /> {lista ? 'Entregado' : 'Está listo: avisar'}
            </button>
          </Card>
        );
      })}
    </div>
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
      <CheckCircle2 size={64} className="mx-auto text-success" />
      <div className="mt-4 text-[40px] font-black leading-none tracking-tight tabular-nums">{eur(done.totalCents)}</div>
      <p className="mt-3 text-[16px] font-semibold text-muted-foreground">Apuntado a la cuenta de <b className="text-foreground">{done.socioName ?? 'socio'}</b></p>
      <Button className="mt-8 w-full" size="lg" onClick={() => setDone(null)}>Siguiente cliente</Button>
    </CardBody></Card>
  );

  if (!current) return <Scanner onScan={onScan} hint="Escanea el pase del cliente: verás quién es y cuánto le queda antes de apuntar." />;

  const info = current.info;
  return (
    <>
      <Card><CardBody>
        <PersonCard info={info} />
        {info.remainingCents !== null && info.remainingCents !== undefined && info.ok && (
          <div className="mt-4 flex items-baseline justify-between rounded-xl bg-secondary/70 px-4 py-3">
            <span className="text-[15px] font-bold text-muted-foreground">Le queda</span>
            <b className="text-[20px] font-black tabular-nums">{eur(info.remainingCents)} <span className="text-[14px] font-bold text-muted-foreground">de {eur(info.spendLimitCents)}</span></b>
          </div>
        )}
        <Button variant="outline" className="mt-4 w-full" onClick={() => setCurrent(null)}>Escanear otro</Button>
      </CardBody></Card>
      {info.ok && (
        <>
          <div className="mt-4 px-1"><Carta products={products} qty={qty} setQty={setQty} /></div>
          <CartBar products={products} qty={qty} label="Apuntar a su cuenta" onSend={finish} err={err} busy={busy} />
        </>
      )}
    </>
  );
}

/** Puerta: escanear → veredicto a pantalla completa (verde pasa / rojo no) → registrar entrada. */
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
  const otro = () => { setCurrent(null); setMsg(null); };

  const tint = current
    ? current.info.ok
      ? 'radial-gradient(120% 70% at 50% -10%, rgba(15,163,107,.14), transparent 65%)'
      : 'radial-gradient(120% 70% at 50% -10%, rgba(255,93,104,.14), transparent 65%)'
    : undefined;

  return (
    <>
      {tint && <div className="pointer-events-none fixed inset-0 z-0" style={{ background: tint }} />}
      <Page className="pb-10 pt-0">
        <Cabecera titulo="Puerta" sub={`${me.name}`} onLogout={onLogout} />
        <div className="mt-4">
          {!current && <>
            <Scanner onScan={onScan} hint="Escanea el pase, mira que la foto sea la persona y registra la entrada." />
            {historial.length > 0 && <Ultimas historial={historial} />}
          </>}
          {current && (
            <FadeView id={String(current.qr)}>
              <Veredicto info={current.info} />
              {current.info.ok && !msg?.ok && (
                <Button variant="success" size="lg" className="mt-6 h-16 w-full text-[19px]" onClick={async () => {
                  try {
                    const r = await api('/api/checkin', { qr: current.qr });
                    setMsg({ ok: true, text: 'Entrada registrada: ' + r.name });
                    setHistorial((h) => [{ name: r.name, ok: true, hora: hora() }, ...h].slice(0, 8));
                  } catch (e: any) { setMsg({ ok: false, text: e.message }); }
                }}>Registrar entrada</Button>
              )}
              {msg && <p className={cn('mt-4 text-center text-[17px] font-bold', msg.ok ? 'text-success' : 'text-destructive')}>{msg.text}</p>}
              <Button variant={current.info.ok && !msg?.ok ? 'ghost' : 'outline'} size="lg" className="mt-3 w-full" onClick={otro}>
                <ScanLine size={22} /> Escanear otro
              </Button>
              {!current.info.ok && (
                <Card className="mt-4"><CardBody className="py-4">
                  <b className="block text-[16px] font-extrabold tracking-tight">¿Es un error?</b>
                  <small className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">Que el socio le reenvíe la invitación desde su app; el pase nuevo llega al momento.</small>
                </CardBody></Card>
              )}
              {historial.length > 0 && <Ultimas historial={historial} />}
            </FadeView>
          )}
        </div>
      </Page>
    </>
  );
}

const Ultimas = ({ historial }: { historial: { name: string; ok: boolean; hora: string; motivo?: string }[] }) => (
  <Card className="mt-4"><CardBody>
    <Kick>Últimas entradas</Kick>
    {historial.map((h, i) => (
      <div key={i} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[16px] font-extrabold">{h.name}</b>
          <small className="text-[14px] text-muted-foreground">{h.hora}{h.motivo ? ` · ${h.motivo}` : ''}</small>
        </div>
        <Chip tone={h.ok ? 'ok' : 'bad'}>{h.ok ? 'Entró' : 'Rechazado'}</Chip>
      </div>
    ))}
  </CardBody></Card>
);
