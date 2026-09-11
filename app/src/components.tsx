import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Bubble, CheckCircle2, Copy, Minus, Plus, ScanLine, X } from './components/icons';
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
      {err && <p className="vidrio mb-2 rounded-xl p-2.5 text-center text-[15px] font-bold text-destructive">{err}</p>}
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
      servido ? 'border-success/20 bg-success text-success-foreground' : 'vidrio-oscuro border-transparent')}
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

// ── Escáner QR: la cámara es la pantalla entera, los controles flotan en vidrio ──

const ESQUINAS = [
  'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-[26px]',
  'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-[26px]',
  'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-[26px]',
  'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-[26px]',
];

/** El visor a pantalla completa: vídeo de fondo, encuadre recortado y dos barras
 *  de vidrio (receta 2). De noche y con prisa, la cámara no cabe en una tarjeta. */
function Visor({ videoRef, onClose, onTeclear }: any) {
  // Con el visor abierto la página de detrás no se mueve.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative h-[66vw] max-h-[300px] w-[66vw] max-w-[300px] rounded-[26px] shadow-[0_0_0_100vmax_rgba(12,14,19,.45)]">
          {ESQUINAS.map((c) => <span key={c} className={cn('absolute h-12 w-12 border-white/85', c)} />)}
          <span className="animate-barrido absolute inset-x-4 top-1/2 h-[2px] rounded-full bg-white/70" />
        </div>
      </div>
      <div className="vidrio-oscuro absolute inset-x-0 top-0 flex items-center gap-3 px-4 pb-3 pt-3" style={{ paddingTop: 'calc(.75rem + env(safe-area-inset-top))' }}>
        <p className="min-w-0 flex-1 text-[16px] font-extrabold tracking-tight">Apunta al código del pase</p>
        <button onClick={onClose} aria-label="Cerrar el escáner"
          className="grid h-[56px] w-[56px] flex-shrink-0 place-items-center rounded-full bg-white/15 active:scale-95"><X size={26} /></button>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onTeclear}
          className="vidrio-oscuro flex h-[56px] w-full items-center justify-center rounded-2xl text-[16px] font-extrabold active:scale-[.98]">
          ¿La cámara no va? Teclea el código
        </button>
      </div>
    </div>
  );
}

