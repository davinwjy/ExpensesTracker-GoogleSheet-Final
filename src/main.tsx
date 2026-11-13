import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const UI_CACHE_VERSION = 'wealthtrack_ui_design_v2026_11_13_v2';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In development/preview, unregister any stale service workers and clear caches so UI changes appear immediately
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key).catch(() => {});
        }
      });
    }
  } else {
    // In production build, bust stale UI caches when UI_CACHE_VERSION changes
    const lastVersion = localStorage.getItem('wt_ui_cache_version');
    if (lastVersion !== UI_CACHE_VERSION && 'caches' in window) {
      localStorage.setItem('wt_ui_cache_version', UI_CACHE_VERSION);
      caches.keys().then((keys) => {
        Promise.all(keys.map((k) => caches.delete(k))).then(() => {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => r.update().catch(() => {}));
          });
        });
      });
    }

    registerSW({
      immediate: true,
      onRegisteredSW(_swScriptUrl, registration) {
        if (registration) {
          registration.update().catch(() => {});
          setInterval(() => {
            registration.update().catch(() => {});
          }, 15 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.warn('Service worker registration failed:', error);
      },
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
