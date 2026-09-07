import React, { useEffect, useState } from 'react';
import { Camera, X } from '../components/icons';
import { api, eur, fmtFecha } from '../lib/api';
import { Avatar, Button, CLIENT_TABS, Card, CardBody, Chip, Dock, Empty, Err, Input, Kick, Label, LinkBtn, Page, SectionTitle, Spinner, Stats, TopBar, cn } from '../ui';
import { Carta, CartBar, LiveOrder, ShareModal } from '../components';
import { FadeView, TiltCard } from '../components/fx';
import { toast } from 'sonner';

/** App del cliente v3 — dashboard de dos estados:
 *  FUERA: saludo display + pase hero + carrusel de contexto + "Tu gente".
 *  DENTRO (tras escanear en puerta): pase plegado a chip, carta en primer
 *  plano y cápsula viva con el turno. */
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
    if (!confirm('¿Cerrar tu pase en este dispositivo? Podrás volver a abrirlo con tu enlace de WhatsApp.')) return;
    try { localStorage.removeItem('micaseta_t'); } catch {}
    location.href = '/app/';
  };

  const tabs = CLIENT_TABS.filter((t) =>
    t.id === 'inicio'
    || (t.id === 'pedir' && me.canOrder)
    || (t.id === 'gastos' && (esSocio || me.canOrder))
    || (t.id === 'invitar' && esSocio));

  const onSent = (r: any) => { setLive(r); toast('Pedido enviado: te avisamos cuando esté listo'); setTab('inicio'); load(); };

  return (
    <>
      {live && <LiveOrder token={token} {...live} onDone={() => { setLive(null); load(); }} />}
      {tab !== 'inicio' && (
        <TopBar back="Inicio" onBack={() => setTab('inicio')} title={me.caseta} />
      )}
      <Page className={tab === 'inicio' ? 'pt-0' : ''}>
        <FadeView id={tab + (dentro ? ':in' : ':out')}>
          {tab === 'inicio' && <VistaInicio me={me} token={token} dentro={dentro} onSalir={salir} onTab={setTab} onSent={onSent} extra={extra} />}
          {tab === 'pedir' && <VistaPedir me={me} token={token} onSent={onSent} />}
          {tab === 'gastos' && <VistaGastos me={me} />}
          {tab === 'invitar' && <VistaInvitar me={me} token={token} reload={load} />}
          {extra && tab === extra.id && extra.content}
        </FadeView>
      </Page>
      <Dock tabs={tabs} tab={extra && tab === extra.id ? 'inicio' : tab} onTab={setTab} />
    </>
  );
}

const Dead = ({ msg }: { msg: string }) => (
  <><TopBar /><Page><div className="rounded-xl bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">{msg}</div></Page></>
);

const saludo = () => {
  const h = new Date().getHours();
  return h < 7 || h >= 20 ? 'Buenas noches' : h < 14 ? 'Buenos días' : 'Buenas tardes';
};

/** El pase: el billete de siempre — banda, kicker/año, nombre grande, troquel
 *  y QR a la izquierda con su texto — en papel y cobalto. */
