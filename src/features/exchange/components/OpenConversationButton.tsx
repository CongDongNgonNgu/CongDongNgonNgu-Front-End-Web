import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useOptionalAuth } from '../../auth/AuthProvider';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { MessagingApi } from '../messaging-api';
import type { MessagingApiContract } from '../messaging.types';
import styles from './OpenConversationButton.module.css';

export function OpenConversationButton({ partnerUserId }: { partnerUserId: string }) {
  const auth = useOptionalAuth();
  const authApi = auth?.api;
  const api = useMemo(() => authApi ? new MessagingApi(authApi) : null, [authApi]);
  if (!api || auth?.status !== 'authenticated' || !auth.user) return null;
  return <OpenConversationButtonView api={api} actor={auth.user.id} partnerUserId={partnerUserId}/>;
}

export function OpenConversationButtonView({ api, actor, partnerUserId }: {
  api: Pick<MessagingApiContract, 'open'>; actor: string; partnerUserId: string;
}) {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const owner = useMemo(() => ({ api, actor, partnerUserId }), [api, actor, partnerUserId]);
  const current = useRef(owner);
  current.current = owner;
  const request = useRef<{ owner: typeof owner; abort: AbortController } | null>(null);
  const [state, setState] = useState({ owner, busy: false, error: false });
  useEffect(() => () => {
    if (request.current?.owner === owner) {
      request.current.abort.abort(); request.current = null;
    }
  }, [owner]);
  const open = async () => {
    if (request.current?.owner === owner) return;
    const abort = new AbortController();
    request.current = { owner, abort };
    setState({ owner, busy: true, error: false });
    const active = () => current.current === owner && !abort.signal.aborted;
    try {
      const conversation = await api.open(partnerUserId, abort.signal);
      if (!active()) return;
      if (!conversation.id || conversation.partner.userId !== partnerUserId) throw new Error('Invalid conversation');
      navigate('/exchange/conversations/' + encodeURIComponent(conversation.id));
    } catch {
      if (active()) setState({ owner, busy: false, error: true });
    } finally {
      if (request.current?.abort === abort) request.current = null;
      if (active()) setState(previous => ({ ...previous, busy: false }));
    }
  };
  return <div className={styles.entry}>
    <Button loading={state.owner === owner && state.busy} onClick={() => void open()}>{t('exchange.messaging.open')}</Button>
    {state.owner === owner && state.error && <p role='alert'>{t('exchange.messaging.openError')}</p>}
  </div>;
}
