import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Copy, Minus, Plus, Send } from 'lucide-react';
import { api, eur, waShare, CAT_LABELS, sortProducts } from './lib/api';
import { Button, Card, CardBody, Chip, Err, Input, Label, Modal, cn } from './ui';

// ── Carta + carrito (la usan cliente y camarero, con distinto botón final) ──

export function Carta({ products, qty, setQty }: any) {
  const cats: string[] = [...new Set(sortProducts(products).map((p: any) => p.category))] as string[];
  const [cat, setCat] = useState(cats[0] ?? null);
  const active = cats.includes(cat as string) ? cat : cats[0];
  return (
    <div>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn('flex-shrink-0 rounded-full px-4 py-2 text-[13.5px] font-bold',
              c === active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
            {CAT_LABELS[c] ?? c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {sortProducts(products).filter((p: any) => p.category === active).map((p: any) => {
          const n = qty[p.id] || 0;
          const add = () => setQty({ ...qty, [p.id]: n + 1 });
          return (
            <div key={p.id} onClick={add}
              className={cn('relative flex min-h-[92px] cursor-pointer select-none flex-col rounded-xl border-[1.5px] bg-card p-3',
                n ? 'border-primary bg-secondary' : 'border-border')}>
              <span className="pr-5 text-sm font-semibold leading-snug">{p.name}</span>
              <span className="mt-auto pt-2 text-[13px] font-semibold text-muted-foreground">{eur(p.price_cents)}</span>
              {n > 0 && (
                <>
                  <span className="absolute -right-1.5 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-[13px] font-extrabold text-primary-foreground shadow">{n}</span>
                  <div className="absolute bottom-2 right-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setQty({ ...qty, [p.id]: Math.max(0, n - 1) })}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card"><Minus size={16} /></button>
                    <button onClick={add}
                      className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Plus size={16} /></button>
                  </div>
                </>
              )}
            </div>
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
  return (
    <div className="fixed inset-x-0 bottom-[52px] z-30 border-t border-border bg-card px-4 py-2.5 shadow-[0_-4px_16px_rgba(16,24,40,.07)]">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted-foreground">{n === 0 ? 'Toca productos para añadirlos' : `${n} artículo${n === 1 ? '' : 's'}`}</div>
          <div className="text-lg font-extrabold tracking-tight">{eur(total)}</div>
        </div>
        <Button onClick={onSend} disabled={n === 0 || busy}><Send size={16} /> {label}</Button>
      </div>
      <div className="mx-auto max-w-md"><Err>{err}</Err></div>
    </div>
  );
}

// ── Número gigante + seguimiento del pedido (estilo Glovo/Burger King) ──

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
  return (
    <Card><CardBody className="py-8 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tu número</p>
      <div className={cn('my-2 text-7xl font-black tracking-tighter tabular-nums', listo ? 'text-success' : 'text-primary')}>{pickupNumber ?? '—'}</div>
      <Chip tone={listo ? 'ok' : 'primary'} className={cn('px-4 py-2 text-sm', listo && 'animate-pop')}>
        {status === 'pendiente' && 'En preparación…'}
        {status === 'lista' && '¡Listo! Recógelo en la barra'}
        {status === 'servida' && 'Entregado · ¡que aproveche!'}
      </Chip>
      <h3 className="mt-4 font-bold">Pedido enviado · {eur(totalCents)}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
        {status === 'servida'
          ? `Cargado a la cuenta de ${hostName ?? 'tu socio'}.`
          : listo ? 'Tu número está en la pantalla de la caseta.' : 'Cuando esté listo, tu número saldrá en la pantalla de la caseta y te avisaremos aquí.'}
      </p>
      <Button variant="outline" className="mt-5 w-full" onClick={onBack}>Volver</Button>
    </CardBody></Card>
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
      {hint && <p className="mb-3 text-[13px] text-muted-foreground">{hint}</p>}
      <video ref={videoRef} playsInline className={cn('w-full rounded-lg bg-black', !on && 'hidden')} />
      {!on && <Button className="w-full" onClick={start}>Escanear código QR</Button>}
      <Label>O introduce el código manualmente</Label>
      <div className="flex gap-2">
        <Input value={manual} onChange={(e: any) => setManual(e.target.value)} placeholder="Código del QR" />
        <Button variant="outline" onClick={() => manual.trim() && onScan(manual.trim())}>Ir</Button>
      </div>
      {demos.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Modo demo — simula un escaneo</p>
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
  return (
    <div className={cn('flex items-center gap-3.5', big && 'flex-col text-center')}>
      <img
        src={info.photoUrl || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#eef0ff"/><text x="40" y="52" font-size="30" text-anchor="middle" fill="#98a2ff">?</text></svg>')}
        alt="" className={cn('rounded-xl border border-border bg-muted object-cover', big ? 'h-36 w-36' : 'h-[76px] w-[76px]')}
      />
      <div className={cn('min-w-0', !big && 'flex-1')}>
        <div className="truncate text-[16px] font-bold">{info.name || 'Sin nombre'}{(info.role === 'socio' || info.role === 'admin') && ' · SOCIO'}</div>
        {info.hostName && <div className="text-[12.5px] text-muted-foreground">Invita: {info.hostName}</div>}
        <div className="mt-1.5"><Chip tone={info.ok ? 'ok' : 'bad'}>{info.ok ? 'ACCESO OK' : 'SIN ACCESO'}</Chip></div>
        {info.reason && <div className="mt-1 text-[12.5px] text-muted-foreground">{info.reason}</div>}
      </div>
    </div>
  );
}

// ── Hoja de compartir por WhatsApp ──

export function ShareModal({ open, onClose, title, text, url, phone, note }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-bold">{title}</h2>
      {note && <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{note}</p>}
      <a href={waShare(text, phone)} target="_blank" rel="noreferrer" className="mt-4 block">
        <Button className="w-full">Enviar por WhatsApp</Button>
      </a>
      <Button variant="outline" className="mt-2.5 w-full" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); }}>
        <Copy size={15} /> {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
      <div className="mt-3 break-all rounded-lg bg-muted p-3 text-xs text-muted-foreground">{url}</div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>Cerrar</Button>
    </Modal>
  );
}
