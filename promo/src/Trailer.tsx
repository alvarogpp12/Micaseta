import React from 'react';
import {
  AbsoluteFill, Audio, Sequence, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

export const TRAILER_FPS = 30;
export const TRAILER_DURATION = 1320; // 44s

// ---------- fuente ----------
import { INTER_DATA_URI } from './inter-font';

// Fuente incrustada como data URI: la carga es local al proceso del navegador,
// no depende de la red del bundle y no puede colgarse entre pestañas.
if (typeof document !== 'undefined') {
  const handle = delayRender('font');
  const font = new FontFace('Inter', `url(${INTER_DATA_URI}) format('woff2')`, { weight: '100 900' } as FontFaceDescriptors);
  font.load().then((f) => { (document as any).fonts.add(f); continueRender(handle); }).catch(() => continueRender(handle));
}

// ---------- tokens ----------
const T = {
  bg1: '#0c0f1e', bg2: '#1a1e36', papel: '#fbf7ef', albero: '#e9b94d',
  brand: '#4353ff', brandSoft: '#eef0ff', ok: '#12b76a',
  uibg: '#f5f6fa', uiw: '#fff', uib: '#e6e8f0', uit: '#101828', uim: '#667085',
  dkbg: '#0d1117', dkcard: '#161b26', dkborder: '#252c3b', dktext: '#f2f4f8', dkmut: '#8b93a5',
};
const FONT = 'Inter, -apple-system, sans-serif';
const eur = (n: number) => n.toLocaleString('de-DE') + ' €'; // de-DE fuerza el punto de miles en headless

// ---------- utilidades de animación ----------
const useS = (delay: number, cfg = { stiffness: 130, damping: 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
};

const Rise: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const s = useS(delay);
  return <div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px)`, ...style }}>{children}</div>;
};

// dedo táctil: aparece, viaja entre waypoints y pulsa
type Way = { at: number; x: number; y: number; tap?: boolean };
const Finger: React.FC<{ ways: Way[] }> = ({ ways }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < ways[0].at - 12) return null;
  let x = ways[0].x, y = ways[0].y;
  for (let i = 0; i < ways.length - 1; i++) {
    const a = ways[i], b = ways[i + 1];
    if (frame >= b.at) { x = b.x; y = b.y; continue; }
    if (frame >= a.at) {
      const p = spring({ frame: frame - a.at, fps, config: { stiffness: 120, damping: 18 }, durationInFrames: b.at - a.at });
      x = a.x + (b.x - a.x) * p;
      y = a.y + (b.y - a.y) * p;
      break;
    }
  }
  // pulsación: escala y anillo en cada waypoint con tap
  let press = 1, ringO = 0, ringS = 0.4;
  for (const w of ways) {
    if (!w.tap) continue;
    const dt = frame - w.at;
    if (dt >= 0 && dt < 14) {
      press = 1 - 0.32 * Math.sin(Math.min(1, dt / 9) * Math.PI);
      ringO = interpolate(dt, [0, 3, 13], [0, 0.8, 0]);
      ringS = interpolate(dt, [0, 13], [0.5, 1.9]);
    }
  }
  const appear = spring({ frame: frame - (ways[0].at - 12), fps, config: { stiffness: 160, damping: 16 } });
  return (
    <>
      <div style={{
        position: 'absolute', left: x, top: y, width: 74, height: 74, borderRadius: 99,
        border: '5px solid rgba(255,255,255,.7)', transform: `translate(-50%,-50%) scale(${ringS})`,
        opacity: ringO, zIndex: 60,
      }} />
      <div style={{
        position: 'absolute', left: x, top: y, width: 64, height: 64, borderRadius: 99, zIndex: 61,
        background: 'rgba(255,255,255,.30)', border: '3px solid rgba(255,255,255,.6)',
        transform: `translate(-50%,-50%) scale(${press * appear})`, opacity: appear,
        boxShadow: '0 6px 24px rgba(0,0,0,.35)',
      }} />
    </>
  );
};

// ---------- iPhone ----------
const PHONE_W = 700, PHONE_H = 1516, SCR_W = 660, SCR_H = 1476;
const IPhone: React.FC<{ children: React.ReactNode; enter?: number }> = ({ children, enter = 0 }) => {
  const s = useS(enter, { stiffness: 90, damping: 16 });
  return (
    <div style={{
      width: PHONE_W, height: PHONE_H, background: '#0b0b0f', borderRadius: 104, padding: 20,
      boxShadow: '0 90px 220px rgba(0,0,0,.72), inset 0 0 0 4px #26262e',
      transform: `translateY(${interpolate(s, [0, 1], [180, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
      opacity: s, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', width: 196, height: 54, background: '#000', borderRadius: 99, zIndex: 40 }} />
      <div style={{ width: SCR_W, height: SCR_H, borderRadius: 84, overflow: 'hidden', background: T.uibg, position: 'relative', fontFamily: FONT }}>
        {children}
      </div>
    </div>
  );
};

const StatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ height: 90, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 52px 8px', fontSize: 26, fontWeight: 600, color: dark ? T.dktext : T.uit }}>
    <span>9:41</span><span>▮▮▮ ᯤ ▐▓</span>
  </div>
);
const NavBar: React.FC<{ title: string; sub: string; dark?: boolean }> = ({ title, sub, dark }) => (
  <div style={{ padding: '8px 32px 20px' }}>
    <div style={{ fontWeight: 800, fontSize: 42, letterSpacing: '-0.03em', color: dark ? T.dktext : T.uit }}>{title}</div>
    <div style={{ color: dark ? T.dkmut : T.uim, fontSize: 23, fontWeight: 600, marginTop: 2 }}>{sub}</div>
  </div>
);

// ---------- pantalla: subtítulo del beat ----------
const Caption: React.FC<{ k: string; t: string; delay?: number }> = ({ k, t, delay = 6 }) => {
  const s = useS(delay);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96, textAlign: 'center', opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)` }}>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 24, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.albero }}>{k}</div>
      <div style={{ fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', color: T.papel, marginTop: 10 }}>{t}</div>
    </div>
  );
};

const Backdrop: React.FC<{ mood?: 'dark' | 'brand' | 'warm' | '' }> = ({ mood = '' }) => {
  const map: Record<string, [string, string]> = {
    '': [T.bg2, T.bg1], dark: ['#12141f', '#04050a'], brand: ['#262e6e', '#0a0c22'], warm: ['#40311a', '#0d0a05'],
  };
  const [a, b] = map[mood];
  return <AbsoluteFill style={{ background: `radial-gradient(130% 100% at 50% 0%, ${a}, ${b})` }} />;
};

// ============================================================
// ESCENA 1 — Hook
// ============================================================
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [26, 40], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT, textAlign: 'center' }}>
      <Backdrop mood="dark" />
      <Rise delay={2}>
        <div style={{ fontWeight: 900, fontSize: 120, letterSpacing: '-0.045em', lineHeight: 1.04, color: T.papel }}>¿La caseta,</div>
      </Rise>
      <Rise delay={12}>
        <div style={{ position: 'relative', fontWeight: 900, fontSize: 120, letterSpacing: '-0.045em', lineHeight: 1.04, color: 'rgba(251,247,239,.5)' }}>
          en papel?
          <div style={{ position: 'absolute', left: 0, top: '54%', height: 9, width: `${strike}%`, background: '#e4572e', borderRadius: 9 }} />
        </div>
      </Rise>
      <Rise delay={34}>
        <div style={{ marginTop: 42, fontWeight: 600, fontSize: 36, color: 'rgba(251,247,239,.72)', maxWidth: 760, lineHeight: 1.5 }}>
          Listas impresas. "¿Este de quién es?".<br />Cuentas en servilletas.
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 2 — Reveal
// ============================================================
const Reveal: React.FC = () => {
  const s = useS(4, { stiffness: 80, damping: 13 });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop mood="brand" />
      <div style={{ fontWeight: 900, fontSize: 168, letterSpacing: '-0.05em', color: T.papel, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, opacity: s }}>
        micaseta<span style={{ color: T.albero }}>.</span>
      </div>
      <Rise delay={18}>
        <div style={{ fontWeight: 600, fontSize: 38, color: 'rgba(251,247,239,.72)', marginTop: 18 }}>La gestión completa de tu caseta privada.</div>
      </Rise>
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 3 — Panel (KPIs + liquidar con sheet)
// ============================================================
const Counter: React.FC<{ to: number; from?: number; start: number; dur?: number; isEur?: boolean }> = ({ to, from = 0, start, dur = 40, isEur }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
  return <>{isEur ? eur(v) : v.toLocaleString('de-DE')}</>;
};

const Row: React.FC<{ ini: string; name: string; sub: string; money: string; delay: number; pill?: React.ReactNode }> = ({ ini, name, sub, money, delay, pill }) => {
  const s = useS(delay);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 0', borderBottom: `1px solid ${T.uib}`, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)` }}>
      <div style={{ width: 64, height: 64, borderRadius: 99, background: T.brandSoft, color: T.brand, fontWeight: 800, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ini}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 26, color: T.uit }}>{name}</div>
        <div style={{ color: T.uim, fontSize: 20 }}>{sub}</div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 26, color: T.uit }}>{money}</div>
      {pill}
    </div>
  );
};

