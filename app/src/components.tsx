import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ArrowRight, Copy, Minus, Plus } from './components/icons';
import { api, eur, waShare, CAT_LABELS, sortProducts } from './lib/api';
import { Button, Card, CardBody, Chip, Err, Input, Label, Modal, cn } from './ui';
import { Cascade, NumberTicker } from './components/fx';
import { toast } from 'sonner';

// ── La carta editorial: categorías como titulares, filas a sangre ──

export function Carta({ products, qty, setQty }: any) {
  const cats: string[] = [...new Set(sortProducts(products).map((p: any) => p.category))] as string[];
  const [cat, setCat] = useState(cats[0] ?? null);
  const active = cats.includes(cat as string) ? cat : cats[0];
  return (
    <div>
      <div className="-mx-1 flex items-baseline gap-5 overflow-x-auto whitespace-nowrap px-1 pb-1 pt-2 [scrollbar-width:none]">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn('flex-shrink-0 text-[26px] font-black tracking-tighter transition-colors',
              c === active ? 'text-foreground' : 'text-foreground/20')}>
            {CAT_LABELS[c] ?? c}
          </button>
        ))}
      </div>
      <div className="mt-3 pb-2" key={String(active)}>
        {sortProducts(products).filter((p: any) => p.category === active).map((p: any, idx: number) => {
          const n = qty[p.id] || 0;
          const add = () => setQty({ ...qty, [p.id]: n + 1 });
          return (
            <Cascade key={p.id} i={idx}>
            <div onClick={n ? undefined : add}
              className={cn('flex cursor-pointer select-none items-center gap-3 py-[15px]',
                n ? '-mx-3 my-0.5 rounded-lg bg-secondary px-3' : 'border-b border-border px-0.5')}>
              <b className="min-w-0 flex-1 text-[16px] font-extrabold tracking-tight">{p.name}</b>
              <span className="text-[17px] font-black tabular-nums tracking-tight">{eur(p.price_cents)}</span>
              {n > 0 && (
                <span className="flex items-center rounded-full bg-primary p-1 text-primary-foreground" onClick={(e) => e.stopPropagation()}>
                  <button className="grid h-8 w-8 place-items-center" onClick={() => setQty({ ...qty, [p.id]: n - 1 })}><Minus size={16} /></button>
                  <b className="min-w-5 text-center text-[15px] font-black">{n}</b>
                  <button className="grid h-8 w-8 place-items-center" onClick={add}><Plus size={16} /></button>
                </span>
              )}
            </div>
            </Cascade>
          );
        })}
      </div>
    </div>
  );
}

