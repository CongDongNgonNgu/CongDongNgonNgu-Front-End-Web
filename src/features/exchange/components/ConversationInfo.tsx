import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Avatar } from '../../../components/ui/Surface';
import { Dialog } from '../../../components/ui/Overlays';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { DirectConversationSummary } from '../messaging.types';
import styles from './ConversationInfo.module.css';

// Mounted only alongside the current protected summary; resource/actor keys
// and access-loss unmounts dispose the dialog rather than retaining identities.
export function ConversationInfo({ partner, actorName }: { partner: DirectConversationSummary['partner']; actorName?: string }) {
  const { t } = useUiLocale();
  const [open, setOpen] = useState(false);
  return <>
    <Button variant='quiet' onClick={() => setOpen(true)}><Icon name='info'/>{t('exchange.messaging.info')}</Button>
    <Dialog open={open} title={t('exchange.messaging.info')} closeLabel={t('exchange.messaging.closeInfo')} onClose={() => setOpen(false)}>
      <p className={styles.intro}>{t('exchange.messaging.pairIntro')}</p>
      <ul className={styles.people}>
        <li><span aria-hidden='true'><Avatar name={actorName || t('exchange.messaging.you')}/></span>
          <div><strong>{actorName || t('exchange.messaging.you')}</strong>{actorName && <span>{t('exchange.messaging.you')}</span>}</div></li>
        <li><span aria-hidden='true'><Avatar name={partner.displayName}/></span><strong>{partner.displayName}</strong></li>
      </ul>
      <nav className={styles.actions} aria-label={t('exchange.messaging.info')}>
        <Link to={'/exchange/profile/' + encodeURIComponent(partner.userId)} onClick={() => setOpen(false)}>{t('exchange.messaging.profile')}</Link>
        <Link to='/exchange/connections' onClick={() => setOpen(false)}>{t('exchange.messaging.connections')}</Link>
      </nav>
      <p className={styles.note}>{t('exchange.messaging.contextAccess')}</p>
    </Dialog>
  </>;
}
