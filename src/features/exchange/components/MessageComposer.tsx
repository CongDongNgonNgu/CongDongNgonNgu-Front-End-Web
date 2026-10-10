import type { FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/FormControls';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { useMessageComposer } from '../hooks/use-message-composer';
import styles from './MessageComposer.module.css';

export function MessageComposer({ composer, enabled, onSubmit }: {
  composer: ReturnType<typeof useMessageComposer>; enabled: boolean; onSubmit: () => Promise<void>;
}) {
  const { t } = useUiLocale();
  const error = composer.error === 'invalid' ? t('exchange.messaging.invalid') : composer.error === 'failed' ? t('exchange.messaging.failed')
    : composer.error === 'rate-limited' ? t('exchange.messaging.rateLimited') : composer.error === 'unavailable' ? t('exchange.messaging.unavailable') : undefined;
  const submit = (event: FormEvent) => { event.preventDefault(); void onSubmit(); };
  return <form className={styles.composer} onSubmit={submit}>
    <Textarea label={t('exchange.messaging.composer')} hint={t('exchange.messaging.limit')} error={error} rows={3}
      value={composer.draft} disabled={!enabled} placeholder={t('exchange.messaging.placeholder')}
      onChange={event => composer.setDraft(event.target.value)}/>
    <Button type='submit' loading={composer.sending} disabled={!enabled || !composer.draft.trim()}>
      {t(composer.error === 'failed' || composer.error === 'rate-limited' ? 'exchange.messaging.retrySend' : 'exchange.messaging.send')}
    </Button>
  </form>;
}
