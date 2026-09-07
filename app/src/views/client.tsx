import React, { useEffect, useState } from 'react';
import { Beer, Wallet, UserPlus, Camera, Ticket, QrCode, Calendar, ChevronRight, Store, Clock } from '../components/icons';
import { api, eur, fmtFecha } from '../lib/api';
import { Avatar, Button, CASETA_TAB, CLIENT_TABS, Card, CardBody, Chip, Dock, Empty, Err, Input, Kick, Label, Modal, Page, Row, SalirBtn, SectionTitle, Spinner, Stats, Titulo, TopBar, cn } from '../ui';
import { Carta, CartBar, LiveOrder, ShareModal } from '../components';
import { FadeView, TiltCard } from '../components/fx';
import { toast } from 'sonner';

/** App del cliente "Micaseta fácil": Inicio con el pase y tres filas grandes,
 *  barra de pestañas con nombre, y una sola cosa importante por pantalla.
 *  Dentro (tras pasar la puerta): el pase se pliega y la carta va primero. */
export function ClientApp({ token, extra, onExit }: { token: string; extra?: { id: string; label: string; content: React.ReactNode }; onExit?: () => void }) {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('inicio');
  const [live, setLive] = useState<any>(null);

  const load = () => api('/gapi/mi?t=' + encodeURIComponent(token), undefined, 'GET').then(setMe).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <Dead msg={error} />;
  if (!me) return <><TopBar /><Spinner /></>;

  const esSocio = me.role === 'socio';
  const dentro = !!me.checkinAt;

  const salir = () => {
    if (onExit) return onExit();
    if (!confirm('¿Cerrar tu pase en este teléfono? Podrás volver a abrirlo con tu enlace de WhatsApp.')) return;
    try { localStorage.removeItem('micaseta_t'); } catch {}
    location.href = '/app/';
  };

  const tabs = [
    ...CLIENT_TABS.filter((t) =>
      t.id === 'inicio'
      || (t.id === 'pedir' && me.canOrder)
      || (t.id === 'gastos' && (esSocio || me.canOrder))
      || (t.id === 'invitar' && esSocio)),
    ...(extra ? [{ ...CASETA_TAB, id: extra.id, label: extra.label }] : []),
  ];

  const onSent = (r: any) => { setLive(r); toast('Pedido enviado: te avisamos cuando esté listo'); setTab('inicio'); load(); };
  const go = (id: string) => { setTab(id); window.scrollTo({ top: 0 }); };

  return (
    <>
      {live && <LiveOrder token={token} {...live} onDone={() => { setLive(null); load(); }} />}
      {tab !== 'inicio' && <TopBar back="Inicio" onBack={() => go('inicio')} title={me.caseta} right={<SalirBtn onClick={salir} />} />}
      <Page className={tab === 'inicio' ? 'pt-0' : ''}>
        <FadeView id={tab + (dentro ? ':in' : ':out')}>
          {tab === 'inicio' && <VistaInicio me={me} token={token} dentro={dentro} onSalir={salir} onTab={go} onSent={onSent} extra={extra} />}
          {tab === 'pedir' && <VistaPedir me={me} token={token} onSent={onSent} />}
          {tab === 'gastos' && <VistaGastos me={me} />}
          {tab === 'invitar' && <VistaInvitar me={me} token={token} reload={load} />}
          {extra && tab === extra.id && extra.content}
        </FadeView>
      </Page>
      <Dock tabs={tabs} tab={tab} onTab={go} />
    </>
  );
}

const Dead = ({ msg }: { msg: string }) => (
  <><TopBar /><Page><div className="rounded-xl bg-destructive/10 p-4 text-center text-[16px] font-semibold text-destructive">{msg}</div></Page></>
);

const saludo = () => {
  const h = new Date().getHours();
  return h < 7 || h >= 20 ? 'Buenas noches' : h < 14 ? 'Buenos días' : 'Buenas tardes';
};

