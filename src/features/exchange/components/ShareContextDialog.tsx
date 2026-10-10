import { useLayoutEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { SelectControl, Textarea } from '../../../components/ui/FormControls';
import { Dialog } from '../../../components/ui/Overlays';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { ShareReference } from '../context-share';
import { useContextShare, type ContextShareApi } from '../hooks/use-context-share';
import styles from './ShareContextDialog.module.css';

interface Props { open: boolean; actor?: string; api: ContextShareApi; reference: ShareReference; onClose: () => void }
export function ShareContextDialog(props: Props) {
  return props.open && props.actor ? <OpenShareContextDialog {...props}/> : null;
}
function OpenShareContextDialog({ actor, api, reference, onClose }: Props) {
  const { t } = useUiLocale();const navigate = useNavigate();
  const data = useContextShare(api, actor, reference);
  const openButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { if (data.conversationId) openButton.current?.focus(); }, [data.conversationId]);
  const close = () => { if (!data.sending) onClose(); };
  const error = data.error === 'invalid' ? t('exchange.messaging.shareInvalid')
    : data.error === 'failed' ? t('exchange.messaging.failed')
    : data.error === 'rate-limited' ? t('exchange.messaging.rateLimited')
    : data.error === 'unavailable' ? t('exchange.messaging.unavailable') : null;
  const submit = (event: FormEvent) => { event.preventDefault();void data.submit(); };
  return <Dialog open title={t('exchange.messaging.shareTitle')} description={t('exchange.messaging.shareIntro')}
    closeLabel={t('exchange.connections.close')} onClose={close}>
    {data.conversationId ? <div className={styles.success}>
      <p role='status'>{t('exchange.messaging.shareSuccess')}</p>
      <Button ref={openButton} onClick={() => { onClose();navigate('/exchange/conversations/' + encodeURIComponent(data.conversationId!)); }}>
        {t('exchange.messaging.shareOpen')}
      </Button>
    </div> : <form className={styles.form} onSubmit={submit} noValidate aria-busy={data.sending || data.loading}>
      {data.loading && <p role='status'>{t('exchange.connections.loading')}</p>}
      {data.listError && <div role='alert'><p>{t('exchange.connections.error')}</p>
        <Button variant='secondary' onClick={() => void data.retry()}>{t('exchange.connections.retry')}</Button></div>}
      {!data.loading && !data.listError && data.partners.length === 0 && <div>
        <p>{t(data.cursor ? 'exchange.connections.scanMore' : 'exchange.messaging.shareEmpty')}</p>
        {!data.cursor && <Link onClick={close} to='/exchange'>{t('exchange.connections.find')}</Link>}
      </div>}
      <fieldset disabled={data.sending} className={styles.fields}>
        <SelectControl label={t('exchange.messaging.sharePartner')} value={data.selected} required disabled={data.loading || data.sending || !data.partners.length}
          onChange={event => data.select(event.target.value)}>
          <option value=''>{t('exchange.messaging.shareChoose')}</option>
          {data.partners.map(partner => <option key={partner.targetUserId} value={partner.targetUserId}>{partner.displayName}</option>)}
        </SelectControl>
        {data.cursor && <Button variant='quiet' loading={data.loading} onClick={() => void data.loadMore()}>{t('exchange.connections.more')}</Button>}
        <Textarea label={t('exchange.messaging.shareNote')} hint={t('exchange.messaging.limit')} value={data.note}
          onChange={event => data.setNote(event.target.value)} rows={3}/>
      </fieldset>
      {error && <p role='alert' className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button variant='quiet' disabled={data.sending} onClick={close}>{t('exchange.connections.close')}</Button>
        <Button type='submit' disabled={!data.selected || data.loading} loading={data.sending}>
          {t(data.error === 'failed' || data.error === 'rate-limited' ? 'exchange.messaging.retrySend' : 'exchange.messaging.shareSend')}
        </Button>
      </div>
    </form>}
  </Dialog>;
}
