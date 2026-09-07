import React, { useEffect, useState } from 'react';
import { QrCode, Beer, Wallet, UserPlus, Camera, Ticket, ChevronRight } from '../components/icons';
import { api, eur, fmtFecha } from '../lib/api';
import { Avatar, BottomNav, Button, Card, CardBody, Chip, Empty, Err, Input, KPI, Label, Modal, Page, Spinner, TopBar, cn } from '../ui';
import { Carta, CartBar, OrderTracker, ShareModal } from '../components';
import { FadeView, TiltCard } from '../components/fx';
import { toast } from 'sonner';

/** App del cliente: socio e invitado, misma app, pestañas según rol.
 *  El dueño la usa también, con una pestaña extra de gestión (extra). */
export function ClientApp({ token, extra, topRight }: { token: string; extra?: { id: string; label: string; icon: React.ReactNode; content: React.ReactNode }; topRight?: React.ReactNode }) {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('qr');
  const [sent, setSent] = useState<any>(null);

  const load = () => api('/gapi/mi?t=' + encodeURIComponent(token), undefined, 'GET').then(setMe).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <Dead msg={error} />;
  if (!me) return <><TopBar /><Spinner /></>;

  const esSocio = me.role === 'socio';
  const tabs = [
    { id: 'qr', label: 'Mi QR', icon: <QrCode size={21} /> },
    ...(me.canOrder ? [{ id: 'pedir', label: 'Pedir', icon: <Beer size={21} /> }] : []),
    ...(esSocio || me.canOrder ? [{ id: 'gastos', label: 'Gastos', icon: <Wallet size={21} /> }] : []),
    ...(esSocio ? [{ id: 'invitar', label: 'Invitar', icon: <UserPlus size={21} /> }] : []),
    ...(extra ? [{ id: extra.id, label: extra.label, icon: extra.icon }] : []),
  ];

  const salir = () => {
    if (!confirm('¿Cerrar tu carnet en este dispositivo? Podrás volver a abrirlo con tu enlace de WhatsApp.')) return;
    try { localStorage.removeItem('micaseta_t'); } catch {}
    location.href = '/app/';
  };

  return (
    <>
      <TopBar title={me.caseta} right={topRight ?? (
        <button className="rounded-full bg-secondary px-3.5 py-1.5 text-[12px] font-bold text-muted-foreground" onClick={salir}>Salir</button>
      )} />
      <Page>
        <FadeView id={sent ? 'sent' : tab}>
          {tab === 'qr' && !sent && <VistaQR me={me} onPedir={me.canOrder ? () => setTab('pedir') : undefined} />}
          {tab === 'pedir' && !sent && <VistaPedir me={me} token={token} onSent={setSent} />}
          {sent && (
            <OrderTracker token={token} {...sent} hostName={esSocio ? null : me.hostName}
              onBack={() => { setSent(null); setTab('qr'); load(); }} />
          )}
          {tab === 'gastos' && !sent && <VistaGastos me={me} />}
          {tab === 'invitar' && !sent && <VistaInvitar me={me} token={token} reload={load} />}
          {extra && tab === extra.id && !sent && extra.content}
        </FadeView>
      </Page>
      {!sent && <BottomNav tabs={tabs} tab={tab} onTab={setTab} />}
    </>
  );
}

const Dead = ({ msg }: { msg: string }) => (
  <><TopBar /><Page><div className="rounded-xl bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">{msg}</div></Page></>
);