/** El pase: el billete de papel — banda, nombre grande, troquel y QR grande
 *  con una frase que dice para qué sirve. */
function Pase({ me }: any) {
  const esSocio = me.role === 'socio';
  const kicker = esSocio ? 'Socio titular' : me.canOrder ? 'Invitación con consumo' : 'Invitación · solo entrada';
  return (
    <div className="overflow-hidden rounded-pase border border-papel-borde bg-papel text-tinta shadow-pase">
      <div className="banda h-2.5" />
      <div className="p-5 pb-4">
        <div className="kick flex justify-between text-[13px] font-extrabold tracking-[.02em]">
          <span className="text-primary">{kicker}</span>
          <span className="text-tinta-humo tabular-nums">{new Date().getFullYear()}</span>
        </div>
        <h2 className="mt-3 break-words text-[34px] font-black leading-[1] tracking-[-.04em]">{me.name}</h2>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[15px] font-bold text-tinta-suave">{me.caseta}</span>
          {!esSocio && me.hostName && <span className="kick text-[13px] font-extrabold tracking-[.01em] text-primary">Invita {me.hostName}</span>}
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-papel-borde">
        <span className="absolute -top-3.5 left-[-16px] h-7 w-7 rounded-full bg-white" />
        <span className="absolute -top-3.5 right-[-16px] h-7 w-7 rounded-full bg-white" />
      </div>
      <div className="flex items-center gap-4 p-5 pt-4">
        <div className="w-[152px] flex-shrink-0 overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_1px_0_rgba(0,0,0,.05)]">
          <img src={'/qr.png?t=' + encodeURIComponent(me.qrToken)} alt="Tu código QR" className="w-full" />
        </div>
        <div className="min-w-0">
          <b className="block text-[17px] font-extrabold leading-tight tracking-tight">Enseña este código</b>
          <span className="mt-2 block text-[14px] font-semibold leading-snug text-tinta-humo">
            {me.canOrder ? 'En la puerta para entrar y en la barra para pedir a tu cuenta.' : 'En la puerta para entrar.'}
          </span>
          <em className={cn('kick mt-3 flex items-center gap-1.5 text-[13px] font-extrabold not-italic tracking-[.01em]',
            me.accessOk ? 'text-success' : 'text-destructive')}>
            <span className={cn('h-2 w-2 rounded-full', me.accessOk ? 'bg-success' : 'bg-destructive')} />
            {me.accessOk ? 'Válido hoy' : 'Sin acceso'}
          </em>
        </div>
      </div>
    </div>
  );
}

/** Chip del pase plegado (estado dentro). */
function PaseChip({ me }: any) {
  const hora = me.checkinAt ? new Date(String(me.checkinAt).replace(' ', 'T')).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-papel-borde bg-papel text-tinta shadow-pchip">
      <span className="banda-v w-[6px] self-stretch" />
      <span className="my-2 w-[56px] rounded-[10px] bg-white p-1.5">
        <img src={'/qr.png?t=' + encodeURIComponent(me.qrToken)} alt="" className="block w-full" />
      </span>
      <span className="min-w-0 flex-1 py-3">
        <small className="kick block text-[12px] font-bold text-primary">{me.role === 'socio' ? 'Socio titular' : 'Invitación'}</small>
        <b className="block truncate text-[16px] font-extrabold tracking-tight">{me.name}</b>
      </span>
      <span className="flex flex-col items-end whitespace-nowrap pr-4 text-[13px] font-extrabold leading-tight text-success">
        <span className="flex items-center gap-1.5"><i className="animate-pulse-dot h-2 w-2 rounded-full bg-success" />Dentro</span>
        {hora && <span className="text-[12px] font-bold text-tinta-humo tabular-nums">{hora}</span>}
      </span>
    </div>
  );
}

