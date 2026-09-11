/** Tokens v3 "El pase" — app clara: fondo blanco, tinta, cobalto solo acción,
 * verde solo veredicto, rojo solo rechazo. Módulos blancos con borde y sombra
 * suave; listas con hairlines, nunca cajas. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Archivo', '-apple-system', 'system-ui', 'sans-serif'] },
      colors: {
        background: '#FFFFFF',
        foreground: '#14161D',                                    // tinta
        card: { DEFAULT: '#FFFFFF', foreground: '#14161D' },      // módulo: blanco + borde + sombra
        'card-border': '#E7EAF2',
        border: 'rgba(20,22,29,.08)',                             // hairline de listas
        input: '#EEF1F8',
        primary: { DEFAULT: '#3D5AF5', foreground: '#FFFFFF' },   // cobalto: SOLO acción
        'primary-2': '#2E45D8',
        secondary: { DEFAULT: '#EEF1F8', foreground: '#14161D' }, // suave: inputs, superficies hundidas
        muted: { DEFAULT: '#EEF1F8', foreground: '#6A7183' },     // gris
        destructive: { DEFAULT: '#FF5D68', foreground: '#FFFFFF' }, // rojo: SOLO rechazo
        success: { DEFAULT: '#0FA36B', foreground: '#FFFFFF' },   // verde: SOLO veredicto/acceso
        papel: '#F7F7F4',                                         // SOLO el pase y su chip
        'papel-borde': '#E9E9E2',
        tinta: '#14161D',
        'tinta-suave': '#575E70',
        'tinta-humo': '#7E8596',
      },
      borderRadius: {
        lg: '12px',        // acciones (botones, inputs, enlaces tintados)
        xl: '18px',        // chip del pase / CTA
        '2xl': '22px',     // módulos
        pase: '26px',      // el pase
      },
      boxShadow: {
        mod: '0 8px 24px rgba(20,22,29,.05)',
        glow: '0 6px 18px rgba(61,90,245,.22)',        // en app clara la sombra cobalto ensucia: suave
        'glow-fuerte': '0 10px 30px rgba(61,90,245,.35)',
        'glow-cta': '0 14px 34px rgba(61,90,245,.45)',
        'glow-exito': '0 8px 30px rgba(15,163,107,.3)',
        dock: '0 18px 44px rgba(0,0,0,.5)',
        pase: '0 16px 30px rgba(20,22,29,.1), 0 40px 80px rgba(61,90,245,.12)',
        pchip: '0 14px 30px rgba(20,22,29,.12)',
      },
    },
  },
  plugins: [],
};
