import React, { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Home, Beer, Wallet, UserPlus, Store, LogOut, ChevronLeft, ChevronRight } from './components/icons';

/** Primitivos "Micaseta fácil": la app clara de siempre (blanco, tinta, cobalto
 *  solo acción, verde solo veredicto) pensada para que la entienda cualquiera:
 *  letra de 17 en adelante, botones de 56 px, iconos con nombre. */

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
    default: 'h-[52px] px-6 text-[16px]',
    sm: 'h-11 px-4 text-[14px]',
    lg: 'h-14 px-7 text-[17px]',
    icon: 'h-12 w-12',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-extrabold tracking-tight transition-all active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
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
      'flex h-[52px] w-full rounded-xl bg-secondary px-4 py-2 text-[17px] font-semibold text-foreground outline-none transition-shadow placeholder:text-[#8B92A5] focus:ring-2 focus:ring-primary/60',
      className,
    )}
    {...p}
  />
);

export const Label = ({ className = '', ...p }: any) => (
  <label className={cn('mb-1.5 mt-4 block text-[14px] font-bold text-foreground/80', className)} {...p} />
);

/** Kicker de módulo: sentence case ensanchado — el sello tipográfico de la casa. */
export const Kick = ({ className = '', ...p }: any) => (
  <div className={cn('kick mb-2.5 text-[13px] font-bold tracking-[.02em] text-muted-foreground', className)} {...p} />
);

/** Título de sección tipográfica (sin caja): "Tu gente", "Esta noche". */
export const SectionTitle = ({ className = '', ...p }: any) => (
  <h3 className={cn('mb-1 mt-7 text-[21px] font-black tracking-[-.03em] text-foreground', className)} {...p} />
);

/** Título de pantalla + una frase que explica qué es esto. */
export function Titulo({ children, sub, className = '' }: { children: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-1 pb-3 pt-1', className)}>
      <h1 className="text-[28px] font-black leading-[1.05] tracking-[-.035em]">{children}</h1>
      {sub && <p className="mt-1.5 text-[15px] font-semibold leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Chip({ tone = 'muted', className = '', ...p }: any) {
  const tones: Record<string, string> = {
    muted: 'bg-secondary text-[#4A5062]',
    ok: 'bg-success/[.12] text-success',
    bad: 'bg-destructive/[.15] text-destructive',
    soft: 'bg-primary/[.12] text-primary',
    primary: 'bg-primary/[.12] text-primary',
  };
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold', tones[tone], className)} {...p} />;
}

/** Enlace tintado "Enviar ›": botón cobalto/14%, nunca texto suelto. */
export const LinkBtn = ({ className = '', children, ...p }: any) => (
  <button className={cn('inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-primary/[.14] px-4 text-[14px] font-bold text-primary transition-all active:scale-[.97]', className)} {...p}>{children}</button>
);

export const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-secondary border-t-primary" />
  </div>
);

export const Err = ({ children }: any) =>
  children ? <p className="mt-2 text-[15px] font-bold text-destructive">{children}</p> : null;

export const Empty = ({ children }: any) => (
  <p className="py-3 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
);

/** Fila de stats bajo hairline (caja de hoy, cuenta). */
export function Stats({ items }: { items: [React.ReactNode, string][] }) {
  return (
    <div className="mt-4 flex gap-4 border-t border-border">
      {items.map(([v, l]) => (
        <div key={l} className="flex-1 pt-3.5">
          <b className="block text-[21px] font-black tabular-nums tracking-tight">{v}</b>
          <small className="mt-0.5 block text-[13px] font-bold text-muted-foreground">{l}</small>
        </div>
      ))}
    </div>
  );
}

export function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardBody className="px-4 py-4">
      <div className="mb-1 text-[13px] font-bold text-muted-foreground">{label}</div>
      <div className="truncate text-[24px] font-black tracking-tight tabular-nums">{value}</div>
    </CardBody></Card>
  );
}

/** Persona: su selfie si la hay, si no sus iniciales. `dot` = punto verde "dentro ahora". */
export function Avatar({ name, src, size = 44, dot, className = '' }: { name?: string | null; src?: string | null; size?: number; dot?: boolean; className?: string }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <div className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="h-full w-full rounded-full bg-secondary object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-full bg-primary/[.14] font-extrabold text-primary" style={{ fontSize: Math.round(size * 0.32) }}>
          {initials}
        </div>
      )}
      {dot && <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-success ring-[3px] ring-white" />}
    </div>
  );
}

