import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import type { HTMLAttributes, ReactNode } from 'react';
import type { InstallSurface } from './pwa.utils';
import { usePwaExperience } from './usePwaExperience';
import styles from './PwaExperience.module.css';

interface PwaExperienceProps {
  online?: boolean;
  installSurface?: InstallSurface;
  updateReady?: boolean;
  onInstall?: () => Promise<void> | void;
  onUpdate?: () => void;
}

function Surface({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`${styles.surface} ${className}`} {...props}>
      {children}
    </section>
  );
}

export function PwaExperience({ online, installSurface, updateReady, onInstall, onUpdate }: PwaExperienceProps) {
  const { t } = useUiLocale();
  const pwa = usePwaExperience();
  const isOnline = online ?? pwa.online;
  const surface = installSurface ?? pwa.installSurface;
  const hasUpdate = updateReady ?? pwa.updateReady;
  const showInstall = isOnline && surface !== 'none' && surface !== 'installed';

  return (
    <div className={styles.stack} role='region' aria-label={t('shell.pwa.status')}>
      {!isOnline && (
        <Surface role='status' aria-live='polite' className={styles.statusSurface}>
          <div>
            <strong>{t('shell.pwa.offline')}</strong>
            <p>{t('shell.pwa.offlineDescription')}</p>
          </div>
          <span className={styles.statusDot} aria-hidden='true' />
        </Surface>
      )}

      {hasUpdate && (
        <Surface role='status' aria-live='polite' className={styles.statusSurface}>
          <div>
            <strong>{t('shell.pwa.updateReady')}</strong>
            <p>{t('shell.pwa.updateDescription')}</p>
          </div>
          <button className={styles.primaryAction} type='button' onClick={onUpdate ?? pwa.update}>
            {t('shell.pwa.update')}
          </button>
        </Surface>
      )}

      {showInstall && (
        <Surface aria-label={t('shell.pwa.installGuide')} className={styles.installSurface}>
          <div className={styles.installCopy}>
            <span className={styles.eyebrow}>{t('shell.brand')}</span>
            {surface === 'ios-guide' ? (
              <>
                <strong>{t('shell.pwa.iosTitle')}</strong>
                <p>{t('shell.pwa.iosDescription')}</p>
              </>
            ) : (
              <>
                <strong>{t('shell.pwa.installTitle')}</strong>
                <p>{t('shell.pwa.installDescription')}</p>
              </>
            )}
          </div>
          <div className={styles.actions}>
            {surface === 'browser-prompt' && (
              <button className={styles.primaryAction} type='button' onClick={onInstall ?? pwa.install}>
                {t('shell.pwa.install')}
              </button>
            )}
            <button className={styles.secondaryAction} type='button' onClick={pwa.dismissInstall}>
              {t('shell.pwa.closeInstall')}
            </button>
          </div>
        </Surface>
      )}
    </div>
  );
}
