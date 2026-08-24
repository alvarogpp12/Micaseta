import React from 'react';

/** Set de iconos ORIGINAL de Micaseta — vocabulario de feria, dibujado a medida.
 *  24×24, stroke currentColor redondeado. Ningún set externo. */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string };

const make = (glyph: React.ReactNode) => ({ size = 21, strokeWidth = 2, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    {glyph}
  </svg>
);

/* El carnet-QR: tres módulos redondeados + punto sólido */
export const QrCode = make(<><rect x="4" y="4" width="6" height="6" rx="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.8"/><path d="M14 14h2.5v2.5H14z"/><path d="M20 14.5V16"/><circle cx="18.8" cy="19" r="1.5" fill="currentColor" stroke="none"/></>);
/* Pedir: jarra de rebujito con burbujas */
export const Beer = make(<><path d="M7 8.5v9A2.5 2.5 0 0 0 9.5 20H13a2.5 2.5 0 0 0 2.5-2.5v-9"/><path d="M6.5 8.5h9.5"/><path d="M15.5 10.5H17a2.5 2.5 0 0 1 0 5h-1.5"/><circle cx="9.5" cy="4.8" r="1.1"/><circle cx="13" cy="3.6" r="1.1"/></>);
/* Gastos: el recibo de la cuenta, con corte en zigzag */
export const Wallet = make(<><path d="M7 3.5h10V20l-2.5-1.7L12 20l-2.5-1.7L7 20V3.5z"/><path d="M10 8h4.5"/><path d="M10 11.5h2.5"/></>);
/* Invitar: farolillo de papel + más */
export const UserPlus = make(<><ellipse cx="11" cy="12.5" rx="5.2" ry="5.8"/><path d="M11 6.7v11.6"/><path d="M8.4 7.6c-1.1 3.2-1.1 6.6 0 9.8"/><path d="M13.6 7.6c1.1 3.2 1.1 6.6 0 9.8"/><path d="M11 6.7V4.5"/><path d="M11 18.3v2"/><path d="M19 3.5v4"/><path d="M17 5.5h4"/></>);
/* La caseta: toldo de ondas + mostrador */
export const BarChart3 = make(<><path d="M4 4.5h16"/><path d="M4 4.5v3.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V4.5"/><path d="M5.5 11v9"/><path d="M18.5 11v9"/><path d="M5.5 20h13"/></>);
/* Pedidos: la pizarra de la caseta */
export const ClipboardList = make(<><rect x="4.5" y="6" width="15" height="13" rx="2"/><path d="m9 6 3-3 3 3"/><path d="M8.5 10.5h7"/><path d="M8.5 14h4.5"/></>);
/* Comanda: visor de escaneo sobre módulo QR */
export const ScanLine = make(<><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><rect x="9" y="9" width="6" height="6" rx="1.4"/></>);
/* Selfie */
export const Camera = make(<><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V8.5z"/><circle cx="12" cy="12.5" r="3.2"/></>);
/* Solo entrada: ticket con troquel punteado */
export const Ticket = make(<><path d="M4.5 7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v2a3 3 0 0 0 0 6v2a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17v-2a3 3 0 0 0 0-6V7z"/><path d="M14.5 4.5v15" strokeDasharray="2 3"/></>);
export const CheckCircle2 = make(<><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-4.8"/></>);
export const Copy = make(<><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M5.5 15.5A2 2 0 0 1 4 13.5v-7a2.5 2.5 0 0 1 2.5-2.5h7a2 2 0 0 1 2 1.5"/></>);
export const X = make(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);
export const Plus = make(<><path d="M5 12h14"/><path d="M12 5v14"/></>);
export const Minus = make(<path d="M5 12h14"/>);
export const ArrowRight = make(<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>);
export const ChevronRight = make(<path d="m9 18 6-6-6-6"/>);
