import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useOptionalAuth } from '../../auth/AuthProvider';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { ShareReference } from '../context-share';
import { ExchangeApi } from '../exchange-api';
import type { ContextShareApi } from '../hooks/use-context-share';
import { MessagingApi } from '../messaging-api';
import { ShareContextDialog } from './ShareContextDialog';
import styles from './ShareContextButton.module.css';

export function ShareContextButton({ reference }: { reference: ShareReference }) {
  const auth = useOptionalAuth();const authApi = auth?.api;
  const api = useMemo<ContextShareApi | null>(() => {
    if (!authApi) return null;
    const connections = new ExchangeApi(authApi), messages = new MessagingApi(authApi);
    return { listConnections: connections.listConnections.bind(connections), open: messages.open.bind(messages), send: messages.send.bind(messages) };
  }, [authApi]);
  return api && auth?.status === 'authenticated' && auth.user
    ? <ShareContextButtonView api={api} actor={auth.user.id} reference={reference}/> : null;
}
export function ShareContextButtonView({ api, actor, reference }: { api: ContextShareApi; actor: string; reference: ShareReference }) {
  const { t } = useUiLocale();
  const owner = useMemo(() => ({ api, actor, type: reference.type, id: reference.id }), [api, actor, reference.type, reference.id]);
  const [opened, setOpened] = useState<typeof owner | null>(null);
  return <>
    <Button className={styles.entryButton} variant='secondary' onClick={() => setOpened(owner)}>{t('exchange.messaging.shareWithPartner')}</Button>
    <ShareContextDialog open={opened === owner} api={api} actor={actor} reference={reference}
      onClose={() => setOpened(previous => previous === owner ? null : previous)}/>
  </>;
}
