import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

// PWA: el service worker hace instalable la app ("Añadir a pantalla de inicio")
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* reducedMotion="user": respeta la preferencia de accesibilidad del sistema */}
    <MotionConfig reducedMotion="user">
      <App />
      <Toaster position="top-center" toastOptions={{
        style: { background: '#122B1C', color: '#EFF5EE', border: '1px solid rgba(239,245,238,.12)', borderRadius: '999px', fontWeight: 700, padding: '12px 20px' },
      }} />
    </MotionConfig>
  </React.StrictMode>,
);
