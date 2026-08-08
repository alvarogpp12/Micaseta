import React, { useEffect, useState } from 'react';
import { ClipboardList, ScanLine, CheckCircle2 } from 'lucide-react';
import { api, eur } from '../lib/api';
import { BottomNav, Button, Card, CardBody, Empty, Err, Page, Spinner, TopBar, cn } from '../ui';
import { Carta, CartBar, PersonCard, Scanner } from '../components';

/** Camarero: cola de pedidos del móvil + comanda en barra con escáner. */
export function WaiterApp({ me }: { me: any }) {
  const [tab, setTab] = useState('pedidos');
  return (
    <>
      <TopBar title={`${me.name} · Camarero`} />
      <Page>
        {tab === 'pedidos' && <Pedidos />}
        {tab === 'comanda' && <Comanda />}
      </Page>
      <BottomNav tab={tab} onTab={setTab} tabs={[
        { id: 'pedidos', label: 'Pedidos', icon: <ClipboardList size={21} /> },
        { id: 'comanda', label: 'Comanda', icon: <ScanLine size={21} /> },
      ]} />
    </>
  );
}

function Pedidos() {
  const [list, setList] = useState<any[] | null>(null);
  const load = () => api('/api/pedidos', undefined, 'GET').then(setList).catch(() => {});
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  if (!list) return <Spinner />;
  return (
    <Card><CardBody>
      <h3 className="mb-1 text-sm font-bold">Pedidos desde el móvil {list.length > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{list.length}</span>}</h3>
      {list.length === 0 && <Empty>No hay pedidos en cola. Los que envíen los clientes desde su móvil saldrán aquí.</Empty>}
      {list.map((o) => {
        const lista = o.status === 'lista';
        return (
          <div key={o.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
            <span className={cn('grid h-10 min-w-10 flex-shrink-0 place-items-center rounded-lg px-1.5 text-base font-extrabold',
              lista ? 'bg-success text-success-foreground' : 'bg-muted')}>{o.pickup_number ?? '·'}</span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[14.5px]">{o.customer_name ?? 'Cliente'}</b>
              <span className="block text-[13px] leading-snug">{o.items}</span>
              <small className="text-muted-foreground">{eur(o.total_cents)} · a cuenta de {o.socio_name}{lista ? ' · en pantalla' : ''}</small>
            </div>
            <Button size="sm" variant={lista ? 'success' : 'default'} onClick={async (e: any) => {
              e.target.disabled = true;
              try { await api(`/api/pedidos/${o.id}/${lista ? 'servir' : 'listo'}`, {}); load(); } catch { e.target.disabled = false; }
            }}>{lista ? 'Entregado' : 'Listo'}</Button>
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
      setCurrent({ qr, info: { name: 'QR rechazado', ok: false, reason: e.message } });
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
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{eur(done.totalCents)}</div>
      <p className="mt-1 text-sm text-muted-foreground">cargados a la cuenta de {done.socioName ?? 'socio'} · comanda #{done.orderId}</p>
      <Button className="mt-6 w-full" onClick={() => setDone(null)}>Escanear otro</Button>
    </CardBody></Card>
  );

  if (!current) return <Scanner onScan={onScan} hint="Escanea el QR del cliente y pica su comanda." />;

  const info = current.info;
  return (
    <>
      <Card><CardBody>
        <PersonCard info={info} />
        {info.remainingCents !== null && info.remainingCents !== undefined && info.ok && (
          <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-[13px] font-semibold text-muted-foreground">
            Disponible: <b className="text-foreground">{eur(info.remainingCents)}</b> de {eur(info.spendLimitCents)}
          </div>
        )}
        <Button variant="outline" className="mt-3 w-full" onClick={() => setCurrent(null)}>Escanear otro</Button>
      </CardBody></Card>
      {info.ok && (
        <>
          <div className="mt-2"><Carta products={products} qty={qty} setQty={setQty} /></div>
          <CartBar products={products} qty={qty} label="Finalizar comanda" onSend={finish} err={err} busy={busy} />
        </>
      )}
    </>
  );
}

/** Puerta: escáner → foto grande + verde/rojo → registrar entrada. */
export function DoorApp({ me }: { me: any }) {
  const [current, setCurrent] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onScan = async (qr: string) => {
    setMsg(null);
    try { setCurrent({ qr, info: await api('/api/scan', { qr }) }); }
    catch (e: any) { setCurrent({ qr, info: { name: 'QR rechazado', ok: false, reason: e.message } }); }
  };

  return (
    <>
      <TopBar title={`${me.name} · Puerta`} />
      <Page>
        {!current && <Scanner onScan={onScan} hint="Escanea el QR, comprueba la foto y registra la entrada." />}
        {current && (
          <Card><CardBody>
            <PersonCard info={current.info} big />
            {current.info.ok && !msg?.ok && (
              <Button variant="success" className="mt-4 w-full" size="lg" onClick={async () => {
                try {
                  const r = await api('/api/checkin', { qr: current.qr });
                  setMsg({ ok: true, text: 'Entrada registrada: ' + r.name });
                } catch (e: any) { setMsg({ ok: false, text: e.message }); }
              }}>Registrar entrada</Button>
            )}
            {msg && <p className={cn('mt-3 text-center text-sm font-bold', msg.ok ? 'text-success' : 'text-destructive')}>{msg.text}</p>}
            <Button variant="outline" className="mt-3 w-full" onClick={() => { setCurrent(null); setMsg(null); }}>Escanear otro</Button>
          </CardBody></Card>
        )}
      </Page>
    </>
  );
}
