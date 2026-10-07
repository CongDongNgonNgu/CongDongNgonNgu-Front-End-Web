import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import { Button } from '../../ui/Button';
import { SearchField } from '../../ui/Feedback';
import styles from './HeaderSearchPanel.module.css';

interface HeaderSearchPanelProps {
  value: string;
  announcement: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function HeaderSearchPanel({ value, announcement, onChange, onSubmit, onClose }: HeaderSearchPanelProps) {
  const { t } = useUiLocale();
  return (
    <div id='global-search-panel' className={styles.searchPanel} role='dialog' aria-label={t('shell.searchCommunity')}>
      <div className={`shell-width ${styles.searchPanelInner}`}>
        <SearchField value={value} onChange={onChange} onSubmit={onSubmit} placeholder={t('shell.searchCommunity')} label={t('shell.searchCommunity')} submitLabel={t('shell.find')} compact />
        <Button className={styles.searchClose} variant='quiet' size='sm' onClick={onClose}>{t('shell.close')}</Button>
      </div>
      {announcement ? <p className={`shell-width ${styles.searchPanelStatus}`} role='status'>{announcement}</p> : null}
    </div>
  );
}
