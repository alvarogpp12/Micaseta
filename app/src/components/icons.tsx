import React from 'react';

/** Iconos de Micaseta, dibujados solo para esta app.
 *  Lenguaje común: rejilla 24, trazo 2 redondeado, y dos tintas — el trazo y
 *  una masa al 18 % que da cuerpo (la lona del toldo, el líquido de la jarra,
 *  el papel del recibo). La firma de la casa aparece donde toca: la banda a
 *  rayas del toldo (pase, ticket, caseta) y la flor en el pelo de la invitada. */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string };

const make = (glyph: React.ReactNode) => ({ size = 24, strokeWidth = 2, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    {glyph}
  </svg>
);
/* La masa: relleno suave sin trazo */
const F = { fill: 'currentColor', fillOpacity: 0.18, stroke: 'none' } as const;

/* Inicio: la casa. Tejado con cuerpo, puerta abierta. */
export const Home = make(<><path d="M3.5 11.5 12 4l8.5 7.5H3.5z" {...F}/><path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 11v9h12v-9"/><path d="M10 20v-5.5h4V20z" {...F}/><path d="M10 20v-5.5h4V20"/></>);
/* Mi pase: QR con tres módulos y, en el cuarto, la banda a rayas del toldo. */
export const QrCode = make(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" {...F}/><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="6" y="6" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" {...F}/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="16" y="6" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" {...F}/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="6" y="16" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/><path d="M14 16.5l3-3"/><path d="M14 20.5l7-7"/><path d="M18 20.5l2.5-2.5"/></>);
/* Pedir: la jarra de rebujito, con su asa, su pajita y el líquido dentro. */
export const Beer = make(<><path d="M6.5 12h9v5.5a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5V12z" {...F}/><path d="M6.5 7.5h9v10a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5v-10z"/><path d="M6.5 12h9"/><path d="M15.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5"/><path d="M12.5 7.5 15 2.5"/><path d="M9.5 14.5v3"/></>);
/* Mi cuenta: el recibo con cabecera, líneas y corte en zigzag. */
export const Wallet = make(<><path d="M6 3.5h12v3.8H6z" {...F}/><path d="M6 3.5h12V20l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L6 20V3.5z"/><path d="M9 10.5h6"/><path d="M9 13.5h6"/><path d="M9 16.5h3.5"/></>);
export const Receipt = Wallet;
/* Invitar: la invitada con la flor en el pelo, y un más. */
export const UserPlus = make(<><path d="M4 20a6 6 0 0 1 12 0z" {...F}/><path d="M4 20a6 6 0 0 1 12 0"/><circle cx="10" cy="8.5" r="3.4" {...F}/><circle cx="10" cy="8.5" r="3.4"/><circle cx="13.3" cy="5.2" r="1.7" fill="currentColor" stroke="none"/><path d="M19.5 11v5"/><path d="M17 13.5h5"/></>);
/* Gente: dos personas, ella con su flor. */
export const Users = make(<><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0z" {...F}/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="9" cy="8" r="3.2"/><circle cx="11.9" cy="5.1" r="1.4" fill="currentColor" stroke="none"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.2a5 5 0 0 1 5 5.3"/></>);
/* Mi caseta: el toldo de ondas a rayas, con su banderín. */
export const Store = make(<><path d="M4 9.5 5.5 5h13L20 9.5a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0z" {...F}/><path d="M4 9.5 5.5 5h13L20 9.5"/><path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M9.5 5 9 9.5"/><path d="M14.5 5l.5 4.5"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M10 20v-5h4v5"/><path d="M12 5V2.5h3.5L14.5 3.75 15.5 5"/></>);
export const BarChart3 = Store;
/* Pedidos: la lista de la pizarra con su pinza. */
export const ClipboardList = make(<><rect x="4.5" y="4.5" width="15" height="16" rx="2.2" {...F}/><rect x="4.5" y="4.5" width="15" height="16" rx="2.2"/><rect x="9" y="2.5" width="6" height="3.6" rx="1.6" fill="currentColor" stroke="none"/><path d="M8.5 11h7"/><path d="M8.5 14.5h7"/><path d="M8.5 18h4"/></>);
/* Escanear: el visor y la línea que barre el QR. */
export const ScanLine = make(<><rect x="8" y="8" width="8" height="8" rx="1.6" {...F}/><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></>);
/* Selfie: la cámara con cuerpo y su lente. */
export const Camera = make(<><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V8.5z" {...F}/><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V8.5z"/><circle cx="12" cy="12.5" r="3.3"/><circle cx="17" cy="9" r="1" fill="currentColor" stroke="none"/></>);
/* Solo entrada: el ticket con su matriz a rayas. */
export const Ticket = make(<><path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h12A2.5 2.5 0 0 1 20.5 7v2a3 3 0 0 0 0 6v2a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17v-2a3 3 0 0 0 0-6V7z" {...F}/><path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h12A2.5 2.5 0 0 1 20.5 7v2a3 3 0 0 0 0 6v2a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17v-2a3 3 0 0 0 0-6V7z"/><path d="M9.5 4.5v15" strokeDasharray="2.2 3"/><path d="M12.5 12.5 16 9"/><path d="M13 17.5 20 10.5"/><path d="M16.5 17.5 19 15"/></>);
/* Día: el calendario con su cabecera y el día marcado. */
export const Calendar = make(<><path d="M3.5 7.2A2.2 2.2 0 0 1 5.7 5h12.6a2.2 2.2 0 0 1 2.2 2.2V10h-17V7.2z" {...F}/><rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/></>);
/* Hora */
export const Clock = make(<><circle cx="12" cy="12" r="8.5" {...F}/><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>);
/* WhatsApp / mensaje: el bocadillo con cuerpo. */
export const Bubble = make(<><path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" {...F}/><path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M8.5 11.5h7"/><path d="M8.5 8.5h5"/></>);
/* Salir: la puerta y la flecha que sale. */
export const LogOut = make(<><path d="M4.5 6a2 2 0 0 1 2-2H11v16H6.5a2 2 0 0 1-2-2V6z" {...F}/><path d="M11 4H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H11"/><path d="m15.5 8 4.5 4-4.5 4"/><path d="M20 12H9"/></>);
export const CheckCircle2 = make(<><circle cx="12" cy="12" r="8.5" {...F}/><circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.5 2.5 4.9-5"/></>);
export const Check = make(<path d="m5 12.5 4.5 4.5L19 7.5"/>);
export const Copy = make(<><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2" {...F}/><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M5.5 15.5A2 2 0 0 1 4 13.5v-7a2.5 2.5 0 0 1 2.5-2.5h7a2 2 0 0 1 2 1.5"/></>);
export const X = make(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);
export const Plus = make(<><path d="M5 12h14"/><path d="M12 5v14"/></>);
export const Minus = make(<path d="M5 12h14"/>);
export const ArrowRight = make(<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>);
export const ChevronRight = make(<path d="m9 18 6-6-6-6"/>);
export const ChevronLeft = make(<path d="m15 18-6-6 6-6"/>);