export function CartBar({ products, qty, label, onSend, err, busy }: any) {
  const n = Object.values(qty).reduce((a: number, b: any) => a + b, 0) as number;
  let total = 0;
  for (const p of products) total += (qty[p.id] || 0) * p.price_cents;
  if (n === 0 && !err) return null;
  return (
    <div className="fixed inset-x-0 z-30 mx-auto max-w-md px-5" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
      {err && <p className="mb-2 text-center text-[13px] font-bold text-destructive">{err}</p>}
      <button onClick={onSend} disabled={busy || n === 0}
        className="flex w-full items-center gap-3 rounded-full bg-primary py-2.5 pl-6 pr-2.5 text-primary-foreground shadow-glow transition-transform active:scale-[.98] disabled:opacity-50">
        <span className="text-[15px] font-extrabold tracking-tight">{label}</span>
        <span className="ml-auto text-[19px] font-black tabular-nums tracking-tight">{eur(total)}</span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-foreground text-primary">
          <ArrowRight size={18} strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}

// ── El turno: número gigante con halo, fases segmentadas ──

export function OrderTracker({ token, orderId, pickupNumber, totalCents, onBack, hostName }: any) {
  const [status, setStatus] = useState('pendiente');
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const st = await api(`/gapi/mi/pedido-estado?t=${encodeURIComponent(token)}&id=${orderId}`, undefined, 'GET');
        setStatus((prev: string) => {
          if (st.status === 'lista' && prev !== 'lista' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return st.status;
        });
        if (st.status === 'servida') clearInterval(id);
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [orderId]);
  const listo = status === 'lista';
  const servido = status === 'servida';
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <p className="text-[13px] font-bold text-muted-foreground">Tu pedido</p>
      <div className={cn('glow-turno my-1 text-[200px] font-black leading-[.9] tracking-tighter tabular-nums', listo || servido ? 'text-primary' : 'text-lona')}>
        <NumberTicker value={pickupNumber ?? null} />
      </div>
      <span className={cn('inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[14px] font-extrabold',
        listo ? 'animate-pop bg-primary text-primary-foreground shadow-glow' : servido ? 'bg-primary/15 text-primary' : 'bg-menta/10 text-menta')}>
        {!servido && <span className={cn('h-2 w-2 rounded-full', listo ? 'bg-primary-foreground' : 'animate-pop bg-menta')} />}
        {status === 'pendiente' && 'En preparación'}
        {listo && '¡Listo! Recógelo en la barra'}
        {servido && 'Entregado · ¡que aproveche!'}
      </span>
      <p className="mt-5 text-[15px] font-bold">Pedido enviado · {eur(totalCents)}</p>
      <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground">
        {servido ? `Cargado a la cuenta de ${hostName ?? 'tu socio'}.`
          : listo ? 'Tu número está en la pantalla de la caseta.'
          : 'Cuando esté listo, tu número saldrá en la pantalla de la caseta y este móvil vibrará.'}
      </p>
      <div className="mt-7 flex w-[240px] gap-1.5">
        <span className="h-1.5 flex-1 rounded-full bg-primary" />
        <span className={cn('h-1.5 flex-1 rounded-full', listo || servido ? 'bg-primary' : 'bg-menta shadow-[0_0_14px_rgba(167,233,192,.6)]')} />
        <span className={cn('h-1.5 flex-1 rounded-full', servido ? 'bg-primary' : listo ? 'bg-menta shadow-[0_0_14px_rgba(167,233,192,.6)]' : 'bg-white/10')} />
      </div>
      <div className="mt-2.5 flex w-[240px] justify-between text-[11px] font-bold">
        <span className="text-primary">Enviado</span>
        <span className={listo || servido ? 'text-primary' : 'text-menta'}>En preparación</span>
        <span className={servido ? 'text-primary' : listo ? 'text-menta' : 'text-muted-foreground'}>Listo</span>
      </div>
      <Button variant="outline" className="mt-9 w-full" onClick={onBack}>Volver</Button>
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
      {!on && <Button className="w-full" size="lg" onClick={start}>Escanear código QR</Button>}
      <Label>O introduce el código manualmente</Label>
      <div className="flex gap-2">
        <Input value={manual} onChange={(e: any) => setManual(e.target.value)} placeholder="Código del QR" />
        <Button variant="secondary" onClick={() => manual.trim() && onScan(manual.trim())}>Ir</Button>
      </div>
      {demos.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-bold text-muted-foreground">Modo demo — simula un escaneo</p>
          <div className="flex flex-col gap-2">
            {demos.map((d) => <Button key={d.label} variant="outline" size="sm" className="justify-start" onClick={() => onScan(d.token)}>{d.label}</Button>)}
          </div>
        </div>
      )}
    </CardBody></Card>
  );
}

// ── Ficha de la persona escaneada ──

export function PersonCard({ info, big }: { info: any; big?: boolean }) {
  const initials = (info.name ?? '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className={cn('flex items-center gap-4', big && 'flex-col text-center')}>
      {info.photoUrl ? (
        <img src={info.photoUrl} alt="" className={cn('flex-shrink-0 rounded-xl bg-secondary object-cover', big ? 'h-36 w-36' : 'h-[76px] w-[76px]')} />
      ) : (
        <div className={cn('grid flex-shrink-0 place-items-center rounded-xl bg-primary/15 font-black tracking-tight text-primary', big ? 'h-36 w-36 text-[44px]' : 'h-[76px] w-[76px] text-[26px]')}>
          {initials}
        </div>
      )}
      <div className={cn('min-w-0', !big && 'flex-1')}>
        <div className="truncate text-[17px] font-black tracking-tight">{info.name || 'Sin nombre'}{(info.role === 'socio' || info.role === 'admin') && ' · Socio'}</div>
        {info.hostName && <div className="text-[12.5px] font-semibold text-muted-foreground">Invita: {info.hostName}</div>}
        <div className="mt-2"><Chip tone={info.ok ? 'ok' : 'bad'}>{info.ok ? 'Acceso OK' : 'Sin acceso'}</Chip></div>
        {info.reason && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{info.reason}</div>}
      </div>
    </div>
  );
}

// ── Hoja de compartir por WhatsApp ──

export function ShareModal({ open, onClose, title, text, url, phone, note }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      {note && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{note}</p>}
      <a href={waShare(text, phone)} target="_blank" rel="noreferrer" className="mt-5 block">
        <Button className="w-full">Enviar por WhatsApp</Button>
      </a>
      <Button variant="secondary" className="mt-2.5 w-full" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); toast('Enlace copiado'); }}>
        <Copy size={15} /> {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
      <div className="mt-3 break-all rounded-lg bg-secondary p-3 text-xs text-muted-foreground">{url}</div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>Cerrar</Button>
    </Modal>
  );
}
