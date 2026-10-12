import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Overlays';
import {
  getPreferenceChangeMatrix,
  getPreferenceLabel,
  useNotificationCenter,
} from './NotificationCenterProvider';
import type { NotificationPreferenceItem } from './notification.types';
import styles from './NotificationPreferencesDialog.module.css';
import { useUiLocale } from '../ui-locale/UiLocaleProvider';

export function NotificationPreferencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t } = useUiLocale();
  const { preferences, preferencesLoading, preferencesSaving, updatePreferences } = useNotificationCenter();
  const [draft, setDraft] = useState<NotificationPreferenceItem[]>([]);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (open && preferences) setDraft(preferences.preferences.map((preference) => ({ ...preference })));
  }, [open, preferences]);

  async function save() {
    try {
      setSaveError(false);
      await updatePreferences(getPreferenceChangeMatrix(draft));
      onClose();
    } catch {
      setSaveError(true);
    }
  }

  return (
    <Dialog
      open={open}
      closeLabel={t('exchange.notifications.closePreferences')}
      title={t('exchange.notifications.preferencesTitle')}
      description={t('exchange.notifications.preferencesDescription')}
      onClose={onClose}
      footer={(
        <div className={styles.footer}>
          <Button variant='quiet' onClick={onClose}>{t('exchange.notifications.cancel')}</Button>
          <Button variant='primary' loading={preferencesSaving} disabled={preferencesLoading || draft.length === 0} onClick={() => void save()}>{t('exchange.notifications.save')}</Button>
        </div>
      )}
    >
      {preferencesLoading && !preferences ? <div className={styles.loading} aria-busy='true'>{t('exchange.notifications.preferencesLoading')}</div> : null}
      {!preferencesLoading && !preferences ? <div className={styles.error} role='alert'>{t('exchange.notifications.preferencesUnavailable')}</div> : null}
      {preferences ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('exchange.notifications.channels')}</legend>
          <div className={styles.grid}>
            {draft.map((preference) => (
              <label className={[styles.option, preference.locked ? styles.optionLocked : ''].filter(Boolean).join(' ')} key={`${preference.category}-${preference.channel}`}>
                <input
                  type='checkbox'
                  checked={preference.enabled}
                  disabled={preference.locked || preferencesSaving}
                  onChange={(event) => setDraft((current) => current.map((item) => item.category === preference.category && item.channel === preference.channel
                    ? { ...item, enabled: event.target.checked }
                    : item))}
                />
                <span>
                  <strong>{getPreferenceLabel(preference, locale)}</strong>
                  {preference.locked ? <small>{t('exchange.notifications.required')}</small> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {saveError ? <p className={styles.error} role='alert'>{t('exchange.notifications.saveRetry')}</p> : null}
    </Dialog>
  );
}
