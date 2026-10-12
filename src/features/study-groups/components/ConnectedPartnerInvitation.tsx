import { useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Overlays';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { groupErrorKey } from '../study-groups.policy';
import { useConnectedPartnerInvitation, type ConnectedInvitationScope } from '../hooks/useConnectedPartnerInvitation';
import { IssuedInvitationDialog } from './IssuedInvitationDialog';
import styles from './ConnectedPartnerInvitation.module.css';

export function ConnectedPartnerInvitation(props: ConnectedInvitationScope & { groupName: string }) {
  const { t } = useUiLocale();
  const picker = useConnectedPartnerInvitation(props);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!props.enabled) return null;
  return <>
    <Button ref={trigger} variant="secondary" onClick={picker.openPicker}>{t('groups.connectedInvite')}</Button>
    {picker.open && !picker.invite ? <Dialog open title={t('groups.connectedInvite')} closeLabel={t('groups.close')}
      description={t('groups.connectedInviteHelp')} onClose={picker.close} returnFocusRef={trigger}
      footer={<div className={styles.footer}>
        <Button variant="secondary" onClick={picker.close}>{t('groups.close')}</Button>
        <Button disabled={!picker.selected || picker.loading || picker.busy} loading={picker.busy} onClick={() => void picker.issue()}>{t('groups.createConnectedInvite')}</Button>
      </div>}>
      <div className={styles.content}>
        <p className={styles.group}>{props.groupName}</p>
        <p className={styles.note}>{t('groups.connectedInviteNote')}</p>
        {picker.loading ? <p role="status">{t('groups.loading')}</p> : null}
        {picker.error ? <p role="alert">{t(groupErrorKey(picker.error))} <Button variant="quiet" onClick={() => void picker.load()}>{t('groups.retry')}</Button></p> : null}
        {!picker.loading && !picker.error && picker.items.length === 0 ? <p role="status">{t('groups.noConnectedPartners')}</p> : null}
        {picker.items.length ? <fieldset className={styles.partners} disabled={picker.busy || picker.loading}>
          <legend>{t('groups.connectedPartners')}</legend>
          <div className={styles.list}>{picker.items.map(partner => <label className={styles.partner} key={partner.targetUserId}>
            <input type="radio" name="connected-partner" value={partner.targetUserId} checked={picker.selected === partner.targetUserId} onChange={() => picker.select(partner.targetUserId)} />
            <span className={styles.avatar} aria-hidden="true">{partner.displayName.slice(0, 1)}</span>
            <span className={styles.name}>{partner.displayName}</span><span className={styles.badge}>{t('groups.connected')}</span>
          </label>)}</div>
        </fieldset> : null}
        {picker.cursor ? <Button variant="quiet" disabled={picker.loading || picker.busy} onClick={() => void picker.load(true)}>{t('groups.loadMorePartners')}</Button> : null}
      </div>
    </Dialog> : null}
    {picker.invite ? <IssuedInvitationDialog invite={picker.invite} groupId={props.groupId} onClose={picker.close} returnFocusRef={trigger} /> : null}
  </>;
}