const Sheet: React.FC<{ openAt: number; closeAt: number; children: React.ReactNode }> = ({ openAt, closeAt, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = spring({ frame: frame - openAt, fps, config: { stiffness: 110, damping: 16 } });
  const close = frame >= closeAt ? spring({ frame: frame - closeAt, fps, config: { stiffness: 140, damping: 18 } }) : 0;
  const y = interpolate(open, [0, 1], [115, 0]) + close * 120;
  const dim = Math.max(0, open * 0.42 * (1 - close));
  if (frame < openAt - 5) return null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(10,12,20,${dim})`, zIndex: 20 }} />
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 21, background: T.uiw, borderRadius: 40, padding: '34px 32px 38px', transform: `translateY(${y}%)`, boxShadow: '0 -18px 90px rgba(16,24,40,.3)' }}>
        <div style={{ width: 72, height: 8, borderRadius: 99, background: '#d5d9e2', margin: '0 auto 24px' }} />
        {children}
      </div>
    </>
  );
};

const ScenePanel: React.FC = () => {
  const frame = useCurrentFrame();
  const liquidada = frame >= 168;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop />
      <IPhone enter={2}>
        <StatusBar />
        <NavBar title="Er Compás" sub="Viernes de Feria · en directo" />
        <div style={{ padding: '0 28px' }}>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { l: 'Consumo de hoy', v: <Counter to={2840} start={26} isEur /> },
              { l: 'Entradas', v: <Counter to={148} start={26} /> },
            ].map((k, i) => (
              <Rise key={i} delay={14 + i * 5} style={{ flex: 1 }}>
                <div style={{ background: T.uiw, border: `1px solid ${T.uib}`, borderRadius: 26, padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 38, letterSpacing: '-0.02em', color: T.uit, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                  <div style={{ color: T.uim, fontSize: 20, fontWeight: 600, marginTop: 4 }}>{k.l}</div>
                </div>
              </Rise>
            ))}
          </div>
          <Rise delay={26}>
            <div style={{ background: T.uiw, border: `1px solid ${T.uib}`, borderRadius: 26, padding: '24px 26px', marginTop: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 26, color: T.uit, marginBottom: 4 }}>Cuentas por socio</div>
              <Row ini="JP" name="Juan Pérez" sub="14 comandas" money="312,00 €" delay={34}
                pill={<div style={{ fontSize: 21, fontWeight: 700, borderRadius: 99, padding: '12px 24px', background: liquidada ? '#f2f4f7' : T.ok, color: liquidada ? T.uit : '#fff' }}>{liquidada ? '✓ Pagada' : 'Liquidar'}</div>} />
              <Row ini="CR" name="Curro Romero" sub="9 comandas" money="187,50 €" delay={40}
                pill={<div style={{ fontSize: 21, fontWeight: 700, borderRadius: 99, padding: '12px 24px', background: '#f2f4f7', color: T.uit }}>Ver</div>} />
              <Row ini="MD" name="Macarena Díaz" sub="6 comandas" money="94,00 €" delay={46}
                pill={<div style={{ fontSize: 21, fontWeight: 700, borderRadius: 99, padding: '12px 24px', background: '#f2f4f7', color: T.uit }}>Ver</div>} />
            </div>
          </Rise>
        </div>
        <Sheet openAt={92} closeAt={168}>
          <div style={{ fontWeight: 800, fontSize: 32, color: T.uit, letterSpacing: '-0.02em' }}>Liquidar cuenta de Juan Pérez</div>
          <div style={{ color: T.uim, fontSize: 23, marginTop: 8, lineHeight: 1.45 }}>312,00 € pendientes · 14 comandas suyas y de sus invitados.</div>
          <div style={{ marginTop: 28, background: T.ok, color: '#fff', borderRadius: 22, padding: 26, textAlign: 'center', fontWeight: 700, fontSize: 28 }}>Confirmar liquidación</div>
        </Sheet>
        <Finger ways={[
          { at: 60, x: 555, y: 588 },
          { at: 84, x: 555, y: 588, tap: true },
          { at: 120, x: 330, y: 1300 },
          { at: 156, x: 330, y: 1300, tap: true },
          { at: 200, x: 330, y: 1560 },
        ]} />
      </IPhone>
      <Caption k="El panel del dueño" t="Cuentas por socio, en directo" />
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 4 — Invitar (tecleo + sheet WhatsApp)
// ============================================================
const TypeText: React.FC<{ text: string; start: number; cps?: number }> = ({ text, start, cps = 16 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Math.max(0, Math.floor((frame - start) / (fps / cps)));
  const done = chars >= text.length;
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  return (
    <span>
      {text.slice(0, chars)}
      {!done && frame >= start - 20 && <span style={{ opacity: caretOn ? 1 : 0, fontWeight: 300 }}>|</span>}
    </span>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; delay: number; active?: boolean }> = ({ label, children, delay, active }) => (
  <Rise delay={delay}>
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 21, fontWeight: 700, color: '#344054', marginBottom: 8 }}>{label}</div>
      <div style={{ border: `2px solid ${active ? T.brand : '#d0d5dd'}`, boxShadow: active ? '0 0 0 6px rgba(67,83,255,.13)' : 'none', borderRadius: 18, background: '#fff', padding: '20px 22px', fontSize: 26, color: T.uit, minHeight: 38 }}>{children}</div>
    </div>
  </Rise>
);

const SceneInvitar: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop />
      <IPhone>
        <StatusBar />
        <NavBar title="Nueva invitación" sub="Invita Juan Pérez" />
        <div style={{ padding: '0 28px' }}>
          <div style={{ background: T.uiw, border: `1px solid ${T.uib}`, borderRadius: 26, padding: '10px 26px 30px' }}>
            <Field label="Nombre de la invitada" delay={8} active={frame >= 20 && frame < 62}><TypeText text="Ana López" start={24} /></Field>
            <Field label="Solo un día" delay={14}>Viernes de Feria</Field>
            <Field label="Límite de consumo" delay={20} active={frame >= 66 && frame < 96}><TypeText text="50 €" start={70} cps={10} /></Field>
            <Rise delay={26}>
              <div style={{ marginTop: 30, background: T.brand, color: '#fff', borderRadius: 22, padding: 26, textAlign: 'center', fontWeight: 700, fontSize: 28 }}>Crear invitación</div>
            </Rise>
          </div>
        </div>
        <Sheet openAt={132} closeAt={9999}>
          <div style={{ fontWeight: 800, fontSize: 32, color: T.uit, letterSpacing: '-0.02em' }}>Invitación creada</div>
          <div style={{ color: T.uim, fontSize: 23, marginTop: 8, lineHeight: 1.45 }}>Ana López · viernes · hasta 50 € a cuenta de Juan. Recibirá su QR al registrarse con su selfie.</div>
          <div style={{ marginTop: 28, background: T.ok, color: '#fff', borderRadius: 22, padding: 26, textAlign: 'center', fontWeight: 700, fontSize: 28 }}>Enviar por WhatsApp</div>
        </Sheet>
        <Finger ways={[
          { at: 96, x: 330, y: 1180 },
          { at: 122, x: 330, y: 1180, tap: true },
          { at: 160, x: 330, y: 1560 },
        ]} />
      </IPhone>
      <Caption k="Invitaciones con reglas" t="Día, límite y acompañantes" />
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 5 — Invitada: selfie + QR
// ============================================================
const QR_PATTERN = [
  '11111011111', '10001001000', '10101010101', '10001000110', '11111011111',
  '00100110010', '11010101101', '00111000111', '11111010010', '10001011101', '11111001011',
];
const QrGrid: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const cells: React.ReactNode[] = [];
  QR_PATTERN.forEach((row, r) => {
    [...row].forEach((c, col) => {
      const idx = r * 11 + col;
      const on = c === '1' && frame >= start + (idx % 9) * 2;
      cells.push(<div key={idx} style={{ width: 30, height: 30, borderRadius: 4, background: on ? T.uit : 'transparent' }} />);
    });
  });
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 30px)', gap: 4, justifyContent: 'center' }}>{cells}</div>;
};

const SceneGuest: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [26, 30, 42], [0, 0.95, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop mood="warm" />
      <IPhone>
        <StatusBar />
        <div style={{ padding: '4px 28px' }}>
          <Rise delay={4}>
            <div style={{ background: `linear-gradient(120deg, ${T.brand}, #6e3aff)`, color: '#fff', borderRadius: 30, padding: '32px 30px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>Juan Pérez te invita a</div>
              <div style={{ fontWeight: 800, fontSize: 42, letterSpacing: '-0.02em', marginTop: 4 }}>Er Compás</div>
            </div>
          </Rise>
          <Rise delay={12}>
            <div style={{ background: T.uiw, border: `1px solid ${T.uib}`, borderRadius: 26, padding: 30, marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 28, color: T.uit }}>Ana López</div>
              <div style={{ width: 148, height: 148, borderRadius: 99, margin: '20px auto 8px', background: 'radial-gradient(circle at 35% 35%, #f0c27b, #c98850)', border: `6px solid ${T.brandSoft}` }} />
              <div style={{ background: '#fff', border: `1px solid ${T.uib}`, borderRadius: 26, padding: 22, marginTop: 18 }}>
                <QrGrid start={48} />
              </div>
              <div style={{ color: T.uim, fontSize: 21, marginTop: 14 }}>Tu acceso: puerta y pedir</div>
            </div>
          </Rise>
        </div>
      </IPhone>
      <AbsoluteFill style={{ background: `rgba(255,255,255,${flash})`, pointerEvents: 'none' }} />
      <Caption k="La invitada, en 20 segundos" t="Selfie → su QR al momento" />
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 6 — Puerta
// ============================================================
const SceneDoor: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useS(22, { stiffness: 220, damping: 12 });
  const done = frame >= 92;
  const doneS = useS(92, { stiffness: 150, damping: 13 });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop mood="dark" />
      <IPhone>
        <div style={{ position: 'absolute', inset: 0, background: T.dkbg }} />
        <StatusBar dark />
        <NavBar title="Puerta" sub="Er Compás · Manolo" dark />
        <div style={{ padding: '0 28px', position: 'relative' }}>
          <Rise delay={6}>
            <div style={{ background: T.dkcard, border: `1px solid ${T.dkborder}`, borderRadius: 26, padding: 26 }}>
              <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
                <div style={{ width: 116, height: 116, borderRadius: 24, background: 'radial-gradient(circle at 35% 30%, #e8b087, #a06a45)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 30, color: T.dktext }}>Ana López</div>
                  <div style={{ color: T.dkmut, fontSize: 22, marginTop: 4 }}>Invita: Juan Pérez · hasta 50 €</div>
                  <div style={{
                    display: 'inline-block', marginTop: 12, fontSize: 21, fontWeight: 800, borderRadius: 99, padding: '8px 24px',
                    background: 'rgba(18,183,106,.15)', color: '#3ddc93', border: '2px solid rgba(18,183,106,.4)',
                    transform: `scale(${badge})`, opacity: badge,
                  }}>ACCESO OK</div>
                </div>
              </div>
              <div style={{ marginTop: 22, background: T.ok, color: '#fff', borderRadius: 20, padding: 22, textAlign: 'center', fontWeight: 700, fontSize: 26 }}>Registrar entrada</div>
            </div>
          </Rise>
        </div>
        {done && (
          <div style={{ position: 'absolute', inset: 0, background: T.dkbg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, opacity: interpolate(doneS, [0, 0.4], [0, 1]) }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 148, height: 148, borderRadius: 99, background: 'rgba(18,183,106,.15)', border: '4px solid rgba(18,183,106,.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', transform: `scale(${doneS})`,
                color: '#3ddc93', fontSize: 74, fontWeight: 800,
              }}>✓</div>
              <div style={{ fontWeight: 800, fontSize: 36, color: T.dktext }}>Entrada registrada</div>
              <div style={{ color: T.dkmut, fontSize: 24, marginTop: 8 }}>Ana López · 21:47</div>
            </div>
          </div>
        )}
        <Finger ways={[
          { at: 48, x: 330, y: 700 },
          { at: 78, x: 330, y: 700, tap: true },
          { at: 110, x: 330, y: 900 },
        ]} />
      </IPhone>
      <Caption k="Control de puerta" t="Verificación en verde o rojo" />
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 7 — TPV
// ============================================================
const TAP1 = 40, TAP2 = 78, TAP3 = 116, TAPFIN = 172, DONE = 186;
const Tile: React.FC<{ name: string; price: string; sel?: boolean; q?: number; press?: boolean }> = ({ name, price, sel, q, press }) => (
  <div style={{
    position: 'relative', border: `3px solid ${sel ? '#5b6cff' : T.dkborder}`, borderRadius: 24,
    background: sel ? 'rgba(91,108,255,.16)' : T.dkcard, padding: '22px 20px', minHeight: 144,
    display: 'flex', flexDirection: 'column', transform: press ? 'scale(0.95)' : 'scale(1)',
  }}>
    <div style={{ fontWeight: 600, fontSize: 24, lineHeight: 1.3, color: T.dktext, paddingRight: 30 }}>{name}</div>
    <div style={{ color: T.dkmut, fontSize: 22, fontWeight: 600, marginTop: 'auto', paddingTop: 12 }}>{price}</div>
    {q ? (
      <div style={{
        position: 'absolute', top: -16, right: -12, background: '#5b6cff', color: '#fff', minWidth: 44, height: 44,
        borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22,
        boxShadow: '0 6px 20px rgba(0,0,0,.4)',
      }}>{q}</div>
    ) : null}
  </div>
);

const SceneTPV: React.FC = () => {
  const frame = useCurrentFrame();
  const q1 = frame >= TAP2 ? 2 : frame >= TAP1 ? 1 : 0;
  const q2 = frame >= TAP3 ? 1 : 0;
  const total = q1 * 400 + q2 * 2400;
  const nArt = q1 + q2;
  const doneS = useS(DONE, { stiffness: 150, damping: 13 });
  const press = (t: number) => frame >= t && frame < t + 6;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <Backdrop mood="dark" />
      <IPhone>
        <div style={{ position: 'absolute', inset: 0, background: T.dkbg }} />
        <StatusBar dark />
        <NavBar title="Comanda" sub="Ana López · a cuenta de Juan Pérez" dark />
        <div style={{ padding: '0 28px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {['Vinos', 'Copas', 'Comida'].map((c, i) => (
              <div key={c} style={{ padding: '14px 26px', borderRadius: 99, fontSize: 22, fontWeight: 700, background: i === 0 ? '#5b6cff' : '#232a3a', color: i === 0 ? '#fff' : T.dkmut }}>{c}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 22 }}>
            <Rise delay={8}><Tile name="Rebujito (copa)" price="4,00 €" sel={q1 > 0} q={q1} press={press(TAP1) || press(TAP2)} /></Rise>
            <Rise delay={12}><Tile name="Jamón ibérico (ración)" price="24,00 €" sel={q2 > 0} q={q2} press={press(TAP3)} /></Rise>
            <Rise delay={16}><Tile name="Manzanilla (copa)" price="3,50 €" /></Rise>
            <Rise delay={20}><Tile name="Rebujito (jarra)" price="12,00 €" /></Rise>
          </div>
          <Rise delay={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 26, background: T.dkcard, border: `1px solid ${T.dkborder}`, borderRadius: 28, padding: '22px 26px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.dkmut, fontSize: 19 }}>{nArt === 0 ? 'Toca productos' : `${nArt} artículo${nArt === 1 ? '' : 's'}`}</div>
                <div style={{ fontWeight: 800, fontSize: 34, color: T.dktext, fontVariantNumeric: 'tabular-nums' }}>{(total / 100).toFixed(2).replace('.', ',')} €</div>
              </div>
              <div style={{ background: T.ok, color: '#fff', fontWeight: 700, fontSize: 24, borderRadius: 18, padding: '18px 26px' }}>Finalizar comanda</div>
            </div>
          </Rise>
        </div>
        {frame >= DONE && (
          <div style={{ position: 'absolute', inset: 0, background: T.dkbg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, opacity: interpolate(doneS, [0, 0.4], [0, 1]) }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 148, height: 148, borderRadius: 99, background: 'rgba(18,183,106,.15)', border: '4px solid rgba(18,183,106,.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', transform: `scale(${doneS})`,
                color: '#3ddc93', fontSize: 74, fontWeight: 800,
              }}>✓</div>
              <div style={{ fontWeight: 800, fontSize: 44, color: T.dktext }}>32,00 €</div>
              <div style={{ color: T.dkmut, fontSize: 24, marginTop: 8 }}>a la cuenta de Juan Pérez · comanda #241</div>
            </div>
          </div>
        )}
        <Finger ways={[
          { at: 22, x: 195, y: 560 },
          { at: TAP1, x: 195, y: 560, tap: true },
          { at: TAP2, x: 195, y: 560, tap: true },
          { at: TAP3 - 18, x: 465, y: 560 },
          { at: TAP3, x: 465, y: 560, tap: true },
          { at: TAPFIN - 22, x: 470, y: 1010 },
          { at: TAPFIN, x: 470, y: 1010, tap: true },
        ]} />
      </IPhone>
      <Caption k="Comanda en tres toques" t="A la cuenta del socio que invita" />
    </AbsoluteFill>
  );
};

// ============================================================
// ESCENA 8 — CTA
// ============================================================
const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = 0.7 + 0.3 * Math.sin(frame / 9);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT, textAlign: 'center' }}>
      <Backdrop mood="brand" />
      <Rise delay={4}>
        <div style={{ fontWeight: 600, fontSize: 30, color: 'rgba(251,247,239,.72)' }}>Socios · Invitados con QR · Puerta · Comandas · Cuentas</div>
      </Rise>
      <Rise delay={14}>
        <div style={{
          fontWeight: 800, fontSize: 128, letterSpacing: '-0.03em', color: '#fff', marginTop: 26,
          textShadow: `0 0 ${26 * glow}px rgba(233,185,77,.95), 0 0 ${110 * glow}px rgba(233,185,77,.6), 0 0 ${200 * glow}px rgba(233,185,77,.35)`,
        }}>micaseta.app</div>
      </Rise>
      <Rise delay={26}>
        <div style={{ fontWeight: 600, fontSize: 34, color: 'rgba(251,247,239,.75)', marginTop: 30 }}>Registra tu caseta gratis. Antes del alumbrao.</div>
      </Rise>
    </AbsoluteFill>
  );
};

