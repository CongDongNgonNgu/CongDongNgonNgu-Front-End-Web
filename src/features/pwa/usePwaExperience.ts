import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInstallSurface,
  isInstallDismissed,
  isStandaloneDisplayMode,
  markInstallDismissed,
  type InstallSurface,
} from './pwa.utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaExperienceState {
  online: boolean;
  installSurface: InstallSurface;
  updateReady: boolean;
  install: () => Promise<void>;
  dismissInstall: () => void;
  update: () => void;
}

function getStandaloneState(): boolean {
  if (typeof window === 'undefined') return false;

  const displayModeMatches = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isStandaloneDisplayMode({ displayModeMatches, navigatorStandalone });
}

export function usePwaExperience(): PwaExperienceState {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [standalone, setStandalone] = useState(getStandaloneState);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(() =>
    typeof window !== 'undefined' ? isInstallDismissed(window.sessionStorage) : false,
  );
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let active = true;
    const serviceWorkerContainer = navigator.serviceWorker;
    const observeRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      if (!active) return;
      setRegistration(nextRegistration);
      if (nextRegistration.waiting) setWaitingWorker(nextRegistration.waiting);

      nextRegistration.addEventListener('updatefound', () => {
        const installingWorker = nextRegistration.installing;
        if (!installingWorker) return;
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && serviceWorkerContainer.controller) {
            setWaitingWorker(nextRegistration.waiting ?? installingWorker);
          }
        });
      });
    };

    void serviceWorkerContainer.register('/sw.js', { scope: '/' }).then(observeRegistration).catch(() => {
      // A failed registration should not affect the core application shell.
    });

    return () => {
      active = false;
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    if (typeof window !== 'undefined') markInstallDismissed(window.sessionStorage);
  }, []);

  const update = useCallback(() => {
    const worker = waitingWorker ?? registration?.waiting;
    if (!worker || !('serviceWorker' in navigator)) return;

    const reloadAfterActivation = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterActivation, { once: true });
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, [registration, waitingWorker]);

  const installSurface = useMemo(
    () =>
      installDismissed
        ? 'none'
        : getInstallSurface({
            userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
            hasInstallPrompt: Boolean(installPrompt),
            standalone,
          }),
    [installDismissed, installPrompt, standalone],
  );

  return {
    online,
    installSurface,
    updateReady: Boolean(waitingWorker ?? registration?.waiting),
    install,
    dismissInstall,
    update,
  };
}
