import React, { useEffect, useState } from 'react';
import { QrCode, Beer, Wallet, UserPlus, Camera } from 'lucide-react';
import { api, eur, fmtFecha } from '../lib/api';
import { Avatar, BottomNav, Button, Card, CardBody, Chip, Empty, Err, Input, KPI, Label, Page, Spinner, TopBar, cn } from '../ui';
import { Carta, CartBar, OrderTracker, ShareModal } from '../components';
import { FadeView, TiltCard } from '../components/fx';

/** App del cliente: socio e invitado, misma app, pestañas según rol. */
export function ClientApp({ token }: { token: string }) {
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
  ];

  return (
    <>
      <TopBar title={me.caseta} />
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
          <div className="flex justify-between text-[10.5px] font-extrabold uppercase tracking-[.22em]">
            <span className="text-[#1E7A46]">{esSocio ? 'Socio titular' : me.canOrder ? 'Invitación con barra' : 'Invitación · solo entrada'}</span>
            <span className="text-[#8A8672]">{new Date().getFullYear()}</span>
          </div>
          <h1 className="mt-4 break-words text-[42px] font-black leading-[.98] tracking-tighter">{me.name}</h1>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[14px] font-bold text-[#4A5346]">{me.caseta}</span>
            {!esSocio && me.hostName && <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#1E7A46]">Invita {me.hostName}</span>}
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
            <em className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold not-italic uppercase tracking-[.1em] text-[#1E7A46]">
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
          <span className="block text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
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
      <p className="pt-2 text-[11px] font-extrabold uppercase tracking-[.24em] text-muted-foreground">
        {me.role === 'socio' ? 'La carta · a tu cuenta' : `La carta · a cuenta de ${me.hostName ?? 'tu socio'}${me.remainingCents !== null ? ` · quedan ${eur(me.remainingCents)}` : ''}`}
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
              <div className="mb-3 rounded-lg bg-muted px-3">
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

  return (
    <>
      <Card><CardBody>
        <h3 className="text-base font-bold">Invitar a alguien</h3>
        <Label>Nombre de tu invitado</Label>
        <Input value={form.guestName} onChange={(e: any) => setForm({ ...form, guestName: e.target.value })} placeholder="Ana López" />
        <Label>Su móvil <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input value={form.guestPhone} onChange={(e: any) => setForm({ ...form, guestPhone: e.target.value })} placeholder="698 765 432" inputMode="tel" />
        <Label>Tipo de invitación</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {([['barra', '🍺 Con barra', 'Puede pedir a tu cuenta'], ['entrada', '🎟️ Solo entrada', 'Su QR abre la puerta, sin consumo']] as const).map(([id, b, s]) => (
            <button key={id} type="button" onClick={() => setType(id)}
              className={cn('rounded-xl p-3.5 text-left transition-all', type === id ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary')}>
              <b className="block text-sm font-extrabold">{b}</b>
              <small className="mt-1 block leading-snug text-muted-foreground">{s}</small>
            </button>
          ))}
        </div>
        <div className={cn('grid grid-cols-2 gap-2.5', type === 'entrada' && 'hidden')}>
          <div><Label>Límite € <span className="font-normal text-muted-foreground">(vacío = sin límite)</span></Label>
            <Input value={form.limit} onChange={(e: any) => setForm({ ...form, limit: e.target.value })} placeholder="50" inputMode="decimal" /></div>
          <div><Label>Solo un día</Label>
            <Input type="date" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <Button className="mt-4 w-full" onClick={crear}>Crear invitación</Button>
        <Err>{err}</Err>
      </CardBody></Card>

      <h3 className="mb-2 mt-5 text-sm font-bold text-foreground/80">Mis invitaciones</h3>
      <Card><CardBody>
        {(me.invitaciones ?? []).length === 0 && <Empty>Todavía no has invitado a nadie.</Empty>}
        {(me.invitaciones ?? []).map((i: any) => (
          <div key={i.id} className="flex flex-wrap items-center gap-2.5 border-b border-border py-3 last:border-0">
            <Avatar name={i.guestName} />
            <div className="min-w-[110px] flex-1">
              <b className="block truncate text-[14.5px]">{i.guestName ?? 'Invitado'}</b>
              <small className="text-muted-foreground">
                {i.canOrder ? (i.spendLimitCents === null ? 'con barra · sin límite' : `con barra · hasta ${eur(i.spendLimitCents)}`) : 'solo entrada'}
                {i.validDate ? ' · ' + i.validDate : ''}
              </small>
            </div>
            <Chip tone={i.status === 'aceptada' ? 'ok' : 'muted'}>{i.status}</Chip>
            <Button variant="outline" size="sm" onClick={() => setShare({ title: 'Compartir invitación', text: i.shareText, url: i.shareUrl })}>Compartir</Button>
            <Button variant="ghost" size="sm" onClick={async () => {
              if (!confirm('¿Cancelar esta invitación? Su QR dejará de funcionar.')) return;
              await api(`/gapi/mi/invitaciones/${i.id}/cancelar`, { t: token });
              reload();
            }}>✕</Button>
          </div>
        ))}
      </CardBody></Card>
      <ShareModal open={!!share} onClose={() => setShare(null)} {...(share ?? {})}
        note="Envíasela: se registra con su selfie y recibe su QR al momento." />
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
        <div className="overflow-hidden rounded-[30px] bg-lona text-tinta shadow-carnet">
          <div className="raya h-2.5" />
          <div className="p-6 pb-4">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[.22em] text-[#1E7A46]">{inv.socio} te invita a</div>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-tighter">{inv.caseta}</h1>
          </div>
          <div className="px-6 pb-5">
            {String(inv.conditions).split('\n').map((line: string, i: number) => (
              <div key={i} className="border-b border-[#E5E2D3] py-2.5 text-[14px] font-semibold last:border-0">{line}</div>
            ))}
          </div>
        </div>
        <Card className="mt-3.5"><CardBody>
          <h3 className="text-base font-bold">Acepta con tu selfie</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Tu cara es tu entrada: en la puerta comprueban que el QR es tuyo.</p>
          <Label>Tu nombre</Label>
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellidos" />
          {inv.needsPhone && (<><Label>Tu WhatsApp</Label>
            <Input value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="612 345 678" inputMode="tel" /></>)}
          <div className="mt-4 flex items-center gap-4">
            <img src={photo ?? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><rect width="84" height="84" rx="42" fill="#eef0ff"/></svg>')}
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