function Pase({ me }: any) {
  const esSocio = me.role === 'socio';
  const kicker = esSocio ? 'Socio titular' : me.canOrder ? 'Invitación con consumo' : 'Invitación · solo entrada';
  return (
    <div className="overflow-hidden rounded-pase border border-papel-borde bg-papel text-tinta shadow-pase">
      <div className="banda h-2.5" />
      <div className="p-6 pb-5">
        <div className="kick flex justify-between text-[12px] font-extrabold tracking-[.02em]">
          <span className="text-primary">{kicker}</span>
          <span className="text-tinta-humo tabular-nums">{new Date().getFullYear()}</span>
        </div>
        <h1 className="mt-4 break-words text-[42px] font-black leading-[.98] tracking-[-.045em]">{me.name}</h1>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-[14px] font-bold text-tinta-suave">{me.caseta}</span>
          {!esSocio && me.hostName && <span className="kick text-[12px] font-extrabold tracking-[.01em] text-primary">Invita {me.hostName}</span>}
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-papel-borde">
        <span className="absolute -top-3.5 left-[-16px] h-7 w-7 rounded-full bg-white" />
        <span className="absolute -top-3.5 right-[-16px] h-7 w-7 rounded-full bg-white" />
      </div>
      <div className="flex items-center gap-5 p-6 pt-5">
        <div className="w-[140px] flex-shrink-0 overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_1px_0_rgba(0,0,0,.05)]">
          <img src={'/qr.png?t=' + encodeURIComponent(me.qrToken)} alt="Tu código QR" className="w-full" />
        </div>
        <div className="min-w-0">
          <b className="block text-[15px] font-extrabold tracking-tight">{me.canOrder ? 'Puerta y barra' : 'Puerta'}</b>
          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-tinta-humo">
            {me.canOrder ? 'Un solo código para entrar y pedir a tu cuenta.' : 'Presenta este código en la entrada.'}
          </span>
          <em className={cn('kick mt-3 flex items-center gap-1.5 text-[12px] font-extrabold not-italic tracking-[.01em]',
            me.accessOk ? 'text-success' : 'text-destructive')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', me.accessOk ? 'bg-success' : 'bg-destructive')} />
            {me.accessOk ? 'Válido hoy' : 'Sin acceso'}
          </em>
        </div>
      </div>
    </div>
  );
}

/** Chip del pase plegado (estado dentro). */
function PaseChip({ me }: any) {
  const hora = me.checkinAt ? new Date(me.checkinAt.replace(' ', 'T')).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-papel-borde bg-papel text-tinta shadow-pchip">
      <span className="banda-v w-[6px] self-stretch" />
      <span className="my-2 w-[52px] rounded-[10px] bg-white p-1.5">
        <img src={'/qr.png?t=' + encodeURIComponent(me.qrToken)} alt="" className="block w-full" />
      </span>
      <span className="min-w-0 flex-1 py-3">
        <small className="kick block text-[10.5px] font-bold text-primary">{me.role === 'socio' ? 'Socio titular' : 'Invitación'}</small>
        <b className="block truncate text-[14px] font-extrabold tracking-tight">{me.name}</b>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap pr-3.5 text-[10.5px] font-extrabold text-success">
        <i className="animate-pulse-dot h-[7px] w-[7px] rounded-full bg-success" />Dentro{hora ? ` · ${hora}` : ''}
      </span>
    </div>
  );
}

