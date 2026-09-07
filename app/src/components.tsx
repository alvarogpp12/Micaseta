import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Bubble, Copy, Minus, Plus } from './components/icons';
import { api, eur, waShare, CAT_LABELS, sortProducts } from './lib/api';
import { Button, Card, CardBody, Chip, Input, Kick, Label, Modal, cn } from './ui';
import { Cascade } from './components/fx';
import { toast } from 'sonner';

// ── La carta a sangre: categorías como titulares, filas con hairline ──

export function Carta({ products, qty, setQty }: any) {
  const cats: string[] = [...new Set(sortProducts(products).map((p: any) => p.category))] as string[];
  const [cat, setCat] = useState(cats[0] ?? null);
  const active = cats.includes(cat as string) ? cat : cats[0];
  return (
    <div>
      {/* Categorías como botones grandes y legibles, no titulares en gris */}
      <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-2 pt-2 [scrollbar-width:none]">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn('h-11 flex-shrink-0 whitespace-nowrap rounded-full px-[18px] text-[15px] font-extrabold transition-colors',
              c === active ? 'bg-foreground text-white' : 'bg-secondary text-foreground')}>
            {CAT_LABELS[c] ?? c}
          </button>
        ))}
      </div>
      <div className="mt-1 pb-2" key={String(active)}>
        {sortProducts(products).filter((p: any) => p.category === active).map((p: any, idx: number) => {
          const n = qty[p.id] || 0;
          const add = () => setQty({ ...qty, [p.id]: n + 1 });
          return (
            <Cascade key={p.id} i={idx}>
            <div className="flex min-h-[64px] select-none items-center gap-3 border-b border-border py-2.5 last:border-0">
              <span className="min-w-0 flex-1">
                <b className="block text-[17px] font-extrabold tracking-tight">{p.name}</b>
                <small className="block text-[14px] font-bold tabular-nums text-muted-foreground">{eur(p.price_cents)}</small>
              </span>
              {n > 0 ? (
                <span className="flex items-center rounded-full bg-primary p-1 text-primary-foreground">
                  <button className="grid h-10 w-10 place-items-center" onClick={() => setQty({ ...qty, [p.id]: n - 1 })} aria-label={`Quitar ${p.name}`}><Minus size={20} /></button>
                  <b className="min-w-6 text-center text-[17px] font-black tabular-nums">{n}</b>
                  <button className="grid h-10 w-10 place-items-center" onClick={add} aria-label={`Añadir ${p.name}`}><Plus size={20} /></button>
                </span>
              ) : (
                <button className="inline-flex h-11 items-center gap-1 rounded-full bg-primary/[.14] px-4 text-[15px] font-extrabold text-primary" onClick={add} aria-label={`Añadir ${p.name}`}><Plus size={18} /> Añadir</button>
              )}
            </div>
            </Cascade>
          );
        })}
      </div>
    </div>
  );
}

/** CTA de envío: rectángulo 18px cobalto flotando sobre el dock. */
export function CartBar({ products, qty, label, onSend, err, busy }: any) {
  const n = Object.values(qty).reduce((a: number, b: any) => a + b, 0) as number;
  let total = 0;
  for (const p of products) total += (qty[p.id] || 0) * p.price_cents;
  if (n === 0 && !err) return null;
  return (
    <div className="fixed inset-x-[18px] z-30 mx-auto max-w-md" style={{ bottom: 'calc(5.6rem + env(safe-area-inset-bottom))' }}>
      {err && <p className="mb-2 rounded-xl bg-white/90 p-2 text-center text-[15px] font-bold text-destructive">{err}</p>}
      <button onClick={onSend} disabled={busy || n === 0}
        className="flex h-16 w-full items-center justify-between rounded-2xl bg-primary px-[22px] text-primary-foreground shadow-glow-cta transition-transform active:scale-[.98] disabled:opacity-50">
        <span className="text-[18px] font-extrabold tracking-tight">{label}</span>
        <i className="not-italic text-[18px] font-black tabular-nums">{n} · {eur(total)}</i>
      </button>
    </div>
  );
}

// ── La cápsula viva: el turno flotando arriba mientras sigues en la carta ──

export function LiveOrder({ token, orderId, pickupNumber, totalCents, onDone }: any) {
  const [status, setStatus] = useState('pendiente');
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const st = await api(`/gapi/mi/pedido-estado?t=${encodeURIComponent(token)}&id=${orderId}`, undefined, 'GET');
        setStatus((prev: string) => {
          if (st.status === 'lista' && prev !== 'lista' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return st.status;
        });
        if (st.status === 'servida') { clearInterval(id); setTimeout(() => onDone?.(), 4000); }
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [orderId]);
  const listo = status === 'lista';
  const servido = status === 'servida';
  return (
    <div className={cn('fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 pl-4 text-[15px] font-extrabold shadow-[0_12px_30px_rgba(0,0,0,.5)]',
      servido ? 'border-success/20 bg-success text-success-foreground' : 'border-white/10 bg-[rgba(5,6,10,.94)] text-[#F2F2EF]')}
      style={{ top: 'calc(.75rem + env(safe-area-inset-top))' }}>
      {!servido && <i className={cn('h-2 w-2 rounded-full bg-[#9DB0FF]', !listo && 'animate-pulse-dot')} />}
      <span>
        {servido ? 'Entregado · ¡que aproveche!' : listo ? '¡Listo! En la barra · turno' : 'En preparación · turno'}
      </span>
      {!servido && <b className="tabular-nums text-[#9DB0FF]">{pickupNumber ?? '—'}</b>}
      {totalCents != null && !servido && <span className="text-white/40">·</span>}
      {totalCents != null && !servido && <span className="tabular-nums text-white/70">{eur(totalCents)}</span>}
    </div>
  );
}