export function Scanner({ onScan, hint }: { onScan: (qr: string) => void; hint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manual, setManual] = useState('');
  const [manualOn, setManualOn] = useState(false);
  const [err, setErr] = useState('');
  const [demos, setDemos] = useState<any[]>([]);

  useEffect(() => { api('/api/demo-qrs', undefined, 'GET').then((d) => Array.isArray(d) && setDemos(d)).catch(() => {}); }, []);

  const start = async () => {
    setErr('');
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }));
    } catch {
      setErr('No se pudo abrir la cámara. Teclea el código del pase.');
      setManualOn(true);
    }
  };

  // La lectura vive mientras vive el stream: al cerrarlo se apaga la cámara sola.
  useEffect(() => {
    if (!stream) return;
    const video = videoRef.current!;
    video.srcObject = stream;
    let live = true;
    const canvas = document.createElement('canvas');
    const tick = () => {
      if (!live) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const c = canvas.getContext('2d')!;
        c.drawImage(video, 0, 0);
        const img = c.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) { live = false; setStream(null); onScan(code.data); return; }
      }
      requestAnimationFrame(tick);
    };
    video.play().then(tick).catch(() => tick());
    return () => { live = false; stream.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  if (stream) return (
    <Visor videoRef={videoRef}
      onClose={() => setStream(null)}
      onTeclear={() => { setStream(null); setManualOn(true); }} />
  );

  return (
    <Card><CardBody>
      {hint && <p className="mb-4 text-[16px] font-semibold leading-snug text-foreground/80">{hint}</p>}
      <Button className="w-full" size="lg" onClick={start}><ScanLine size={24} /> Escanear el pase</Button>
      {err && <p className="mt-3 text-[15px] font-bold text-destructive">{err}</p>}
      {!manualOn ? (
        <button type="button" className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 text-[15px] font-bold text-primary" onClick={() => setManualOn(true)}>
          ¿La cámara no va? Teclea el código
        </button>
      ) : (
        <>
          <Label>Código del pase</Label>
          <div className="flex gap-2">
            <Input value={manual} onChange={(e: any) => setManual(e.target.value)} placeholder="Pega aquí el código" autoFocus />
            <Button variant="secondary" onClick={() => manual.trim() && onScan(manual.trim())}>Ir</Button>
          </div>
        </>
      )}
      {demos.length > 0 && (
        <div className="mt-5">
          <Kick className="mb-2">Modo demo — simula un escaneo</Kick>
          <div className="flex flex-col gap-2">
            {demos.map((d) => <Button key={d.label} variant="outline" className="justify-start" onClick={() => onScan(d.token)}>{d.label}</Button>)}
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
        <img src={info.photoUrl} alt="" className="h-[96px] w-[96px] flex-shrink-0 rounded-2xl bg-secondary object-cover" />
      ) : (
        <div className={cn('grid h-[96px] w-[96px] flex-shrink-0 place-items-center rounded-2xl text-[32px] font-black tracking-tight', info.ok ? 'bg-primary/[.14] text-primary' : 'bg-destructive/[.14] text-destructive')}>
          {info.ok ? initials : '?'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[21px] font-black leading-tight tracking-tight">{info.name || 'Sin nombre'}</div>
        <div className="mt-0.5 text-[14px] font-semibold text-muted-foreground">
          {(info.role === 'socio' || info.role === 'admin') ? 'Socio titular' : info.hostName ? `Invita ${info.hostName}` : ''}
        </div>
        <div className="mt-2"><Chip tone={info.ok ? 'ok' : 'bad'} className="text-[14px]">{info.ok ? 'Acceso OK' : 'Sin acceso'}</Chip></div>
        {info.reason && !info.ok && <div className="mt-1.5 text-[14px] font-semibold text-destructive">{info.reason}</div>}
      </div>
    </div>
  );
}

/** Veredicto de puerta a pantalla completa: foto + nombre + verde/rojo. */
export function Veredicto({ info }: { info: any }) {
  const initials = (info.name ?? '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className="grid place-items-center pt-6 text-center">
      {info.photoUrl ? (
        <img src={info.photoUrl} alt="" className={cn('h-[168px] w-[168px] rounded-[28px] bg-secondary object-cover ring-4', info.ok ? 'ring-success' : 'ring-destructive')} />
      ) : (
        <span className={cn('grid h-[168px] w-[168px] place-items-center rounded-[28px] text-[52px] font-black',
          info.ok ? 'bg-primary/[.14] text-primary' : 'bg-destructive/[.14] text-destructive')}>{info.ok ? initials : '?'}</span>
      )}
      <h3 className="mt-4 text-[30px] font-black leading-tight tracking-[-.03em]">{info.name || 'Sin nombre'}</h3>
      <p className="mt-1 text-[15px] font-semibold text-muted-foreground">
        {info.role === 'socio' || info.role === 'admin' ? 'Socio titular'
          : info.hostName ? `Invita ${info.hostName}${info.canOrder === false ? ' · solo entrada' : info.canOrder ? ' · con barra' : ''}` : ''}
      </p>
      <span className={cn('mt-4 inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[19px] font-black',
        info.ok ? 'bg-success text-white' : 'bg-destructive text-white')}>
        {info.ok ? <CheckCircle2 size={24} /> : <X size={24} />}
        {info.ok ? 'Puede pasar' : 'No puede pasar'}
      </span>
      {!info.ok && info.reason && <p className="mt-3 text-[15px] font-bold text-destructive">{info.reason}</p>}
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