function VistaInicio({ me, token, dentro, onSalir, onTab, onSent, extra }: any) {
  const esSocio = me.role === 'socio';
  const pend = esSocio ? me.gastos.people.reduce((a: number, p: any) => a + p.pending_cents, 0) : 0;
  const invs: any[] = me.invitaciones ?? [];
  const nDentro = invs.filter((i) => i.dentro).length;

  if (dentro) return <Dentro me={me} token={token} onSent={onSent} onTab={onTab} onSalir={onSalir} extra={extra} />;

  return (
    <>
      <div className="flex items-start justify-between gap-3 px-1 pt-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-.035em]">{saludo()},<br />{String(me.name).split(' ')[0]}</h1>
          <p className="mt-1.5 text-[15px] font-semibold text-muted-foreground">{me.caseta}</p>
        </div>
        <SalirBtn onClick={onSalir} />
      </div>
      {!me.accessOk && <div className="mt-3 rounded-xl bg-destructive/10 p-4 text-[15px] font-bold text-destructive">{me.accessReason}</div>}

      <div className="pt-4 [perspective:900px]">
        <TiltCard><Pase me={me} /></TiltCard>
      </div>

      {me.wallet && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && (
        <a href={'/gapi/wallet.pkpass?t=' + encodeURIComponent(me.qrToken)} className="mt-3.5 block">
          <button className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-black text-[16px] font-bold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.11-.78 1.44.12 2.51.68 3.21 1.7-2.94 1.76-2.48 5.63.66 6.89-.55 1.42-1.26 2.83-2.06 4.36zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Añadir a Apple Wallet
          </button>
        </a>
      )}

      {/* Lo que puedes hacer: filas grandes, como en Ajustes. Nada escondido. */}
      {(me.canOrder || esSocio) && (
        <Card className="mt-4">
          {me.canOrder && <Row icon={<Beer size={26} />} title="Pedir desde el móvil" sub="Te avisamos con tu número cuando esté listo" onClick={() => onTab('pedir')} />}
          {(esSocio || me.canOrder) && (
            <Row icon={<Wallet size={26} />} title="Mi cuenta"
              sub={esSocio ? (pend > 0 ? `${eur(pend)} pendientes · se paga al final de la feria` : 'Nada pendiente de pagar')
                : me.remainingCents === null ? `A cuenta de ${me.hostName ?? 'tu socio'}` : `Te quedan ${eur(me.remainingCents)} a cuenta de ${me.hostName ?? 'tu socio'}`}
              onClick={() => onTab('gastos')} />
          )}
          {esSocio && (
            <Row icon={<UserPlus size={26} />} title="Invitar a alguien"
              sub={invs.length === 0 ? 'Con barra o solo entrada, a tu cuenta' : `${invs.length} invitado${invs.length === 1 ? '' : 's'}${nDentro ? ` · ${nDentro} dentro ahora` : ''}`}
              onClick={() => onTab('invitar')} />
          )}
          {extra && <Row icon={<Store size={26} />} title={extra.label} sub="Cuánta gente hay, la caja y las cuentas" onClick={() => onTab(extra.id)} />}
        </Card>
      )}
      {!me.canOrder && !esSocio && (
        <p className="mt-5 px-1 text-center text-[15px] leading-relaxed text-muted-foreground">Tu invitación es solo de entrada: enseña el código en la puerta y pide directamente en la barra.</p>
      )}
    </>
  );
}