// ── Escáner QR (cámara + código manual + botones demo) ──

export function Scanner({ onScan, hint }: { onScan: (qr: string) => void; hint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [manual, setManual] = useState('');
  const [demos, setDemos] = useState<any[]>([]);
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    api('/api/demo-qrs', undefined, 'GET').then((d) => Array.isArray(d) && setDemos(d)).catch(() => {});
    return () => stop.current();
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setOn(true);
      let live = true;
      stop.current = () => { live = false; stream.getTracks().forEach((t) => t.stop()); setOn(false); };
      const canvas = document.createElement('canvas');
      const tick = () => {
        if (!live) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const c = canvas.getContext('2d')!;
          c.drawImage(video, 0, 0);
          const img = c.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) { stop.current(); onScan(code.data); return; }
        }
        requestAnimationFrame(tick);
      };
      tick();
    } catch { alert('No se pudo abrir la cámara. Usa el campo manual.'); }
  };

  return (
    <Card><CardBody>
      {hint && <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
      <video ref={videoRef} playsInline className={cn('w-full rounded-xl bg-black', !on && 'hidden')} />
      {!on && <Button className="w-full" size="lg" onClick={start}>Escanear el pase</Button>}
      <Label>O introduce el código manualmente</Label>
      <div className="flex gap-2">
        <Input value={manual} onChange={(e: any) => setManual(e.target.value)} placeholder="Código del QR" />
        <Button variant="secondary" onClick={() => manual.trim() && onScan(manual.trim())}>Ir</Button>
      </div>
      {demos.length > 0 && (
        <div className="mt-5">
          <Kick className="mb-2">Modo demo — simula un escaneo</Kick>
          <div className="flex flex-col gap-2">
            {demos.map((d) => <Button key={d.label} variant="outline" size="sm" className="justify-start" onClick={() => onScan(d.token)}>{d.label}</Button>)}
          </div>
        </div>
      )}
    </CardBody></Card>
  );
}

// ── Ficha compacta de la persona escaneada (comanda en barra) ──

export function PersonCard({ info }: { info: any }) {
  const initials = (info.name ?? '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className="flex items-center gap-4">
      {info.photoUrl ? (
        <img src={info.photoUrl} alt="" className="h-[76px] w-[76px] flex-shrink-0 rounded-xl bg-secondary object-cover" />
      ) : (
        <div className="grid h-[76px] w-[76px] flex-shrink-0 place-items-center rounded-xl bg-primary/[.18] text-[26px] font-black tracking-tight text-primary">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-black tracking-tight">{info.name || 'Sin nombre'}{(info.role === 'socio' || info.role === 'admin') && ' · Socio'}</div>
        {info.hostName && <div className="text-[12.5px] font-semibold text-muted-foreground">Invita: {info.hostName}</div>}
        <div className="mt-2"><Chip tone={info.ok ? 'ok' : 'bad'}>{info.ok ? 'Acceso OK' : 'Sin acceso'}</Chip></div>
        {info.reason && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{info.reason}</div>}
      </div>
    </div>
  );
}

/** Veredicto de puerta a pantalla completa: foto + nombre + verde/rojo. */
export function Veredicto({ info }: { info: any }) {
  const initials = (info.name ?? '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className="grid place-items-center pt-8 text-center">
      {info.photoUrl ? (
        <img src={info.photoUrl} alt="" className="h-[132px] w-[132px] rounded-xl bg-secondary object-cover" />
      ) : (
        <span className={cn('grid h-[132px] w-[132px] place-items-center rounded-xl text-[40px] font-black',
          info.ok ? 'bg-primary/[.18] text-primary' : 'bg-destructive/[.16] text-destructive')}>{info.ok ? initials : '?'}</span>
      )}
      <h3 className="mt-3.5 text-[27px] font-black tracking-[-.03em]">{info.name || 'Sin nombre'}</h3>
      <small className="mt-1 block text-[12.5px] text-muted-foreground">
        {info.reason ?? (info.role === 'socio' || info.role === 'admin' ? 'Socio titular'
          : info.hostName ? `${info.role === 'invitado' ? 'Invitado' : 'Invitada'} de ${info.hostName}${info.canOrder ? ' · con consumo' : ' · solo entrada'}` : '')}
      </small>
      <span className={cn('mt-3 inline-flex items-center gap-2 rounded-full px-[18px] py-2.5 text-[14px] font-extrabold',
        info.ok ? 'bg-success/[.12] text-success' : 'bg-destructive/[.15] text-destructive')}>
        <i className={cn('h-2 w-2 rounded-full', info.ok ? 'bg-success' : 'bg-destructive')} />
        {info.ok ? 'Acceso OK · válido hoy' : 'Sin acceso'}
      </span>
    </div>
  );
}

// ── Hoja de compartir por WhatsApp ──

export function ShareModal({ open, onClose, title, text, url, phone, note }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-[24px] font-black tracking-tight">{title}</h2>
      {note && <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{note}</p>}
      <a href={waShare(text, phone)} target="_blank" rel="noreferrer" className="mt-5 block">
        <Button className="w-full" size="lg"><Bubble size={20} /> Enviar por WhatsApp</Button>
      </a>
      <Button variant="secondary" className="mt-2.5 w-full" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); toast('Enlace copiado'); }}>
        <Copy size={15} /> {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
      <div className="mt-3 break-all rounded-lg bg-secondary p-3 text-[13px] text-muted-foreground">{url}</div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>Cerrar</Button>
    </Modal>
  );
}
