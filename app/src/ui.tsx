import React from 'react';
import { Drawer } from 'vaul';

/** Primitivos "La caseta de noche": capas en vez de bordes, píldoras, glow. */

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({ variant = 'default', size = 'default', className = '', ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground shadow-glow hover:brightness-105',
    secondary: 'bg-secondary text-secondary-foreground hover:brightness-110',
    outline: 'bg-card text-foreground hover:bg-secondary',
    ghost: 'text-muted-foreground hover:bg-card',
    destructive: 'bg-destructive text-destructive-foreground',
    success: 'bg-primary text-primary-foreground shadow-glow',
    lona: 'bg-lona text-tinta',
  };
  const sizes: Record<string, string> = {
    default: 'h-12 px-6 text-[15px]',
    sm: 'h-9 px-4 text-[13px]',
    lg: 'h-14 px-7 text-base',
    icon: 'h-11 w-11',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-tight transition-all active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}

export const Card = ({ className = '', ...p }: any) => (
  <div className={cn('rounded-2xl bg-card', className)} {...p} />
);
export const CardBody = ({ className = '', ...p }: any) => <div className={cn('p-5', className)} {...p} />;

export const Input = ({ className = '', ...p }: any) => (
  <input
    className={cn(
      'flex h-12 w-full rounded-lg bg-secondary px-4 py-2 text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/60',
      className,
    )}
    {...p}
  />
);

export const Label = ({ className = '', ...p }: any) => (
  <label className={cn('mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[.14em] text-muted-foreground', className)} {...p} />
);

export function Chip({ tone = 'muted', className = '', ...p }: any) {
  const tones: Record<string, string> = {
    muted: 'bg-secondary text-muted-foreground',
    ok: 'bg-primary/15 text-primary',
    bad: 'bg-destructive/15 text-destructive',
    primary: 'bg-menta/10 text-menta',
  };
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold', tones[tone], className)} {...p} />;
}

export const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-secondary border-t-primary" />
  </div>
);

export const Err = ({ children }: any) =>
  children ? <p className="mt-2 text-[13.5px] font-bold text-destructive">{children}</p> : null;

export const Empty = ({ children }: any) => (
  <p className="py-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
);

export function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardBody className="px-4 py-4">
      <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">{label}</div>
      <div className="truncate text-[22px] font-black tracking-tight tabular-nums">{value}</div>
    </CardBody></Card>
  );
}

export function Avatar({ name }: { name?: string | null }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary/15 text-[12px] font-extrabold text-primary">
      {initials}
    </div>
  );
}

/** Hoja inferior (sheet) sobre Vaul — el drawer de shadcn — con nuestros tokens. */
export function Modal({ open, onClose, children }: any) {
  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[28px] bg-card text-foreground outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/15" />
          <div className="max-h-[85vh] overflow-y-auto p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Dock flotante de píldora: solo la pestaña activa muestra texto y brilla. */
export function BottomNav({ tabs, tab, onTab }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; tab: string; onTab: (id: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2" style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
      <div className="flex gap-1.5 rounded-full bg-secondary/80 p-2 shadow-dock backdrop-blur-xl ring-1 ring-white/10">
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={cn('flex h-12 items-center gap-2 whitespace-nowrap rounded-full font-bold text-[13px] transition-all',
                on ? 'bg-primary px-5 text-primary-foreground shadow-glow' : 'px-3.5 text-muted-foreground')}
            >
              {t.icon}
              {on && <span>{t.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, right }: { title?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="relative z-30">
      <div className="mx-auto flex max-w-md items-baseline justify-between px-6 pt-5 pb-1">
        <span className="text-[16px] font-black tracking-tight">
          micaseta<i className="not-italic text-primary">.</i>
        </span>
        {title && <span className="truncate px-2 text-[12px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{title}</span>}
        {right ?? <span />}
      </div>
    </header>
  );
}

/** Página con ancho de app móvil y aire para el dock. */
export const Page = ({ className = '', ...p }: any) => (
  <main className={cn('amb-verde mx-auto min-h-screen w-full max-w-md px-5 pb-40 pt-3', className)} {...p} />
);