function VistaInicio({ me, token, dentro, onSalir, onTab, onSent, extra }: any) {
  const esSocio = me.role === 'socio';
  const pend = esSocio ? me.gastos.people.reduce((a: number, p: any) => a + p.pending_cents, 0) : 0;
  const total = esSocio ? me.gastos.people.reduce((a: number, p: any) => a + p.total_cents, 0) : 0;
  const nPend = esSocio ? me.gastos.detail.filter((d: any) => !d.settled).length : 0;

  if (dentro) return <Dentro me={me} token={token} onSent={onSent} onTab={onTab} />;

  return (
    <>
      {/* Saludo display, sin caja */}
      <div className="relative px-1.5 pt-4">
        <h1 className="text-[27px] font-black leading-[1.02] tracking-[-.035em]">{saludo()},<br />{String(me.name).split(' ')[0]}</h1>
        <p className="mt-1.5 text-[12.5px] font-semibold text-muted-foreground">{me.caseta}</p>
        <button className="absolute right-0 top-4" onClick={onSalir} aria-label="Salir"><Avatar name={me.name} /></button>
      </div>
      {!me.accessOk && <div className="mt-3 rounded-xl bg-destructive/10 p-3.5 text-[13px] font-bold text-destructive">{me.accessReason}</div>}

      {/* El pase, objeto hero */}
      <div className="px-0 pt-4 [perspective:900px]">
        <TiltCard><Pase me={me} /></TiltCard>
      </div>

      {me.wallet && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && (
        <a href={'/gapi/wallet.pkpass?t=' + encodeURIComponent(me.qrToken)} className="mt-3.5 block">
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black font-bold text-white">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.11-.78 1.44.12 2.51.68 3.21 1.7-2.94 1.76-2.48 5.63.66 6.89-.55 1.42-1.26 2.83-2.06 4.36zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Añadir a Apple Wallet
          </button>
        </a>
      )}

      {/* Carrusel de contexto */}
      <div className="-mx-[18px] mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none]">
        {(esSocio || me.canOrder) && (
          <button className="w-[76%] flex-shrink-0 snap-start rounded-2xl border border-card-border bg-card p-4 px-[18px] text-left shadow-mod transition-transform active:scale-[.97]" onClick={() => onTab('gastos')}>
            <Kick className="mb-0">Tu cuenta</Kick>
            <span className="mt-2 flex items-baseline justify-between">
              <b className="text-[24px] font-black tabular-nums tracking-tight">
                {esSocio ? eur(pend) : me.remainingCents === null ? 'Sin límite' : eur(me.remainingCents)}
              </b>
              <span className="text-[11.5px] font-bold text-primary">Ver ›</span>
            </span>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug text-muted-foreground">
              {esSocio ? (nPend ? `${nPend} comanda${nPend === 1 ? '' : 's'} pendiente${nPend === 1 ? '' : 's'} de liquidar` : 'Nada pendiente de liquidar')
                : me.remainingCents === null ? `A cuenta de ${me.hostName ?? 'tu socio'}` : `Te queda a cuenta de ${me.hostName ?? 'tu socio'}`}
            </p>
          </button>
        )}
        {esSocio && (
          <button className="w-[76%] flex-shrink-0 snap-start rounded-2xl border border-card-border bg-card p-4 px-[18px] text-left shadow-mod transition-transform active:scale-[.97]" onClick={() => onTab('gastos')}>
            <Kick className="mb-0">Histórico</Kick>
            <span className="mt-2 flex items-baseline justify-between">
              <b className="text-[24px] font-black tabular-nums tracking-tight">{eur(total)}</b>
              <span className="text-[11.5px] font-bold text-primary">Ver ›</span>
            </span>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug text-muted-foreground">Temporada {new Date().getFullYear()}</p>
          </button>
        )}
        {extra && (
          <button className="w-[76%] flex-shrink-0 snap-start rounded-2xl border border-card-border bg-card p-4 px-[18px] text-left shadow-mod transition-transform active:scale-[.97]" onClick={() => onTab(extra.id)}>
            <Kick className="mb-0">Gestión</Kick>
            <span className="mt-2 flex items-baseline justify-between">
              <b className="text-[24px] font-black tracking-tight">{extra.label}</b>
              <span className="text-[11.5px] font-bold text-primary">Abrir ›</span>
            </span>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug text-muted-foreground">Aforo, caja y cuentas de la noche</p>
          </button>
        )}
      </div>

      {/* Tu gente: sección tipográfica, sin cajas */}
      {esSocio && (
        <div className="px-1.5">
          <SectionTitle>Tu gente</SectionTitle>
          {(me.invitaciones ?? []).filter((i: any) => i.status !== 'cancelada').slice(0, 4).map((i: any) => (
            <div key={i.id} className="flex items-center gap-3 border-b border-border py-[13px]">
              <Avatar name={i.guestName} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-extrabold tracking-tight">{i.guestName ?? 'Invitado'}</b>
                <small className="mt-0.5 block text-[11.5px] text-muted-foreground">
                  {i.canOrder ? (i.spendLimitCents === null ? 'Con consumo · sin límite' : `Con consumo · límite ${eur(i.spendLimitCents)}`) : 'Solo entrada'}
                </small>
              </div>
              <Chip tone={i.status === 'aceptada' ? 'ok' : 'soft'}>{i.status === 'aceptada' ? 'Aceptada' : 'Pendiente'}</Chip>
            </div>
          ))}
          <button className="flex w-full items-center gap-3 py-[13px] text-left" onClick={() => onTab('invitar')}>
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">+</span>
            <span className="min-w-0 flex-1">
              <b className="block text-[14px] font-extrabold tracking-tight text-primary">Invitar a alguien</b>
              <small className="mt-0.5 block text-[11.5px] text-muted-foreground">Se registra con su selfie y recibe su pase</small>
            </span>
          </button>
        </div>
      )}
    </>
  );
}