/** Fila grande de acción, como las de Ajustes: icono en cuadro, texto y flecha. */
export function Row({ icon, title, sub, right, onClick, tone = 'primary' }: { icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; onClick?: () => void; tone?: 'primary' | 'ok' }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[72px] w-full items-center gap-3.5 border-t border-border px-4 py-3 text-left first:border-t-0 active:bg-secondary/60">
      <span className={cn('grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[14px]', tone === 'ok' ? 'bg-success/[.12] text-success' : 'bg-primary/[.12] text-primary')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[18px] font-extrabold tracking-[-.02em]">{title}</b>
        {sub && <small className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug text-muted-foreground">{sub}</small>}
      </span>
      {right ?? <ChevronRight size={22} className="flex-shrink-0 text-[#B4BAC8]" />}
    </button>
  );
}

/** Botón "Salir" explícito, con su icono: nadie se queda atrapado en una pantalla. */
export const SalirBtn = ({ onClick, label = 'Salir' }: { onClick: () => void; label?: string }) => (
  <button className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-secondary px-3.5 text-[14px] font-extrabold text-foreground" onClick={onClick}>
    <LogOut size={18} /> {label}
  </button>
);

/** Hoja inferior (sheet) sobre Vaul, en claro. */
export function Modal({ open, onClose, children }: any) {
  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="velo fixed inset-0 z-40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[26px] bg-card text-foreground outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-foreground/10" />
          <div className="max-h-[85vh] overflow-y-auto p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Barra de pestañas flotante, de vidrio: una cápsula despegada del borde por la
 *  que pasa el contenido al hacer scroll. Iconos de 26 px, nombre debajo y
 *  píldora azul en la activa. */
export function Dock({ tabs, tab, onTab }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; tab: string; onTab: (id: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="vidrio vidrio-flotante pointer-events-auto mx-auto flex max-w-[420px] rounded-[26px] px-1.5 pb-1.5 pt-1.5">
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => onTab(t.id)} aria-current={on ? 'page' : undefined}
              className={cn('grid flex-1 place-items-center gap-[3px] rounded-xl py-1 text-[12.5px] font-bold transition-colors', on ? 'text-primary' : 'text-[#4A5062] active:text-primary')}>
              <span className={cn('grid h-[34px] w-[58px] place-items-center rounded-full transition-colors', on && 'bg-primary/[.14]')}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
export const TabBar = Dock;

/** Las pestañas del cliente (y la quinta del dueño). */
export const CLIENT_TABS = [
  { id: 'inicio', label: 'Inicio', icon: <Home size={26} /> },
  { id: 'pedir', label: 'Pedir', icon: <Beer size={26} /> },
  { id: 'gastos', label: 'Mi cuenta', icon: <Wallet size={26} /> },
  { id: 'invitar', label: 'Invitar', icon: <UserPlus size={26} /> },
];
export const CASETA_TAB = { id: 'club', label: 'Mi caseta', icon: <Store size={26} /> };

/** ¿Ha pasado contenido por debajo de la cabecera? Es lo que enciende el vidrio:
 *  sin nada detrás, el cristal sobre blanco es niebla. */
function useScrolled(px = 8) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(window.scrollY > px);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [px]);
  return on;
}

/** Cabecera de pantalla: wordmark (raíz) o "‹ Inicio" grande (subpantalla) + contexto. */
export function TopBar({ back, onBack, title, right }: { back?: string; onBack?: () => void; title?: React.ReactNode; right?: React.ReactNode }) {
  const scrolled = useScrolled();
  return (
    <header className={cn('sticky top-0 z-30 transition-[box-shadow,background-color] duration-200', scrolled && 'vidrio')}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-md items-center justify-between px-5 pb-2 pt-3">
        {back != null ? (
          <button className="-ml-2 inline-flex h-11 items-center gap-0.5 pr-2 text-[16px] font-extrabold text-primary" onClick={onBack}><ChevronLeft size={22} /> {back}</button>
        ) : (
          <span className="text-[18px] font-black tracking-[-.03em]">
            micaseta<i className="not-italic text-primary">.</i>
          </span>
        )}
        {title && <span className="truncate px-2 text-[14px] font-bold text-muted-foreground">{title}</span>}
        {right ?? <span />}
      </div>
    </header>
  );
}

/** Página con ancho de app móvil y aire para la barra de pestañas; resplandor en capa fija. */
export const Page = ({ className = '', ...p }: any) => (
  <>
    <div className="amb pointer-events-none fixed inset-0 z-0" />
    <main className={cn('relative z-10 mx-auto min-h-screen w-full max-w-md px-[18px] pb-32 pt-2', className)} {...p} />
  </>
);