/** Estado DENTRO: aviso verde, pase plegado, la carta en primer plano, "Esta noche". */
function Dentro({ me, token, onSent, onTab, onSalir, extra }: any) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const esSocio = me.role === 'socio';
  const hoy = new Date().toDateString();
  const nombres: Record<number, string> = {};
  if (esSocio) for (const p of me.gastos.people) nombres[p.customer_id] = p.es_socio ? 'tú' : p.customer_name;
  const estaNoche = esSocio ? me.gastos.detail.filter((d: any) => new Date(d.created_at).toDateString() === hoy) : [];
  const totalNoche = estaNoche.reduce((a: number, d: any) => a + d.total_cents, 0);

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
      <div className="flex items-center justify-between gap-3 px-1 pt-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-.035em]">Estás dentro</h1>
          <p className="mt-1 text-[15px] font-semibold text-muted-foreground">{me.caseta}</p>
        </div>
        <SalirBtn onClick={onSalir} />
      </div>
      <div className="pt-4"><PaseChip me={me} /></div>
      {me.canOrder ? (
        <div className="mt-6 px-1">
          <SectionTitle className="mt-0">Pide desde aquí</SectionTitle>
          <p className="text-[15px] font-semibold text-muted-foreground">
            {esSocio ? 'Todo va a tu cuenta.' : `A cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · te quedan ${eur(me.remainingCents)}` : ''}.`}
          </p>
          <Carta products={me.products} qty={qty} setQty={setQty} />
          <CartBar products={me.products} qty={qty} label="Enviar pedido" onSend={send} err={err} busy={busy} />
        </div>
      ) : (
        <div className="mt-5 px-1"><Empty>Tu invitación es solo de entrada: pide directamente en la barra.</Empty></div>
      )}
      {esSocio && (
        <div className="px-1 pb-2">
          <SectionTitle>Esta noche</SectionTitle>
          {estaNoche.length === 0 && <Empty>Aún no hay consumo esta noche.</Empty>}
          {estaNoche.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 border-b border-border py-3.5">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[16px] font-extrabold tracking-tight">{d.items ?? 'Comanda'}</b>
                <small className="mt-0.5 block text-[14px] text-muted-foreground">{fmtFecha(d.created_at)}{nombres[d.customer_id] ? ` · ${nombres[d.customer_id]}` : ''}</small>
              </div>
              <span className="text-[16px] font-bold tabular-nums">{eur(d.total_cents)}</span>
            </div>
          ))}
          {estaNoche.length > 0 && (
            <div className="flex items-center justify-between py-3.5">
              <b className="text-[16px] font-extrabold tracking-tight">Cuenta de la noche</b>
              <span className="text-[18px] font-black tabular-nums">{eur(totalNoche)}</span>
            </div>
          )}
        </div>
      )}
      {extra && <Card className="mt-4"><Row icon={<Store size={26} />} title={extra.label} sub="Cuánta gente hay, la caja y las cuentas" onClick={() => onTab(extra.id)} /></Card>}
    </>
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
    <div className="px-1">
      <Titulo sub={me.role === 'socio' ? 'Elige, envía y te avisamos con tu número. Todo va a tu cuenta.' : `A cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · te quedan ${eur(me.remainingCents)}` : ''}.`}>Pedir</Titulo>
      <Carta products={me.products} qty={qty} setQty={setQty} />
      <CartBar products={me.products} qty={qty} label="Enviar pedido" onSend={send} err={err} busy={busy} />
    </div>
  );
}

