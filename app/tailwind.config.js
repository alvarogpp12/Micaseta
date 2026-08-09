/** Tokens "La caseta de noche": monocromo verde + blanco. Sin bordes como
 * separador — se sube de capa (background → card → secondary). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['InterVar', 'Inter', '-apple-system', 'system-ui', 'sans-serif'] },
      colors: {
        background: '#06110B',                                   // noche
        foreground: '#EFF5EE',                                   // tiza
        card: { DEFAULT: '#0B1D13', foreground: '#EFF5EE' },     // noche-2
        border: 'rgba(239,245,238,.08)',                          // velo (solo hairlines de lista)
        input: 'rgba(239,245,238,.16)',
        primary: { DEFAULT: '#2FD573', foreground: '#05130B' },  // lima
        secondary: { DEFAULT: '#122B1C', foreground: '#A7E9C0' },// noche-3 / menta
        muted: { DEFAULT: '#0B1D13', foreground: '#7E9384' },    // humo
        destructive: { DEFAULT: '#FF5A47', foreground: '#06110B' },
        success: { DEFAULT: '#2FD573', foreground: '#05130B' },
        menta: '#A7E9C0',
        lona: '#F6F5EF',                                         // SOLO carnet y número
        tinta: '#131711',                                        // texto sobre lona
      },
      borderRadius: { lg: '18px', xl: '22px', '2xl': '28px' },
      boxShadow: {
        glow: '0 8px 30px rgba(47,213,115,.35)',
        dock: '0 18px 44px rgba(0,0,0,.5)',
        carnet: '0 8px 20px rgba(0,0,0,.35), 0 34px 90px rgba(47,213,115,.16), 0 60px 140px rgba(0,0,0,.5)',
      },
    },
  },
  plugins: [],
};
