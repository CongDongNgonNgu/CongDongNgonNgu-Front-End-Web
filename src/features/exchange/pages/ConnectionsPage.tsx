import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Overlays';
import { Avatar } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { ExchangeApi } from '../exchange-api';
import { useConnections, type ConnectionAction } from '../use-connections';
import type { ConnectionListApi, ConnectionListItem, ConnectionListKind } from '../exchange.types';
import styles from './ConnectionsPage.module.css';

export interface ConnectionsPageViewProps { api: ConnectionListApi; authenticated: boolean; authLoading?: boolean; actorKey?: string }
const tabs = [
  {kind:'CONNECTED',label:'exchange.connections.connected'},
  {kind:'INCOMING',label:'exchange.connections.incoming'},
  {kind:'OUTGOING',label:'exchange.connections.outgoing'},
] as const;
export function ConnectionsPage() {
  const auth = useAuth();
  const api = useMemo(()=>new ExchangeApi(auth.api),[auth.api]);
  return <ConnectionsPageView api={api} authenticated={auth.status==='authenticated'} authLoading={auth.status==='loading'} actorKey={auth.user?.id}/>;
}
export function ConnectionsPageView({api,authenticated,authLoading=false,actorKey}: ConnectionsPageViewProps) {
  const {t}=useUiLocale();
  const data=useConnections(api,authenticated,actorKey);
  const [selection,setSelection]=useState<{item:ConnectionListItem;api:ConnectionListApi;actorKey?:string} | null>(null);
  const removal=authenticated && selection?.api===api && selection.actorKey===actorKey ? selection.item : null;
  const setRemoval=(item:ConnectionListItem|null)=>setSelection(item?{item,api,actorKey}:null);
  const returnFocus=useRef<HTMLElement | null>(null);
  useEffect(()=>{setSelection(null);returnFocus.current=null;},[authenticated,api,actorKey]);
  const act = async (action: ConnectionAction,item:ConnectionListItem) => {
    if(await data.act(action,item.targetUserId)) setRemoval(null);
  };
  return <section className={styles.page} aria-labelledby='connections-title'>
    <header className={styles.header}>
      <div><h1 id='connections-title'>{t('exchange.connections.title')}</h1><p>{t('exchange.connections.intro')}</p></div>
      <Link className={styles.link} to='/exchange'>{t('exchange.connections.find')}</Link>
    </header>
    {authLoading ? <p role='status'>{t('exchange.sessionLoading')}</p> : !authenticated ?
      <div><p>{t('exchange.connections.login')}</p><Link className={styles.link} to='/login?returnTo=%2Fexchange%2Fconnections'>{t('exchange.login')}</Link></div> : <>
      <nav className={styles.tabs} aria-label={t('exchange.connections.title')}>
        {tabs.map(tab=><button type='button' key={tab.kind} aria-pressed={data.kind===tab.kind}
          disabled={!!data.busy} onClick={()=>{setRemoval(null);data.setKind(tab.kind as ConnectionListKind);}}>{t(tab.label)}</button>)}
      </nav>
      {data.actionError && <p role='alert' className={styles.error}>{t('exchange.connections.actionError')}</p>}
      {data.loading && <p role='status' aria-live='polite'>{t('exchange.connections.loading')}</p>}
      {data.error && <div role='alert'><p>{t('exchange.connections.error')}</p><Button variant='secondary' onClick={data.retry} disabled={!!data.busy}>{t('exchange.connections.retry')}</Button></div>}
      {!data.loading && !data.error && data.items.length===0 && <p role='status'>{t(data.cursor?'exchange.connections.scanMore':'exchange.connections.empty')}</p>}
      <ul className={styles.list} aria-busy={data.loading}>
        {data.items.map(item=><li key={item.connectionId} className={styles.row}>
          <div className={styles.identity}>
            <span aria-hidden='true'><Avatar name={item.displayName}/></span>
            <div className={styles.details}>
              <strong>{item.displayName}</strong>
              <span className={styles.state}>{t(item.state==='CONNECTED'?'exchange.state.CONNECTED':item.state==='INCOMING_PENDING'?'exchange.connections.incoming':'exchange.connections.outgoing')}</span>
              <Link className={styles.link} to={'/exchange/profile/'+encodeURIComponent(item.targetUserId)}>{t('exchange.connections.profile')}</Link>
            </div>
          </div>
          <div className={styles.actions}>
            {item.state==='INCOMING_PENDING' ? <>
              <Button variant='secondary' disabled={!!data.busy} onClick={()=>void act('decline',item)}>{t('exchange.connections.decline')}</Button>
              <Button disabled={!!data.busy} loading={data.busy===item.targetUserId} onClick={()=>void act('accept',item)}>{t('exchange.connections.accept')}</Button>
            </> : item.state==='OUTGOING_PENDING' ?
              <Button variant='secondary' disabled={!!data.busy} loading={data.busy===item.targetUserId} onClick={()=>void act('cancel',item)}>{t('exchange.connections.cancel')}</Button> :
              <Button variant='secondary' disabled={!!data.busy} onClick={event=>{returnFocus.current=event.currentTarget;setRemoval(item);}}>{t('exchange.connections.disconnect')}</Button>}
          </div>
        </li>)}
      </ul>
      {data.cursor && <div className={styles.more}><Button variant='secondary' loading={data.loading} disabled={!!data.busy} onClick={data.loadMore}>{t('exchange.connections.more')}</Button></div>}
      <Dialog open={!!removal} title={t('exchange.connections.confirmTitle')} description={t('exchange.connections.confirmDescription')}
        closeLabel={t('exchange.connections.close')} returnFocusRef={returnFocus} onClose={()=>{if(!data.busy)setRemoval(null);}}
        footer={<><Button variant='secondary' disabled={!!data.busy} onClick={()=>setRemoval(null)}>{t('exchange.connections.keep')}</Button>
          <Button variant='danger' loading={!!data.busy} onClick={()=>{if(removal)void act('disconnect',removal);}}>{t('exchange.connections.confirm')}</Button></>}>
        <p>{removal?.displayName}</p>
      </Dialog>
    </>}
  </section>;
}