function VistaGastos({ me }: any) {
  const [open, setOpen] = useState<number | null>(null);
  if (me.role !== 'socio') {
    return (
      <>
        <Titulo sub={`Todo va a la cuenta de ${me.hostName ?? 'tu socio'}: tú no pagas nada.`}>Mi cuenta</Titulo>
        <Card><CardBody>
          <Kick className="mb-1.5">Has consumido</Kick>
          <span className="text-[44px] font-black leading-none tracking-[-.04em] tabular-nums">{eur(me.spentCents)}</span>
          <Stats items={[[me.remainingCents === null ? 'Sin límite' : eur(me.remainingCents), 'Te queda'], [me.spendLimitCents ? eur(me.spendLimitCents) : '—', 'Límite']]} />
        </CardBody></Card>
      </>
    );
  }
  const pend = me.gastos.people.reduce((a: number, p: any) => a + p.pending_cents, 0);
  const total = me.gastos.people.reduce((a: number, p: any) => a + p.total_cents, 0);
  const nPend = me.gastos.detail.filter((d: any) => !d.settled).length;
  return (
    <>
      <Titulo sub="Lo tuyo y lo de tus invitados. Se paga al final de la feria.">Mi cuenta</Titulo>
      <Card className="mb-3"><div className="banda h-1" /><CardBody>
        <Kick className="mb-1.5">Pendiente de pagar</Kick>
        <span className="text-[44px] font-black leading-none tracking-[-.04em] tabular-nums">{eur(pend)}</span>
        <Stats items={[[nPend, 'Comandas'], [me.gastos.people.length, 'Personas'], [eur(total), 'Total feria']]} />
      </CardBody></Card>
      <Card><CardBody>
        <Kick>Por persona · toca para ver el detalle</Kick>
        {me.gastos.people.length === 0 && <Empty>Aún no hay consumo. Cuando tú o tus invitados pidáis, saldrá aquí.</Empty>}
        {me.gastos.people.map((p: any) => (
          <div key={p.customer_id} className="border-b border-border last:border-0">
            <button className="flex min-h-[64px] w-full items-center gap-3 py-3 text-left" onClick={() => setOpen(open === p.customer_id ? null : p.customer_id)}>
              <Avatar name={p.customer_name} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[17px] font-extrabold">{p.es_socio ? 'Tú' : p.customer_name}</b>
                <small className="text-[14px] text-muted-foreground">{p.n_orders} comanda{p.n_orders === 1 ? '' : 's'}</small>
              </div>
              <span className="text-[17px] font-bold tabular-nums">{eur(p.pending_cents)}</span>
              <ChevronRight size={20} className={cn('text-[#B4BAC8] transition-transform', open === p.customer_id && 'rotate-90')} />
            </button>
            {open === p.customer_id && (
              <div className="mb-3 rounded-xl bg-secondary/70 px-3">
                {me.gastos.detail.filter((d: any) => d.customer_id === p.customer_id).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-2 border-b border-border py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[15px]">{d.items ?? 'Comanda'}</b>
                      <small className="text-[13px] text-muted-foreground">{fmtFecha(d.created_at)}</small>
                    </div>
                    <Chip tone={d.settled ? 'ok' : 'muted'}>{d.settled ? 'Pagada' : 'Pendiente'}</Chip>
                    <span className="text-[15px] font-bold tabular-nums">{eur(d.total_cents)}</span>
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
function estadoInvitado(i: any): { label: string; tone: 'ok' | 'muted' | 'soft'; detalle: string } {
  const cond = i.canOrder
    ? (i.spendLimitCents === null ? 'con barra, sin límite' : `con barra hasta ${eurCorto(i.spendLimitCents)}`)
    : 'solo entrada';
  const dia = i.validDate ? ` · el ${fmtDia(i.validDate).slice(0, 5)}` : '';
  if (i.status === 'pendiente') return { label: 'Esperando su selfie', tone: 'muted', detalle: cond + dia };
  if (i.dentro) return { label: 'Dentro ahora', tone: 'ok', detalle: cond + dia };
  return { label: 'Tiene su pase', tone: 'soft', detalle: cond + dia };
}

function VistaInvitar({ me, token, reload }: any) {
  const list: any[] = me.invitaciones ?? [];
  const [crear, setCrear] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);

  const dentro = list.filter((i) => i.dentro).length;
  const conPase = list.filter((i) => i.status === 'aceptada' && !i.dentro).length;
  const esperando = list.filter((i) => i.status === 'pendiente').length;
  const resumen = [
    dentro > 0 && `${dentro} dentro ahora`,
    conPase > 0 && `${conPase} con su pase`,
    esperando > 0 && `${esperando} esperando selfie`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <Titulo sub={list.length === 0 ? 'Van a tu cuenta y entran con su selfie.' : resumen}>Tus invitados</Titulo>
      <Button size="lg" className="w-full" onClick={() => setCrear(true)}>
        <UserPlus size={22} /> Invitar a alguien
      </Button>

      {list.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-[19px] font-extrabold tracking-tight">Todavía no has invitado a nadie</p>
          <p className="mx-auto mt-2 max-w-[290px] text-[15px] leading-relaxed text-muted-foreground">
            Dos toques: su nombre y si tiene barra. Le llega por WhatsApp y, con su selfie, ya tiene su pase.
          </p>
        </div>
      ) : (
        <div className="mt-5 px-1">
          {list.map((i) => {
            const st = estadoInvitado(i);
            const pct = i.canOrder && i.spendLimitCents ? Math.min(100, Math.round((i.spentCents / i.spendLimitCents) * 100)) : null;
            return (
              <button key={i.id} className="flex min-h-[84px] w-full items-center gap-3.5 border-b border-border py-3.5 text-left last:border-0" onClick={() => setSel(i)}>
                <Avatar name={i.guestName} src={i.photoUrl} size={54} dot={i.dentro} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <b className="truncate text-[17px] font-extrabold tracking-tight">{i.guestName ?? 'Invitado'}</b>
                    {i.canOrder && i.status === 'aceptada' && (
                      <span className="flex-shrink-0 text-[16px] font-black tabular-nums tracking-tight">{eur(i.spentCents)}</span>
                    )}
                  </div>
                  <span className={cn('mt-0.5 block text-[14px] font-bold',
                    st.tone === 'ok' ? 'text-success' : st.tone === 'soft' ? 'text-primary' : 'text-muted-foreground')}>{st.label}</span>
                  <span className="block text-[14px] font-semibold text-muted-foreground first-letter:uppercase">{st.detalle}</span>
                  {pct !== null && i.status === 'aceptada' && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-destructive' : 'bg-primary')} style={{ width: pct + '%' }} />
                    </div>
                  )}
                </div>
                <ChevronRight size={22} className="flex-shrink-0 text-[#B4BAC8]" />
              </button>
            );
          })}
          <p className="pt-3 text-center text-[14px] text-muted-foreground">Toca a una persona para reenviarle el enlace o cancelar.</p>
        </div>
      )}

      <CrearInvitacion open={crear} token={token} onClose={() => setCrear(false)}
        onCreated={async (r: any, nombre: string) => {
          setCrear(false);
          await reload();
          setShare({ title: `Envíasela a ${nombre}`, text: r.shareText, url: r.shareUrl, phone: r.guestPhone });
        }} />
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})}
        note="Con el enlace se hace su selfie y recibe su pase al momento." />
      <FichaInvitado inv={sel} onClose={() => setSel(null)}
        onShare={() => { const i = sel; setSel(null); setShare({ title: i.status === 'pendiente' ? `Envíasela a ${i.guestName ?? 'tu invitado'}` : 'Reenviar su enlace', text: i.shareText, url: i.shareUrl }); }}
        onCancel={async () => {
          if (!confirm(`¿Cancelar la invitación de ${sel.guestName ?? 'este invitado'}? Su pase dejará de funcionar.`)) return;
          await api(`/gapi/mi/invitaciones/${sel.id}/cancelar`, { t: token });
          setSel(null);
          toast('Invitación cancelada: su pase ya no funciona');
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
      <h2 className="text-[24px] font-black tracking-tight">Invitar a alguien</h2>
      <Label className="mt-4">¿Cómo se llama?</Label>
      <Input autoFocus className="h-14 text-[18px] font-bold" value={form.guestName} placeholder="Nombre de tu invitado"
        onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} onKeyDown={(e: any) => e.key === 'Enter' && crear()} />
      <Label>¿Qué puede hacer?</Label>
      <div className="grid grid-cols-2 gap-2.5">
        {([['barra', Beer, 'Con barra', 'Pide a tu cuenta'], ['entrada', Ticket, 'Solo entrada', 'Su pase abre la puerta']] as const).map(([id, Icon, b, s]) => (
          <button key={id} type="button" onClick={() => setType(id)}
            className={cn('rounded-2xl p-4 text-left transition-all', type === id ? 'bg-primary/[.14] ring-2 ring-primary' : 'bg-secondary')}>
            <Icon size={26} className={type === id ? 'text-primary' : 'text-[#4A5062]'} />
            <b className="mt-2 block text-[16px] font-extrabold tracking-tight">{b}</b>
            <small className="mt-0.5 block text-[13.5px] leading-snug text-muted-foreground">{s}</small>
          </button>
        ))}
      </div>

      <button type="button" className="mt-4 flex min-h-[44px] w-full items-center gap-1 text-left text-[15px] font-bold text-primary" onClick={() => setMas(!mas)}>
        <ChevronRight size={18} className={cn('flex-shrink-0 transition-transform', mas && 'rotate-90')} />
        <span>{mas ? 'Menos opciones' : 'Más opciones'}{!mas && <span className="block text-[13.5px] font-semibold text-muted-foreground">Ahora: sin límite de gasto, cualquier día</span>}</span>
      </button>
      {mas && (
        <div className="mt-1">
          {type === 'barra' && (<>
            <Label className="mt-3">Límite de gasto (€)</Label>
            <Input value={form.limit} onChange={(e: any) => setForm({ ...form, limit: e.target.value })} placeholder="Sin límite" inputMode="decimal" />
          </>)}
          <Label className="mt-3">Solo un día</Label>
          <Input type="date" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} />
          <Label className="mt-3">Su móvil <span className="font-normal text-muted-foreground">(para abrirle el WhatsApp)</span></Label>
          <Input value={form.guestPhone} onChange={(e: any) => setForm({ ...form, guestPhone: e.target.value })} placeholder="698 765 432" inputMode="tel" />
        </div>
      )}

      <Button size="lg" className="mt-6 w-full" disabled={busy || !form.guestName.trim()} onClick={crear}>Crear y enviar por WhatsApp</Button>
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
            <Avatar name={i.guestName} src={i.photoUrl} size={76} dot={i.dentro} />
            <div className="min-w-0">
              <h2 className="truncate text-[24px] font-black leading-tight tracking-tight">{i.guestName ?? 'Invitado'}</h2>
              <Chip tone={st.tone} className="mt-1.5">{st.label}</Chip>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-[16px] font-semibold">
              {i.canOrder ? <Beer size={24} className="flex-shrink-0 text-primary" /> : <Ticket size={24} className="flex-shrink-0 text-primary" />}
              <span>{i.canOrder ? (i.spendLimitCents === null ? 'Con barra, sin límite: todo a tu cuenta' : `Con barra hasta ${eurCorto(i.spendLimitCents)}, a tu cuenta`) : 'Solo entrada: su pase abre la puerta, no pide'}</span>
            </div>
            <div className="flex items-center gap-3 text-[16px] font-semibold">
              <Calendar size={24} className="flex-shrink-0 text-primary" />
              <span>{i.validDate ? `Vale solo el ${fmtDia(i.validDate)}` : 'Vale cualquier día de feria'}</span>
            </div>
            {i.status === 'aceptada' && i.canOrder && (
              <div className="rounded-2xl bg-secondary/70 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] font-bold text-muted-foreground">Lleva gastado</span>
                  <b className="text-[24px] font-black tabular-nums tracking-tight">{eur(i.spentCents)}</b>
                </div>
                {i.spendLimitCents !== null && (
                  <>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-primary" style={{ width: Math.min(100, Math.round((i.spentCents / i.spendLimitCents) * 100)) + '%' }} />
                    </div>
                    <span className="mt-1.5 block text-[14px] font-semibold text-muted-foreground">le quedan {eur(Math.max(0, i.spendLimitCents - i.spentCents))} de {eurCorto(i.spendLimitCents)}</span>
                  </>
                )}
              </div>
            )}
            {i.status === 'aceptada' && i.lastCheckinAt && (
              <div className="flex items-center gap-3 text-[15px] font-semibold text-muted-foreground">
                <Clock size={22} className="flex-shrink-0" /><span>Última entrada por la puerta: {fmtFecha(i.lastCheckinAt)}</span>
              </div>
            )}
            {i.status === 'pendiente' && (
              <p className="text-[15px] leading-relaxed text-muted-foreground">Aún no ha abierto el enlace. Cuando se haga la selfie tendrá su pase y la verás aquí.</p>
            )}
          </div>

          <Button size="lg" className="mt-6 w-full" onClick={onShare}>{i.status === 'pendiente' ? 'Enviar por WhatsApp' : 'Reenviar su enlace'}</Button>
          <Button variant="ghost" className="mt-2 w-full text-destructive" onClick={onCancel}>Cancelar invitación</Button>
        </>
      )}
    </Modal>
  );
}