/** Estado DENTRO: pase plegado a chip, la carta en primer plano, "Esta noche". */
function Dentro({ me, token, onSent, onTab }: any) {
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
      <div className="pt-10"><PaseChip me={me} /></div>
      {me.canOrder ? (
        <div className="mt-5 px-1.5">
          <Kick className="mb-0">
            {esSocio ? 'La carta · va a tu cuenta' : `La carta · a cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · quedan ${eur(me.remainingCents)}` : ''}`}
          </Kick>
          <Carta products={me.products} qty={qty} setQty={setQty} />
          <CartBar products={me.products} qty={qty} label="Enviar pedido" onSend={send} err={err} busy={busy} />
        </div>
      ) : (
        <div className="mt-5 px-1.5"><Empty>Tu invitación es solo de entrada: pide directamente en la barra.</Empty></div>
      )}
      {esSocio && (
        <div className="px-1.5 pb-2">
          <SectionTitle>Esta noche</SectionTitle>
          {estaNoche.length === 0 && <Empty>Aún no hay consumo esta noche.</Empty>}
          {estaNoche.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 border-b border-border py-[13px]">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-extrabold tracking-tight">{d.items ?? 'Comanda'}</b>
                <small className="mt-0.5 block text-[11.5px] text-muted-foreground">{fmtFecha(d.created_at)}{nombres[d.customer_id] ? ` · ${nombres[d.customer_id]}` : ''}</small>
              </div>
              <span className="text-[13.5px] font-bold tabular-nums">{eur(d.total_cents)}</span>
            </div>
          ))}
          {estaNoche.length > 0 && (
            <div className="flex items-center justify-between py-[13px]">
              <b className="text-[14px] font-extrabold tracking-tight">Cuenta de la noche</b>
              <span className="text-[16px] font-black tabular-nums">{eur(totalNoche)}</span>
            </div>
          )}
        </div>
      )}
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
    <div className="px-1.5">
      <div className="pb-1 pt-1">
        <b className="text-[24px] font-black tracking-[-.03em]">Pedir</b>
        <small className="mt-1 block text-[12.5px] text-muted-foreground">
          {me.role === 'socio' ? 'Todo va a tu cuenta.' : `A cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · quedan ${eur(me.remainingCents)}` : ''}.`}
        </small>
      </div>
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
        <div className="px-1.5 pb-3 pt-1">
          <b className="text-[24px] font-black tracking-[-.03em]">Tu cuenta</b>
          <small className="mt-1 block text-[12.5px] text-muted-foreground">Todo va a la cuenta de {me.hostName ?? 'tu socio'}: tú no pagas nada.</small>
        </div>
        <Card><CardBody>
          <Kick className="mb-1.5">Has consumido</Kick>
          <div className="flex items-baseline justify-between">
            <span className="text-[44px] font-black leading-none tracking-[-.04em] tabular-nums">{eur(me.spentCents)}</span>
          </div>
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
      <div className="px-1.5 pb-3 pt-1">
        <b className="text-[24px] font-black tracking-[-.03em]">Tu cuenta</b>
        <small className="mt-1 block text-[12.5px] text-muted-foreground">Lo tuyo y lo de tus invitados, comanda a comanda.</small>
      </div>
      <Card className="mb-3"><div className="banda h-1" /><CardBody>
        <Kick className="mb-1.5">Pendiente de liquidar</Kick>
        <span className="text-[44px] font-black leading-none tracking-[-.04em] tabular-nums">{eur(pend)}</span>
        <Stats items={[[nPend, 'Comandas'], [me.gastos.people.length, 'Personas'], [eur(total), 'Histórico']]} />
      </CardBody></Card>
      <Card><CardBody>
        <Kick>Por persona</Kick>
        {me.gastos.people.length === 0 && <Empty>Aún no hay consumo. Cuando tú o tus invitados pidáis, saldrá aquí.</Empty>}
        {me.gastos.people.map((p: any) => (
          <div key={p.customer_id} className="border-b border-border last:border-0">
            <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setOpen(open === p.customer_id ? null : p.customer_id)}>
              <Avatar name={p.customer_name} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-extrabold">{p.es_socio ? 'Tú' : p.customer_name}</b>
                <small className="text-[11.5px] text-muted-foreground">{p.n_orders} comanda{p.n_orders === 1 ? '' : 's'}</small>
              </div>
              <span className="text-[14px] font-bold tabular-nums">{eur(p.pending_cents)}</span>
            </button>
            {open === p.customer_id && (
              <div className="mb-3 rounded-lg bg-secondary/70 px-3">
                {me.gastos.detail.filter((d: any) => d.customer_id === p.customer_id).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-2 border-b border-border py-2.5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{d.items ?? 'Comanda'}</b>
                      <small className="text-muted-foreground">{fmtFecha(d.created_at)}</small>
                    </div>
                    <Chip tone={d.settled ? 'ok' : 'muted'}>{d.settled ? 'Pagada' : 'Pendiente'}</Chip>
                    <span className="text-sm font-bold tabular-nums">{eur(d.total_cents)}</span>
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

function VistaInvitar({ me, token, reload }: any) {
  const [form, setForm] = useState({ guestName: '', guestPhone: '', limit: '', date: '' });
  const [type, setType] = useState<'barra' | 'entrada'>('barra');
  const [err, setErr] = useState('');
  const [share, setShare] = useState<any>(null);

  const crear = async () => {
    setErr('');
    try {
      const r = await api('/gapi/mi/invitar', { t: token, ...form, guestPhone: form.guestPhone || null, limit: form.limit || null, date: form.date || null, type });
      setForm({ guestName: '', guestPhone: '', limit: '', date: '' });
      await reload();
      setShare({ title: 'Invitación creada', text: r.shareText, url: r.shareUrl, phone: r.guestPhone });
    } catch (e: any) { setErr(e.message); }
  };

  const Opt = ({ id, title, sub }: any) => (
    <button type="button" onClick={() => setType(id)}
      className={cn('mt-2 flex w-full items-center gap-3 rounded-lg p-3 px-3.5 text-left transition-all',
        type === id ? 'bg-primary/[.16] ring-2 ring-primary' : 'bg-secondary')}>
      <span className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-extrabold tracking-tight">{title}</b>
        <small className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{sub}</small>
      </span>
      <span className={cn('h-[18px] w-[18px] flex-shrink-0 rounded-full',
        type === id ? 'shadow-[inset_0_0_0_2px_#3D5AF5] [background:radial-gradient(circle,#3D5AF5_0_4.5px,transparent_5px)]' : 'shadow-[inset_0_0_0_2px_#B4BAC8]')} />
    </button>
  );

  return (
    <>
      <div className="px-1.5 pb-3 pt-1">
        <b className="text-[24px] font-black tracking-[-.03em]">Invitar</b>
        <small className="mt-1 block text-[12.5px] text-muted-foreground">Tu invitado se registra con su selfie y recibe su pase al momento.</small>
      </div>
      <Card className="mb-3"><CardBody>
        <Label className="mt-0">Nombre de tu invitado</Label>
        <Input value={form.guestName} onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} placeholder="Ana López" />
        <Label>Su móvil <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input value={form.guestPhone} onChange={(e: any) => setForm({ ...form, guestPhone: e.target.value })} placeholder="698 765 432" inputMode="tel" />
        <Label>Tipo de invitación</Label>
        <Opt id="barra" title="Con consumo" sub="Pide a tu cuenta, con límite si quieres" />
        <Opt id="entrada" title="Solo entrada" sub="Su pase abre la puerta, sin consumo" />
        <div className={cn('grid grid-cols-2 gap-2.5', type === 'entrada' && 'hidden')}>
          <div><Label>Límite de gasto</Label>
            <Input value={form.limit} onChange={(e: any) => setForm({ ...form, limit: e.target.value })} placeholder="Sin límite" inputMode="decimal" /></div>
          <div><Label>Solo un día</Label>
            <Input type="date" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <Button className="mt-[18px] w-full" onClick={crear}>Crear invitación</Button>
        <Err>{err}</Err>
      </CardBody></Card>

      <Card><CardBody>
        <Kick>Mis invitaciones</Kick>
        {(me.invitaciones ?? []).length === 0 && <Empty>Todavía no has invitado a nadie.</Empty>}
        {(me.invitaciones ?? []).map((i: any) => (
          <div key={i.id} className="flex items-center gap-2 border-b border-border py-3 last:border-0">
            <Avatar name={i.guestName} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[14px] font-extrabold">{i.guestName ?? 'Invitado'}</b>
              <small className="block truncate text-[11.5px] text-muted-foreground">
                {i.canOrder ? (i.spendLimitCents === null ? 'Con consumo · sin límite' : `Con consumo · ${eur(i.spendLimitCents)}`) : 'Solo entrada'}
                {i.validDate ? ' · ' + i.validDate : ''}
              </small>
            </div>
            <Chip tone={i.status === 'aceptada' ? 'ok' : i.status === 'cancelada' ? 'bad' : 'soft'}>
              {i.status === 'aceptada' ? 'Aceptada' : i.status === 'cancelada' ? 'Cancelada' : 'Pendiente'}
            </Chip>
            {i.status !== 'cancelada' && <>
              <LinkBtn onClick={() => setShare({ title: 'Compartir invitación', text: i.shareText, url: i.shareUrl })}>Enviar ›</LinkBtn>
              <button className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-muted-foreground" aria-label="Cancelar invitación" onClick={async () => {
                if (!confirm('¿Cancelar esta invitación? Su pase dejará de funcionar.')) return;
                await api(`/gapi/mi/invitaciones/${i.id}/cancelar`, { t: token });
                toast('Invitación cancelada: su pase ya no funciona');
                reload();
              }}><X size={16} /></button>
            </>}
          </div>
        ))}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})}
        note="Envíasela: se registra con su selfie y recibe su pase al momento." />
    </>
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
  return (
    <>
      <TopBar />
      <Page>
        <div className="overflow-hidden rounded-pase border border-papel-borde bg-papel text-tinta shadow-pase">
          <div className="banda h-3" />
          <div className="p-6 pb-4">
            <div className="kick text-[12px] font-bold tracking-[.02em] text-primary">{inv.socio} te invita a</div>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-[-.04em]">{inv.caseta}</h1>
          </div>
          <div className="px-6 pb-5">
            {String(inv.conditions).split('\n').map((line: string, i: number) => (
              <div key={i} className="border-b border-papel-borde py-2.5 text-[14px] font-semibold last:border-0">{line}</div>
            ))}
          </div>
        </div>
        <Card className="mt-3.5"><CardBody>
          <h3 className="text-base font-extrabold tracking-tight">Acepta con tu selfie</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Tu cara es tu entrada: en la puerta comprueban que el pase es tuyo.</p>
          <Label>Tu nombre</Label>
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellidos" />
          {inv.needsPhone && (<><Label>Tu WhatsApp</Label>
            <Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></>)}
          <div className="mt-4 flex items-center gap-4">
            <img src={photo ?? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><rect width="84" height="84" rx="42" fill="#EEF1F8"/></svg>')}
              alt="" className="h-[84px] w-[84px] rounded-full border-2 border-dashed border-primary/40 object-cover" />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Camera size={16} /> Hacer o elegir selfie</Button>
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
              onChange={(e: any) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={go}>Aceptar invitación</Button>
          <Err>{err}</Err>
        </CardBody></Card>
      </Page>
    </>
  );
}
