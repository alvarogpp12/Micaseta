import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';

/** Componentes de motion vendorizados (patrones Aceternity/Magic UI) con nuestros tokens. */

/** Tarjeta 3D con tilt al mover el dedo/ratón — para el carnet (patrón Aceternity). */
export function TiltCard({ children, className }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 220, damping: 22 });
  const ry = useSpring(0, { stiffness: 220, damping: 22 });
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  return (
    <div style={{ perspective: 900 }} className={className}>
      <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} onPointerUp={reset}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  );
}

/** Número que cuenta hasta su valor con física de muelle (patrón Magic UI). */
export function NumberTicker({ value, className }: { value: number | null; className?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v: number) => String(Math.round(v)));
  useEffect(() => { if (value !== null) spring.set(value); }, [value]);
  if (value === null) return <span className={className}>—</span>;
  return <motion.span className={className}>{display}</motion.span>;
}

/** Transición de vista al cambiar de pestaña: fade + deslizamiento corto. */
export function FadeView({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Entrada en cascada para filas de lista. */
export function Cascade({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(i * 0.035, 0.35), ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