// ============================================================
// TIMELINE
// ============================================================
const SCENES = [
  { at: 0, dur: 105, C: Hook },
  { at: 105, dur: 90, C: Reveal },
  { at: 195, dur: 240, C: ScenePanel },
  { at: 435, dur: 210, C: SceneInvitar },
  { at: 645, dur: 165, C: SceneGuest },
  { at: 810, dur: 135, C: SceneDoor },
  { at: 945, dur: 240, C: SceneTPV },
  { at: 1185, dur: 135, C: SceneCTA },
];

const sfx = (name: string, at: number, volume = 1) => (
  <Sequence key={`${name}-${at}`} from={at} durationInFrames={90}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.bg1 }}>
      {SCENES.map(({ at, dur, C }, i) => (
        <Sequence key={i} from={at} durationInFrames={dur}>
          <SceneFade dur={dur}><C /></SceneFade>
        </Sequence>
      ))}

      {/* música de fondo */}
      <Audio src={staticFile('sfx/bed.wav')} volume={(f) => interpolate(f, [0, 30, 1230, 1320], [0, 0.5, 0.5, 0], { extrapolateRight: 'clamp' })} />

      {/* whoosh en cada corte de escena */}
      {SCENES.slice(1).map((s) => sfx('whoosh', s.at - 6, 0.7))}

      {/* Panel: tap liquidar, sheet, confirmar → caja */}
      {sfx('tap', 195 + 84)}
      {sfx('tap', 195 + 156)}
      {sfx('caja', 195 + 170, 0.9)}
      {/* Invitar: teclas + tap + ding sheet */}
      {[24, 28, 32, 36, 40, 44, 48, 52, 70, 76, 82].map((k) => sfx('key', 435 + k, 0.5))}
      {sfx('tap', 435 + 122)}
      {sfx('ding', 435 + 136, 0.7)}
      {/* Invitada: shutter + sparkle QR */}
      {sfx('shutter', 645 + 26)}
      {sfx('sparkle', 645 + 48, 0.8)}
      {/* Puerta: pop badge + tap + ding */}
      {sfx('pop', 810 + 22, 0.8)}
      {sfx('tap', 810 + 78)}
      {sfx('ding', 810 + 94, 0.8)}
      {/* TPV: pops + tap final + ding éxito */}
      {sfx('pop', 945 + TAP1)}
      {sfx('pop', 945 + TAP2)}
      {sfx('pop', 945 + TAP3)}
      {sfx('tap', 945 + TAPFIN)}
      {sfx('ding', 945 + DONE, 0.9)}
      {/* final: riser + hit */}
      {sfx('riser', 1140, 0.8)}
      {sfx('hit', 1185, 0.9)}
    </AbsoluteFill>
  );
};

// fundido de entrada/salida por escena (cortes suaves)
const SceneFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6, dur - 6, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
