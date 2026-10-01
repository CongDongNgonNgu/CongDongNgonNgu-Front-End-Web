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

export function NotificationPreferencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preferences, preferencesLoading, preferencesSaving, updatePreferences } = useNotificationCenter();
  const [draft, setDraft] = useState<NotificationPreferenceItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open && preferences) setDraft(preferences.preferences.map((preference) => ({ ...preference })));
  }, [open, preferences]);

  async function save() {
    try {
      setSaveError(null);
      await updatePreferences(getPreferenceChangeMatrix(draft));
      onClose();
    } catch {
      setSaveError('Chưa lưu được tùy chọn. Vui lòng thử lại.');
    }
  }

  return (
    <Dialog
      open={open}
      title='Tùy chọn thông báo'
      description='Bạn có thể giảm các cập nhật không bắt buộc. Thông báo bảo mật, tài khoản và Membership quan trọng luôn được giữ trong ứng dụng.'
      onClose={onClose}
      footer={(
        <div className={styles.footer}>
          <Button variant='quiet' onClick={onClose}>Hủy</Button>
          <Button variant='primary' loading={preferencesSaving} disabled={preferencesLoading || draft.length === 0} onClick={() => void save()}>Lưu tùy chọn</Button>
        </div>
      )}
    >
      {preferencesLoading && !preferences ? <div className={styles.loading} aria-busy='true'>Đang tải tùy chọn thông báo…</div> : null}
      {!preferencesLoading && !preferences ? <div className={styles.error} role='alert'>Không thể tải tùy chọn thông báo.</div> : null}
      {preferences ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Kênh nhận thông báo</legend>
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
                  <strong>{getPreferenceLabel(preference)}</strong>
                  {preference.locked ? <small>Bắt buộc</small> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {saveError ? <p className={styles.error} role='alert'>{saveError}</p> : null}
    </Dialog>
  );
}
