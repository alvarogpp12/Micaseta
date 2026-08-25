import React from 'react';
import { Drawer } from 'vaul';
import { QrCode, Beer, Wallet, UserPlus } from './components/icons';

/** Primitivos v3 "El pase": app clara, cobalto solo acción, verde solo veredicto.
 *  Módulos blancos con borde y sombra suave; listas con hairlines, nunca cajas. */

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({ variant = 'default', size = 'default', className = '', ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground shadow-glow hover:brightness-105',
    secondary: 'bg-secondary text-primary hover:brightness-[.98]',
    outline: 'bg-primary/[.14] text-primary hover:bg-primary/20',
    ghost: 'text-muted-foreground hover:bg-secondary',
    destructive: 'bg-destructive text-destructive-foreground',
    success: 'bg-success text-success-foreground shadow-glow-exito',
  };
  const sizes: Record<string, string> = {
    default: 'h-12 px-6 text-[15px]',
    sm: 'h-10 px-4 text-[12.5px]',
    lg: 'h-[50px] px-7 text-[15px]',
    icon: 'h-11 w-11',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-extrabold tracking-tight transition-all active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}

/** Módulo-tarjeta: SOLO para bloques accionables (formularios, resúmenes). */
export const Card = ({ className = '', ...p }: any) => (
  <div className={cn('overflow-hidden rounded-2xl border border-card-border bg-card shadow-mod', className)} {...p} />
);
export const CardBody = ({ className = '', ...p }: any) => <div className={cn('p-5', className)} {...p} />;

export const Input = ({ className = '', ...p }: any) => (
  <input
    className={cn(
      'flex h-12 w-full rounded-lg bg-secondary px-4 py-2 font-semibold text-foreground outline-none transition-shadow placeholder:text-[#9AA1B2] focus:ring-2 focus:ring-primary/60',
      className,
    )}
    {...p}
  />
);

export const Label = ({ className = '', ...p }: any) => (
  <label className={cn('mb-1.5 mt-4 block text-[12.5px] font-bold text-muted-foreground', className)} {...p} />
);

/** Kicker de módulo: sentence case ENSANCHADO — el sello tipográfico de la casa. */
export const Kick = ({ className = '', ...p }: any) => (
  <div className={cn('kick mb-2.5 text-[12px] font-bold tracking-[.02em] text-muted-foreground', className)} {...p} />
);

/** Título de sección tipográfica (sin caja): "Tu gente", "Esta noche". */
export const SectionTitle = ({ className = '', ...p }: any) => (
  <h3 className={cn('mb-1 mt-7 text-[19px] font-black tracking-[-.03em] text-foreground', className)} {...p} />
);

export function Chip({ tone = 'muted', className = '', ...p }: any) {
  const tones: Record<string, string> = {
    muted: 'bg-secondary text-muted-foreground',
    ok: 'bg-success/[.12] text-success',
    bad: 'bg-destructive/[.15] text-destructive',
    soft: 'bg-primary/[.12] text-primary',
    primary: 'bg-primary/[.12] text-primary',
  };
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold', tones[tone], className)} {...p} />;
}

/** Enlace tintado "Ver ›": botón cobalto/14%, nunca texto suelto. */
export const LinkBtn = ({ className = '', children, ...p }: any) => (
  <button className={cn('inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-primary/[.14] px-3.5 text-[12.5px] font-bold text-primary transition-all active:scale-[.97]', className)} {...p}>{children}</button>
);

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

/** Fila de stats bajo hairline (caja de hoy, cuenta). */
export function Stats({ items }: { items: [React.ReactNode, string][] }) {
  return (
    <div className="mt-4 flex gap-4 border-t border-border">
      {items.map(([v, l]) => (
        <div key={l} className="flex-1 pt-3.5">
          <b className="block text-[19px] font-black tabular-nums tracking-tight">{v}</b>
          <small className="mt-0.5 block text-[11px] font-bold text-muted-foreground">{l}</small>
        </div>
      ))}
    </div>
  );
}

export function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardBody className="px-4 py-4">
      <div className="mb-1 text-[11.5px] font-bold text-muted-foreground">{label}</div>
      <div className="truncate text-[22px] font-black tracking-tight tabular-nums">{value}</div>
    </CardBody></Card>
  );
}

export function Avatar({ name, className = '' }: { name?: string | null; className?: string }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className={cn('grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary/[.18] text-[11px] font-extrabold text-primary', className)}>
      {initials}
    </div>
  );
}

/** Hoja inferior (sheet) sobre Vaul, en claro. */
export function Modal({ open, onClose, children }: any) {
  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[26px] bg-card text-foreground outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-foreground/10" />
          <div className="max-h-[85vh] overflow-y-auto p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Dock claro de 4: blur, canto izquierdo con la banda, punto cobalto en el activo. */
export function Dock({ tabs, tab, onTab }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; tab: string; onTab: (id: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="fixed inset-x-4 z-40 mx-auto max-w-md" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-stretch overflow-hidden rounded-[20px] border border-border bg-white/90 shadow-dock backdrop-blur-xl">
        <i className="banda-v w-[5px]" />
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={cn('relative grid flex-1 place-items-center gap-[3px] py-[11px] pb-3 text-[10px] font-bold transition-colors',
                on ? 'text-foreground' : 'text-[#98A0B2]')}
            >
              {on && <span className="absolute right-[calc(50%-17px)] top-[7px] h-[5px] w-[5px] rounded-full bg-primary" />}
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Los 4 del dock del cliente. */
export const CLIENT_TABS = [
  { id: 'inicio', label: 'Inicio', icon: <QrCode size={21} /> },
  { id: 'pedir', label: 'Pedir', icon: <Beer size={21} /> },
  { id: 'gastos', label: 'Gastos', icon: <Wallet size={21} /> },
  { id: 'invitar', label: 'Invitar', icon: <UserPlus size={21} /> },
];

/** Cabecera de pantalla: wordmark (raíz) o "‹ Inicio" (subpantalla) + contexto. */
export function TopBar({ back, onBack, title, right }: { back?: string; onBack?: () => void; title?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="relative z-30">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 pb-2 pt-4">
        {back != null ? (
          <button className="text-[13px] font-bold text-primary" onClick={onBack}>‹ {back}</button>
        ) : (
          <span className="text-[17px] font-black tracking-[-.03em]">
            micaseta<i className="not-italic text-primary">.</i>
          </span>
        )}
        {title && <span className="truncate px-2 text-[12px] font-bold text-muted-foreground">{title}</span>}
        {right ?? <span />}
      </div>
    </header>
  );
}

/** Página con ancho de app móvil y aire para el dock; resplandor en capa fija. */
export const Page = ({ className = '', ...p }: any) => (
  <>
    <div className="amb pointer-events-none fixed inset-0 z-0" />
    <main className={cn('relative z-10 mx-auto min-h-screen w-full max-w-md px-[18px] pb-36 pt-2', className)} {...p} />
  </>
);
