import React from 'react';

/** Primitivos de UI en el lenguaje visual de shadcn/ui (sin dependencias extra). */

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({ variant = 'default', size = 'default', className = '', ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-card hover:bg-muted',
    ghost: 'hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
    success: 'bg-success text-success-foreground hover:opacity-90',
  };
  const sizes: Record<string, string> = {
    default: 'h-11 px-5 text-[15px]',
    sm: 'h-9 px-3.5 text-[13.5px]',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}

export const Card = ({ className = '', ...p }: any) => (
  <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)} {...p} />
);
export const CardBody = ({ className = '', ...p }: any) => <div className={cn('p-4', className)} {...p} />;

export const Input = ({ className = '', ...p }: any) => (
  <input
    className={cn(
      'flex h-11 w-full rounded-lg border border-input bg-card px-3.5 py-2 outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10',
      className,
    )}
    {...p}
  />
);

export const Label = ({ className = '', ...p }: any) => (
  <label className={cn('mb-1.5 mt-3.5 block text-[13px] font-semibold text-foreground/80', className)} {...p} />
);

export function Chip({ tone = 'muted', className = '', ...p }: any) {
  const tones: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    ok: 'bg-success/10 text-success',
    bad: 'bg-destructive/10 text-destructive',
    primary: 'bg-secondary text-secondary-foreground',
  };
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)} {...p} />;
}

export const Spinner = () => (
  <div className="flex justify-center py-10">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
  </div>
);

export const Err = ({ children }: any) =>
  children ? <p className="mt-2 text-[13.5px] font-semibold text-destructive">{children}</p> : null;

export const Empty = ({ children }: any) => (
  <p className="py-3 text-sm text-muted-foreground">{children}</p>
);

export function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardBody className="px-4 py-3.5">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="truncate text-xl font-extrabold tracking-tight">{value}</div>
    </CardBody></Card>
  );
}

export function Avatar({ name }: { name?: string | null }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-bold text-secondary-foreground">
      {initials}
    </div>
  );
}

/** Modal accesible sobre <dialog> nativo, con estética shadcn. */
export function Modal({ open, onClose, children }: any) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="w-[calc(100%-2.5rem)] max-w-md rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-foreground/40"
    >
      <div className="p-6">{children}</div>
    </dialog>
  );
}

/** Barra de pestañas inferior (la navegación de toda la app). */
export function BottomNav({ tabs, tab, onTab }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; tab: string; onTab: (id: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold', tab === t.id ? 'text-primary' : 'text-muted-foreground')}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function TopBar({ title, right }: { title?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-13 max-w-md items-center justify-between px-4 py-3">
        <span className="text-[16px] font-extrabold tracking-tight">
          micaseta<i className="not-italic text-primary">.</i>
        </span>
        {title && <span className="truncate px-2 text-[13px] font-medium text-muted-foreground">{title}</span>}
        {right ?? <span />}
      </div>
    </header>
  );
}

/** Página con ancho de app móvil. */
export const Page = ({ className = '', ...p }: any) => (
  <main className={cn('mx-auto w-full max-w-md px-4 pb-32 pt-4', className)} {...p} />
);
