'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  updateApp: () => void;
}

export function useServiceWorker(): ServiceWorkerState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Escuchar mensajes del SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[useServiceWorker] New version detected:', event.data.version);
        setIsUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Registrar y monitorear el SW
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        console.log('[useServiceWorker] SW registered');

        // Verificar si ya hay un worker esperando
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setIsUpdateAvailable(true);
        }

        // Escuchar cuando hay un nuevo SW instalado y esperando
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Hay una nueva versión esperando
                setWaitingWorker(newWorker);
                setIsUpdateAvailable(true);
                console.log('[useServiceWorker] New version installed and waiting');
              }
            });
          }
        });

        // Verificar actualizaciones periódicamente (cada 60 segundos)
        const checkInterval = setInterval(() => {
          reg.update().catch(console.error);
        }, 60000);

        return () => clearInterval(checkInterval);
      } catch (error) {
        console.error('[useServiceWorker] Registration failed:', error);
      }
    };

    registerSW();

    // Escuchar cuando el controlador cambia (nueva versión activada)
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateApp = useCallback(() => {
    if (waitingWorker) {
      // Indicar al SW que active la nueva versión
      waitingWorker.postMessage('SKIP_WAITING');
    } else if (registration) {
      // Forzar actualización
      registration.update().then(() => {
        window.location.reload();
      });
    } else {
      // Fallback: recargar la página
      window.location.reload();
    }
  }, [waitingWorker, registration]);

  return {
    isUpdateAvailable,
    registration,
    updateApp,
  };
}