/** El carnet: el único objeto de luz de la app — billete lona con troquel y raya. */
function VistaQR({ me, onPedir }: any) {
  const esSocio = me.role === 'socio';
  const pend = esSocio ? me.gastos.people.reduce((a: number, p: any) => a + p.pending_cents, 0) : 0;
  return (
    <div className="flex min-h-[70vh] flex-col justify-center">
      {!me.accessOk && <div className="mb-4 rounded-xl bg-menta/10 p-3.5 text-[13px] font-bold text-menta">⚠️ {me.accessReason}</div>}

      <TiltCard>
      <div className="overflow-hidden rounded-[30px] bg-lona text-tinta shadow-carnet">
        <div className="raya h-2.5" />
        <div className="p-6 pb-5">
          <div className="flex justify-between text-[12px] font-extrabold tracking-[.02em]">
            <span className="text-[#1E7A46]">{esSocio ? 'Socio titular' : me.canOrder ? 'Invitación con barra' : 'Invitación · solo entrada'}</span>
            <span className="text-[#8A8672]">{new Date().getFullYear()}</span>
          </div>
          <h1 className="mt-4 break-words text-[42px] font-black leading-[.98] tracking-tighter">{me.name}</h1>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[14px] font-bold text-[#4A5346]">{me.caseta}</span>
            {!esSocio && me.hostName && <span className="text-[12px] font-extrabold tracking-[.01em] text-[#1E7A46]">Invita {me.hostName}</span>}
          </div>
        </div>
        <div className="relative border-t-2 border-dashed border-[#D8D2BC]">
          <span className="absolute -top-3.5 left-[-16px] h-7 w-7 rounded-full bg-background" />
          <span className="absolute -top-3.5 right-[-16px] h-7 w-7 rounded-full bg-background" />
        </div>
        <div className="flex items-center gap-5 p-6 pt-5">
          <div className="w-[140px] flex-shrink-0 overflow-hidden rounded-xl bg-white p-1.5">
            <img src={'/qr.png?t=' + encodeURIComponent(me.qrToken)} alt="Tu código QR" className="w-full" />
          </div>
          <div className="min-w-0">
            <b className="block text-[15px] font-extrabold tracking-tight">{me.canOrder ? 'Puerta y barra' : 'Puerta'}</b>
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[#77816F]">
              {me.canOrder ? 'Un solo código para entrar y pedir a tu cuenta.' : 'Presenta este código en la entrada.'}
            </span>
            <em className="mt-3 flex items-center gap-1.5 text-[12px] font-extrabold not-italic tracking-[.01em] text-[#1E7A46]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />Válido hoy
            </em>
          </div>
        </div>
      </div>
      </TiltCard>

      <div className="mt-6 flex items-center justify-between gap-4">
        {me.wallet && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? (
          <a href={'/gapi/wallet.pkpass?t=' + encodeURIComponent(me.qrToken)} className="flex-1">
            <button className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-black font-bold text-white ring-1 ring-white/15">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.11-.78 1.44.12 2.51.68 3.21 1.7-2.94 1.76-2.48 5.63.66 6.89-.55 1.42-1.26 2.83-2.06 4.36zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple Wallet
            </button>
          </a>
        ) : onPedir ? (
          <Button size="lg" className="flex-1" onClick={onPedir}>Pedir desde el móvil</Button>
        ) : <span className="flex-1" />}
        <div className="text-right">
          <span className="block text-[11.5px] font-bold text-muted-foreground">
            {esSocio ? 'Pendiente' : me.canOrder ? 'Te queda' : ''}
          </span>
          <b className="text-[21px] font-black tabular-nums tracking-tight">
            {esSocio ? eur(pend) : me.canOrder ? (me.remainingCents === null ? 'Sin límite' : eur(me.remainingCents)) : ''}
          </b>
        </div>
      </div>
    </div>
  );
}

function VistaPedir({ me, token, onSent }: any) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const items = Object.entries(qty).filter(([, q]) => (q as number) > 0).map(([productId, q]) => ({ productId: Number(productId), qty: q }));
    if (!items.length) return;
    setBusy(true); setErr('');
    try {
      const r = await api('/gapi/mi/pedido', { t: token, items });
      setQty({});
      onSent({ orderId: r.orderId, pickupNumber: r.pickupNumber, totalCents: r.totalCents });
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <>
      <p className="pt-2 text-[13px] font-bold text-muted-foreground">
        {me.role === 'socio' ? 'La carta · todo va a tu cuenta' : `La carta · a cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · quedan ${eur(me.remainingCents)}` : ''}`}
      </p>
      <Carta products={me.products} qty={qty} setQty={setQty} />
      <CartBar products={me.products} qty={qty} label="Enviar pedido" onSend={send} err={err} busy={busy} />
    </>
  );
}

function VistaGastos({ me }: any) {
  const [open, setOpen] = useState<number | null>(null);
  if (me.role !== 'socio') {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Has consumido" value={eur(me.spentCents)} />
          <KPI label="Te queda" value={me.remainingCents === null ? 'Sin límite' : eur(me.remainingCents)} />
        </div>
        <Card className="mt-3"><CardBody><Empty>Todo va a la cuenta de {me.hostName ?? 'tu socio'}: tú no pagas nada en la caseta.</Empty></CardBody></Card>
      </>
    );
  }
  const pend = me.gastos.people.reduce((a: number, p: any) => a + p.pending_cents, 0);
  const total = me.gastos.people.reduce((a: number, p: any) => a + p.total_cents, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <KPI label="Pendiente de pagar" value={eur(pend)} />
        <KPI label="Total histórico" value={eur(total)} />
      </div>
      <Card className="mt-3"><CardBody>
        {me.gastos.people.length === 0 && <Empty>Aún no hay consumo. Cuando tú o tus invitados pidáis, saldrá aquí.</Empty>}
        {me.gastos.people.map((p: any) => (
          <div key={p.customer_id} className="border-b border-border last:border-0">
            <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setOpen(open === p.customer_id ? null : p.customer_id)}>
              <Avatar name={p.customer_name} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14.5px]">{p.customer_name}{p.es_socio ? ' (tú)' : ''}</b>
                <small className="text-muted-foreground">{p.n_orders} comanda{p.n_orders === 1 ? '' : 's'}</small>
              </div>
              <span className="font-bold">{eur(p.pending_cents)}</span>
            </button>
            {open === p.customer_id && (
              <div className="mb-3 rounded-lg bg-secondary/60 px-3">
                {me.gastos.detail.filter((d: any) => d.customer_id === p.customer_id).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{d.items ?? 'Comanda'}</b>
                      <small className="text-muted-foreground">{fmtFecha(d.created_at)}</small>
                    </div>
                    <Chip tone={d.settled ? 'ok' : 'muted'}>{d.settled ? 'pagada' : 'pendiente'}</Chip>
                    <span className="text-sm font-bold">{eur(d.total_cents)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardBody></Card>
    </>
  );
}

// ── Invitar: la lista de invitados como personas (estilo Partiful) ──

const fmtDia = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const eurCorto = (c: number) => (c % 100 === 0 ? String(c / 100) : (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })) + ' €';

/** Qué se dice de un invitado en una línea: su estado y sus condiciones. */
function estadoInvitado(i: any): { label: string; tone: 'ok' | 'muted' | 'primary'; detalle: string } {
  const cond = i.canOrder
    ? (i.spendLimitCents === null ? 'Con barra · sin límite' : `Con barra · hasta ${eurCorto(i.spendLimitCents)}`)
    : 'Solo entrada';
  const dia = i.validDate ? ` · el ${fmtDia(i.validDate).slice(0, 5)}` : '';
  if (i.status === 'pendiente') return { label: 'Esperando su selfie', tone: 'muted', detalle: cond + dia };
  if (i.dentro) return { label: 'Dentro ahora', tone: 'ok', detalle: cond + dia };
  return { label: 'Tiene su carnet', tone: 'primary', detalle: cond + dia };
}

function VistaInvitar({ me, token, reload }: any) {
  const list: any[] = me.invitaciones ?? [];
  const [crear, setCrear] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);

  const dentro = list.filter((i) => i.dentro).length;
  const conCarnet = list.filter((i) => i.status === 'aceptada' && !i.dentro).length;
  const esperando = list.filter((i) => i.status === 'pendiente').length;
  const resumen = [
    dentro > 0 && `${dentro} dentro ahora`,
    conCarnet > 0 && `${conCarnet} con carnet`,
    esperando > 0 && `${esperando} esperando selfie`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="pt-3">
        <h1 className="text-[34px] font-black leading-none tracking-tighter">Tus invitados</h1>
        <p className="mt-2.5 text-[13.5px] font-bold text-muted-foreground">
          {list.length === 0 ? 'Van a tu cuenta y entran con su selfie.' : resumen}
        </p>
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={() => setCrear(true)}>
        <UserPlus size={19} /> Invitar a alguien
      </Button>

      {list.length === 0 ? (
        <div className="mt-14 text-center">
          <p className="text-[17px] font-extrabold tracking-tight">Todavía no has invitado a nadie</p>
          <p className="mx-auto mt-2 max-w-[260px] text-[13.5px] leading-relaxed text-muted-foreground">
            Dos toques: su nombre y si tiene barra. Le llega por WhatsApp y con su selfie ya tiene carnet.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          {list.map((i) => {
            const st = estadoInvitado(i);
            const pct = i.canOrder && i.spendLimitCents ? Math.min(100, Math.round((i.spentCents / i.spendLimitCents) * 100)) : null;
            return (
              <button key={i.id} className="flex w-full items-center gap-3.5 border-b border-border py-3.5 text-left last:border-0" onClick={() => setSel(i)}>
                <Avatar name={i.guestName} src={i.photoUrl} size={48} dot={i.dentro} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <b className="truncate text-[15.5px] font-extrabold tracking-tight">{i.guestName ?? 'Invitado'}</b>
                    {i.canOrder && i.status === 'aceptada' && (
                      <span className="flex-shrink-0 text-[14px] font-black tabular-nums tracking-tight">{eur(i.spentCents)}</span>
                    )}
                  </div>
                  <span className={cn('mt-0.5 block truncate text-[12.5px] font-bold',
                    st.tone === 'ok' ? 'text-primary' : st.tone === 'primary' ? 'text-menta' : 'text-muted-foreground')}>
                    {st.label} <span className="font-semibold text-muted-foreground">· {st.detalle}</span>
                  </span>
                  {pct !== null && i.status === 'aceptada' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-menta' : 'bg-primary')} style={{ width: pct + '%' }} />
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="flex-shrink-0 text-muted-foreground/50" />
              </button>
            );
          })}
        </div>
      )}

      <CrearInvitacion open={crear} token={token} onClose={() => setCrear(false)}
        onCreated={async (r: any, nombre: string) => {
          setCrear(false);
          await reload();
          setShare({ title: `Envíasela a ${nombre}`, text: r.shareText, url: r.shareUrl, phone: r.guestPhone });
        }} />
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})}
        note="Con el enlace se hace su selfie y recibe su carnet QR al momento." />
      <FichaInvitado inv={sel} onClose={() => setSel(null)}
        onShare={() => { const i = sel; setSel(null); setShare({ title: i.status === 'pendiente' ? `Envíasela a ${i.guestName ?? 'tu invitado'}` : 'Reenviar su enlace', text: i.shareText, url: i.shareUrl }); }}
        onCancel={async () => {
          if (!confirm(`¿Cancelar la invitación de ${sel.guestName ?? 'este invitado'}? Su QR dejará de funcionar.`)) return;
          await api(`/gapi/mi/invitaciones/${sel.id}/cancelar`, { t: token });
          setSel(null);
          toast('Invitación cancelada: su QR ya no funciona');
          reload();
        }} />
    </>
  );
}

/** Hoja de crear: nombre + tipo y listo. Límite, día y móvil, plegados. */
function CrearInvitacion({ open, token, onClose, onCreated }: any) {
  const [form, setForm] = useState({ guestName: '', guestPhone: '', limit: '', date: '' });
  const [type, setType] = useState<'barra' | 'entrada'>('barra');
  const [mas, setMas] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setForm({ guestName: '', guestPhone: '', limit: '', date: '' }); setType('barra'); setMas(false); setErr(''); } }, [open]);

  const crear = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api('/gapi/mi/invitar', { t: token, guestName: form.guestName, guestPhone: form.guestPhone || null, limit: type === 'barra' ? form.limit || null : null, date: form.date || null, type });
      onCreated(r, form.guestName.trim());
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-[22px] font-black tracking-tight">Invitar a alguien</h2>
      <Input autoFocus className="mt-4 h-14 text-[17px] font-bold" value={form.guestName} placeholder="¿Cómo se llama?"
        onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} onKeyDown={(e: any) => e.key === 'Enter' && crear()} />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {([['barra', Beer, 'Con barra', 'Pide a tu cuenta'], ['entrada', Ticket, 'Solo entrada', 'Su QR abre la puerta']] as const).map(([id, Icon, b, s]) => (
          <button key={id} type="button" onClick={() => setType(id)}
            className={cn('rounded-2xl p-4 text-left transition-all', type === id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary')}>
            <Icon size={20} className={type === id ? 'text-primary' : 'text-muted-foreground'} />
            <b className="mt-2 block text-[14.5px] font-extrabold tracking-tight">{b}</b>
            <small className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{s}</small>
          </button>
        ))}
      </div>

      <button type="button" className="mt-4 flex items-center gap-1 text-[13px] font-bold text-muted-foreground" onClick={() => setMas(!mas)}>
        <ChevronRight size={15} className={cn('transition-transform', mas && 'rotate-90')} /> {mas ? 'Menos opciones' : 'Más opciones'}
        {!mas && <span className="font-semibold">· sin límite, cualquier día</span>}
      </button>
      {mas && (
        <div className="mt-1">
          {type === 'barra' && (<>
            <Label className="mt-3">Límite de gasto</Label>
            <Input value={form.limit} onChange={(e: any) => setForm({ ...form, limit: e.target.value })} placeholder="Sin límite" inputMode="decimal" />
          </>)}
          <Label className="mt-3">Solo un día</Label>
          <Input type="date" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} />
          <Label className="mt-3">Su móvil <span className="font-normal">(para abrirle el WhatsApp)</span></Label>
          <Input value={form.guestPhone} onChange={(e: any) => setForm({ ...form, guestPhone: e.target.value })} placeholder="698 765 432" inputMode="tel" />
        </div>
      )}

      <Button size="lg" className="mt-6 w-full" disabled={busy || !form.guestName.trim()} onClick={crear}>Crear y enviar</Button>
      <Err>{err}</Err>
    </Modal>
  );
}

/** Ficha de un invitado: quién es, cómo va, y qué puedes hacer. */
function FichaInvitado({ inv, onClose, onShare, onCancel }: any) {
  const i = inv;
  const st = i ? estadoInvitado(i) : null;
  return (
    <Modal open={!!i} onClose={onClose}>
      {i && st && (
        <>
          <div className="flex items-center gap-4">
            <Avatar name={i.guestName} src={i.photoUrl} size={72} dot={i.dentro} />
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-black leading-tight tracking-tight">{i.guestName ?? 'Invitado'}</h2>
              <Chip tone={st.tone} className="mt-1.5">{st.label}</Chip>
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            <div className="flex items-center gap-3 text-[14px] font-semibold">
              {i.canOrder ? <Beer size={19} className="flex-shrink-0 text-primary" /> : <Ticket size={19} className="flex-shrink-0 text-primary" />}
              <span>{i.canOrder ? (i.spendLimitCents === null ? 'Con barra, sin límite: todo a tu cuenta' : `Con barra hasta ${eurCorto(i.spendLimitCents)}, a tu cuenta`) : 'Solo entrada: su QR abre la puerta, no pide'}</span>
            </div>
            <div className="flex items-center gap-3 text-[14px] font-semibold">
              <QrCode size={19} className="flex-shrink-0 text-primary" />
              <span>{i.validDate ? `Válida solo el ${fmtDia(i.validDate)}` : 'Válida cualquier día de feria'}</span>
            </div>
            {i.status === 'aceptada' && i.canOrder && (
              <div className="rounded-2xl bg-secondary/60 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] font-bold text-muted-foreground">Lleva gastado</span>
                  <b className="text-[20px] font-black tabular-nums tracking-tight">{eur(i.spentCents)}</b>
                </div>
                {i.spendLimitCents !== null && (
                  <>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background/60">
                      <div className="h-full rounded-full bg-primary" style={{ width: Math.min(100, Math.round((i.spentCents / i.spendLimitCents) * 100)) + '%' }} />
                    </div>
                    <span className="mt-1.5 block text-[12px] font-semibold text-muted-foreground">le quedan {eur(Math.max(0, i.spendLimitCents - i.spentCents))} de {eurCorto(i.spendLimitCents)}</span>
                  </>
                )}
              </div>
            )}
            {i.status === 'aceptada' && i.lastCheckinAt && (
              <p className="text-[12.5px] font-semibold text-muted-foreground">Última entrada por la puerta: {fmtFecha(i.lastCheckinAt)}</p>
            )}
            {i.status === 'pendiente' && (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">Aún no ha abierto el enlace. Cuando se haga la selfie tendrá su carnet y la verás aquí.</p>
            )}
          </div>

          <Button className="mt-6 w-full" onClick={onShare}>{i.status === 'pendiente' ? 'Enviar por WhatsApp' : 'Reenviar su enlace'}</Button>
          <Button variant="ghost" className="mt-2 w-full text-destructive" onClick={onCancel}>Cancelar invitación</Button>
        </>
      )}
    </Modal>
  );
}

/** Registro del invitado desde el link de invitación (?i=): condiciones → selfie → /app?t= */
export function GuestRegister({ token }: { token: string }) {
  const [inv, setInv] = useState<any>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    api('/gapi/invitacion?t=' + encodeURIComponent(token), undefined, 'GET')
      .then((d) => {
        if (d.status === 'cancelada' || d.status === 'rechazada') return setError('Esta invitación ya no está activa.');
        if (d.registered && d.qrToken) return location.replace('/app/?t=' + encodeURIComponent(d.qrToken));
        setInv(d);
        if (d.guestName) setForm((f) => ({ ...f, name: d.guestName }));
      })
      .catch(() => setError('Este enlace de invitación no es válido.'));
  }, []);

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        setPhoto(cv.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const go = async () => {
    setErr('');
    if (!photo) return setErr('Falta tu selfie.');
    try {
      const body: any = { t: token, name: form.name, photoBase64: photo.split(',')[1] };
      if (inv.needsPhone) body.phone = form.phone;
      const r = await api('/gapi/invitacion/registro', body);
      location.replace('/app/?t=' + encodeURIComponent(r.qrToken));
    } catch (e: any) { setErr(e.message); }
  };

  if (error) return <Dead msg={error} />;
  if (!inv) return <><TopBar /><Spinner /></>;

  const condiciones: { Icon: any; text: string }[] = inv.canOrder === undefined
    ? String(inv.conditions).split('\n').map((text: string) => ({ Icon: QrCode, text }))
    : [
        inv.canOrder
          ? { Icon: Beer, text: inv.spendLimitCents === null ? 'Barra libre a cuenta de ' + inv.socio : `Hasta ${eurCorto(inv.spendLimitCents)} en barra, a cuenta de ${inv.socio}` }
          : { Icon: Ticket, text: 'Solo entrada: tu QR abre la puerta' },
        { Icon: QrCode, text: inv.validDate ? `Válida solo el ${fmtDia(inv.validDate)}` : 'Válida cualquier día de feria' },
      ];

  return (
    <>
      <TopBar />
      <Page>
        <TiltCard>
        <div className="overflow-hidden rounded-[30px] bg-lona text-tinta shadow-carnet">
          <div className="raya h-2.5" />
          <div className="p-6 pb-5">
            <div className="text-[12px] font-extrabold tracking-[.02em] text-[#1E7A46]">Invitación</div>
            <p className="mt-4 text-[15px] font-bold text-[#4A5346]">{inv.socio} te invita a</p>
            <h1 className="mt-1 break-words text-[42px] font-black leading-[.98] tracking-tighter">{inv.caseta}</h1>
          </div>
          <div className="relative border-t-2 border-dashed border-[#D8D2BC]">
            <span className="absolute -top-3.5 left-[-16px] h-7 w-7 rounded-full bg-background" />
            <span className="absolute -top-3.5 right-[-16px] h-7 w-7 rounded-full bg-background" />
          </div>
          <div className="space-y-3 p-6 pt-5">
            {condiciones.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-[14px] font-bold leading-snug">
                <c.Icon size={19} className="flex-shrink-0 text-[#1E7A46]" />
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
        </TiltCard>

        <div className="mt-8 text-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="group relative mx-auto block" aria-label="Hacer selfie">
            {photo ? (
              <img src={photo} alt="" className="h-[124px] w-[124px] rounded-full object-cover shadow-glow ring-4 ring-primary" />
            ) : (
              <div className="grid h-[124px] w-[124px] place-items-center rounded-full border-2 border-dashed border-primary/50 bg-secondary transition-transform group-active:scale-95">
                <Camera size={34} className="text-primary" />
              </div>
            )}
            <span className="mt-3 block text-[13px] font-bold text-primary">{photo ? 'Cambiar selfie' : 'Hazte una selfie'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
            onChange={(e: any) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <p className="mx-auto mt-3 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">Tu cara es tu entrada: en la puerta comprueban que el carnet es tuyo.</p>
        </div>

        <Label>Tu nombre</Label>
        <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellidos" />
        {inv.needsPhone && (<><Label>Tu WhatsApp</Label>
          <Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></>)}
        <Button className="mt-6 w-full" size="lg" onClick={go}>Aceptar y recibir mi carnet</Button>
        <Err>{err}</Err>
      </Page>
    </>
  );
}