/** Registro del invitado desde el link de invitación (?i=): la invitación-objeto
 *  (pase de papel) → selfie grande → nombre → un solo botón. */
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
    if (!photo) return setErr('Falta tu selfie: toca el círculo de la cámara.');
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
          : { Icon: Ticket, text: 'Solo entrada: tu pase abre la puerta' },
        { Icon: Calendar, text: inv.validDate ? `Vale solo el ${fmtDia(inv.validDate)}` : 'Vale cualquier día de feria' },
      ];

  return (
    <>
      <TopBar />
      <Page className="pb-12">
        <TiltCard>
        <div className="overflow-hidden rounded-pase border border-papel-borde bg-papel text-tinta shadow-pase">
          <div className="banda h-2.5" />
          <div className="p-5 pb-4">
            <div className="kick text-[13px] font-bold tracking-[.02em] text-primary">Invitación</div>
            <p className="mt-3 text-[16px] font-bold text-tinta-suave">{inv.socio} te invita a</p>
            <h1 className="mt-1 break-words text-[38px] font-black leading-[1] tracking-[-.04em]">{inv.caseta}</h1>
          </div>
          <div className="relative border-t-2 border-dashed border-papel-borde">
            <span className="absolute -top-3.5 left-[-16px] h-7 w-7 rounded-full bg-white" />
            <span className="absolute -top-3.5 right-[-16px] h-7 w-7 rounded-full bg-white" />
          </div>
          <div className="space-y-3 p-5 pt-4">
            {condiciones.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-[16px] font-bold leading-snug">
                <c.Icon size={24} className="flex-shrink-0 text-primary" />
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
        </TiltCard>

        <div className="mt-8 text-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="group mx-auto block" aria-label="Hacer selfie">
            {photo ? (
              <img src={photo} alt="" className="h-[132px] w-[132px] rounded-full object-cover ring-4 ring-primary" />
            ) : (
              <div className="grid h-[132px] w-[132px] place-items-center rounded-full border-2 border-dashed border-primary/60 bg-primary/[.08] transition-transform group-active:scale-95">
                <Camera size={44} className="text-primary" />
              </div>
            )}
            <span className="mt-3 block text-[17px] font-extrabold text-primary">{photo ? 'Cambiar selfie' : 'Hazte una selfie'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
            onChange={(e: any) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">Tu cara es tu entrada: en la puerta comprueban que el pase es tuyo.</p>
        </div>

        <Label>Tu nombre</Label>
        <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellidos" />
        {inv.needsPhone && (<><Label>Tu WhatsApp</Label>
          <Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></>)}
        <Button className="mt-6 w-full" size="lg" onClick={go}>Aceptar y recibir mi pase</Button>
        <Err>{err}</Err>
      </Page>
    </>
  );
}
