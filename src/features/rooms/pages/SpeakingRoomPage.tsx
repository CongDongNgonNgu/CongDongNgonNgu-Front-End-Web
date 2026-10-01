import { useEffect, useMemo, type FormEvent, type RefObject } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Dialog } from '../../../components/ui/Overlays';
import { Tabs } from '../../../components/ui/FormControls';
import { Avatar, Badge, Card } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { createSpeakingRoomApi } from '../room.api';
import { useSpeakingRoom } from '../hooks/useSpeakingRoom';
import type {
  SpeakingRoomChat,
  SpeakingRoomClient,
  SpeakingRoomParticipant,
  SpeakingRoomQueue,
  SpeakingRoomQueueItem,
  SpeakingRoomReportCategory,
  SpeakingRoomSummary,
} from '../room.types';
import {
  REPORT_CATEGORIES,
  type AudioState,
  type PanelId,
  type ParticipantAction,
  capitalize,
  errorCode,
  formatTime,
  readRoomAccessToken,
  languageLabel,
  lifecycleLabel,
  queueStateLabel,
  roleLabel,
  roomErrorDescription,
} from '../room-page.utils';
import styles from './SpeakingRoomPage.module.css';

interface SpeakingRoomPageViewProps {
  api: SpeakingRoomClient;
  roomId: string;
  authenticated: boolean;
  authLoading?: boolean;
  userDisplayName?: string;
  privateAccessToken?: string;
}
export function SpeakingRoomPage() {
  const { api, status, user } = useAuth();
  const { roomId = '' } = useParams();
  const location = useLocation();
  const accessTokenFromState = useMemo(() => readRoomAccessToken(location.state), [location.state]);
  const roomApi = useMemo(() => createSpeakingRoomApi(api), [api]);

  return (
    <SpeakingRoomPageView
      api={roomApi}
      roomId={roomId}
      authenticated={status === 'authenticated'}
      authLoading={status === 'loading'}
      userDisplayName={user?.displayName}
      privateAccessToken={accessTokenFromState}
    />
  );
}

export function SpeakingRoomPageView(props: SpeakingRoomPageViewProps) {
  const { api, roomId, authenticated, authLoading = false, privateAccessToken } = props;
  const state = useSpeakingRoom({ api, roomId, authenticated, authLoading, privateAccessToken });
  const {
    room, presence, queue, chat, ownParticipant, roomError, snapshotError, isLoading, connectionState, audioState,
    activePanel, privateTokenDraft, pendingAction, chatDraft, notice, reportTarget, reportCategory, reportDetails,
    reportSubmitting, chatScrollRef, isJoined, isRemoved, setActivePanel, setPrivateTokenDraft, setChatDraft,
    setReportCategory, setReportDetails, setReportTarget, refreshSnapshot, handlePrivateAccess, handleJoin, handleLeave,
    handleRaiseHand, handleAudio, handleParticipantAction, handleQueueDecision, handleSubmitChat, handleReportSubmit,
    retryRoom,
  } = state;

  usePageMetadata(room);
  if (authLoading || isLoading) {
    return <div className={styles.page}><RoomBreadcrumb /><section className={styles.loadingPanel}><Skeleton lines={8} label='Đang tải phòng luyện nói' /></section></div>;
  }

  if (roomError || !room) {
    return (
      <div className={styles.page}>
        <RoomBreadcrumb />
        {errorCode(roomError) === 'ROOM_NOT_FOUND' ? (
          <PrivateRoomGate token={privateTokenDraft} onTokenChange={setPrivateTokenDraft} onSubmit={handlePrivateAccess} />
        ) : (
          <ErrorState
            title='Không thể mở phòng luyện nói'
            description={roomErrorDescription(roomError)}
            onRetry={retryRoom}
          />
        )}
      </div>
    );
  }

  const ownQueueItem = queue.items.find((item) => item.participantId && item.participantId === ownParticipant?.participantId && item.state === 'WAITING');
  const speakers = (presence?.participants ?? []).filter((participant) => ['HOST', 'MODERATOR', 'SPEAKER'].includes(participant.role));
  const listeners = (presence?.participants ?? []).filter((participant) => participant.role === 'LISTENER');
  const canModerate = room.isHost || room.isModerator;

  return (
    <div className={styles.page}>
      <RoomBreadcrumb />
      <header className={styles.roomHeader}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrowRow}>
            <span className={styles.eyebrow}>PHÒNG LUYỆN NÓI</span>
            <Badge tone={room.lifecycle === 'LIVE' ? 'success' : 'warning'}>{room.lifecycle === 'LIVE' ? 'ĐANG LIVE' : lifecycleLabel(room.lifecycle)}</Badge>
            {room.visibility === 'PRIVATE' ? <Badge tone='neutral'><Icon name='lock' size={16} /> Riêng tư</Badge> : null}
          </div>
          <h1>{room.topic}</h1>
          <p className={styles.roomMeta}>{languageLabel(room.languageCode)} <span aria-hidden='true'>·</span> {room.level ?? 'Mọi trình độ'} <span aria-hidden='true'>·</span> {room.participantCount}/{room.capacity} người đang tham gia</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.backLink} to='/exchange'><Icon name='arrow-left-right' size={16} /> Tìm bạn học</Link>
          {isJoined ? <Button variant='danger' size='sm' onClick={handleLeave} loading={pendingAction === 'leave'}><Icon name='log-out' size={16} /> Rời phòng</Button> : null}
        </div>
      </header>

      <div className={styles.privacyBanner} role='note'>
        <Icon name='shield-check' size={20} />
        <div><strong>Âm thanh là tạm thời.</strong> Phòng này không tự động ghi âm, lưu transcript hay gửi nội dung sang AI. Mọi vai trò và quyền truy cập đều do máy chủ xác nhận.</div>
      </div>

      {connectionState !== 'connected' ? (
        <div className={styles.connectionBanner} role='status'>
          <Icon name={connectionState === 'offline' ? 'wifi-off' : 'refresh-cw'} size={18} />
          <span>{connectionState === 'offline' ? 'Bạn đang offline. Sẽ đồng bộ lại khi kết nối trở lại.' : 'Đang kết nối lại với phòng. Trạng thái hiển thị có thể chưa mới nhất.'}</span>
          <Button variant='quiet' size='sm' onClick={() => void refreshSnapshot().catch(() => undefined)}>Thử đồng bộ</Button>
        </div>
      ) : null}
      {snapshotError && connectionState === 'connected' ? <p className={styles.inlineNotice} role='status'>Một phần trạng thái phòng chưa đồng bộ. Các thao tác quan trọng vẫn cần máy chủ xác nhận.</p> : null}
      {notice ? <div className={`${styles.notice} ${styles[`notice${capitalize(notice.tone)}`]}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>{notice.message}</div> : null}

      {isRemoved ? (
        <section className={styles.removedState} aria-labelledby='room-removed-title'>
          <Icon name='shield-alert' size={24} />
          <h2 id='room-removed-title'>Bạn đã được rời khỏi phòng</h2>
          <p>Quyết định kiểm duyệt được máy chủ áp dụng. Bạn không thể thực hiện thêm thao tác trong phiên này.</p>
          <Link className={styles.textLink} to='/exchange'>Quay về tìm bạn học</Link>
        </section>
      ) : (
        <>
          {room.lifecycle !== 'LIVE' ? <RoomLifecycleState room={room} /> : null}
          <div className={styles.workspace}>
            <main className={styles.mainColumn}>
              <RoomContextCard room={room} />
              <section className={styles.stageSection} aria-labelledby='speaking-stage-title'>
                <div className={styles.sectionHeading}>
                  <div><p className={styles.sectionKicker}>SÂN KHẤU ÂM THANH</p><h2 id='speaking-stage-title'>Ai đang có mặt</h2></div>
                  <span className={styles.serverProjection}><Icon name='shield-check' size={16} /> Server-projected</span>
                </div>
                {speakers.length > 0 ? (
                  <div className={styles.speakerGrid}>
                    {speakers.map((participant) => <ParticipantCard key={`${participant.displayName}-${participant.joinedAt}`} participant={participant} own={participant.lastSeenAt !== null} canModerate={canModerate} pendingAction={pendingAction} onAction={handleParticipantAction} />)}
                  </div>
                ) : <EmptyRoomState label='Chưa có người phát biểu. Bạn có thể giơ tay để tham gia khi phòng mở.' />}
              </section>

              <section className={styles.listenersSection} aria-labelledby='listeners-title'>
                <div className={styles.sectionHeading}><div><p className={styles.sectionKicker}>NGƯỜI NGHE</p><h2 id='listeners-title'>{room.listenerCount} người đang nghe</h2></div><Badge tone='info'><Icon name='users' size={16} /> {room.participantCount}/{room.capacity}</Badge></div>
                {listeners.length > 0 ? <div className={styles.listenerGrid}>{listeners.map((participant) => <ParticipantRow key={`${participant.displayName}-${participant.joinedAt}`} participant={participant} own={participant.lastSeenAt !== null} canModerate={canModerate} pendingAction={pendingAction} onAction={handleParticipantAction} />)}</div> : <p className={styles.mutedCopy}>Danh sách người nghe sẽ hiện sau khi có người tham gia.</p>}
              </section>

              <AudioDock
                isJoined={Boolean(isJoined)}
                isLive={room.lifecycle === 'LIVE'}
                audioState={audioState}
                providerState={room.mediaProvider.state}
                ownParticipant={ownParticipant}
                hasWaitingHand={Boolean(ownQueueItem)}
                pendingAction={pendingAction}
                authenticated={authenticated}
                onAudio={handleAudio}
                onRaiseHand={handleRaiseHand}
                onJoin={handleJoin}
              />
            </main>

            <aside className={styles.sideColumn} aria-label='Bảng điều khiển phòng'>
              <Tabs tabs={[{ id: 'chat', label: `Trò chuyện${chat.items.length ? ` · ${chat.items.length}` : ''}`, disabled: !isJoined }, { id: 'queue', label: `Hàng chờ${queue.items.length ? ` · ${queue.items.length}` : ''}`, disabled: !isJoined }]} value={activePanel} onChange={(id) => setActivePanel(id as PanelId)} />
              {activePanel === 'chat' ? (
                <ChatPanel chat={chat} draft={chatDraft} onDraftChange={setChatDraft} onSubmit={handleSubmitChat} scrollRef={chatScrollRef} disabled={!isJoined} pending={pendingAction === 'chat'} />
              ) : (
                <QueuePanel queue={queue} ownQueueItem={ownQueueItem} canModerate={canModerate} pendingAction={pendingAction} onCancel={handleRaiseHand} onDecision={handleQueueDecision} />
              )}
              <RoomSafetyCard providerState={room.mediaProvider.state} visibility={room.visibility} />
            </aside>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(reportTarget)}
        title={`Báo cáo ${reportTarget?.displayName ?? 'người tham gia'}`}
        description='Chỉ gửi thông tin cần thiết cho đội ngũ kiểm duyệt. Báo cáo được xử lý phía máy chủ.'
        onClose={() => setReportTarget(null)}
        footer={<div className={styles.dialogActions}><Button variant='quiet' onClick={() => setReportTarget(null)}>Hủy</Button><Button variant='danger' type='submit' form='room-report-form' loading={reportSubmitting}>Gửi báo cáo</Button></div>}
      >
        <form id='room-report-form' className={styles.reportForm} onSubmit={handleReportSubmit}>
          <label htmlFor='room-report-category'>Lý do</label>
          <select id='room-report-category' value={reportCategory} onChange={(event) => setReportCategory(event.target.value as SpeakingRoomReportCategory)}>
            {REPORT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
          <label htmlFor='room-report-details'>Mô tả thêm <span>(không bắt buộc)</span></label>
          <textarea id='room-report-details' value={reportDetails} maxLength={1000} onChange={(event) => setReportDetails(event.target.value)} rows={5} />
        </form>
      </Dialog>
    </div>
  );
}

function RoomBreadcrumb() {
  return <nav className={styles.breadcrumbs} aria-label='Điều hướng'><Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><span aria-current='page'>Phòng luyện nói</span></nav>;
}

function PrivateRoomGate({ token, onTokenChange, onSubmit }: { token: string; onTokenChange: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <section className={styles.privateGate} aria-labelledby='private-room-title'>
      <div className={styles.privateGateIcon}><Icon name='lock' size={24} /></div>
      <p className={styles.sectionKicker}>PHÒNG RIÊNG TƯ</p>
      <h1 id='private-room-title'>Cần mã truy cập để mở phòng</h1>
      <p>Nhập mã được chia sẻ bởi chủ phòng. Mã chỉ được giữ trong phiên trình duyệt này, không được đưa vào URL hay lưu thành hồ sơ.</p>
      <form className={styles.privateForm} onSubmit={onSubmit}>
        <label htmlFor='room-access-token'>Mã truy cập</label>
        <input id='room-access-token' value={token} onChange={(event) => onTokenChange(event.target.value)} autoComplete='off' spellCheck={false} />
        <Button type='submit' variant='primary' disabled={!token.trim()}>Mở phòng</Button>
      </form>
    </section>
  );
}

function RoomLifecycleState({ room }: { room: SpeakingRoomSummary }) {
  const copy = room.lifecycle === 'SCHEDULED'
    ? 'Phòng chưa mở. Khi chủ phòng bắt đầu, bạn có thể quay lại để tham gia.'
    : room.lifecycle === 'ENDED'
      ? 'Phòng đã kết thúc. Âm thanh tạm thời không còn khả dụng.'
      : 'Phòng hiện không nhận thêm người tham gia.';
  return <div className={styles.lifecycleBanner} role='status'><Icon name='radio' size={18} /><span>{copy}</span></div>;
}

function RoomContextCard({ room }: { room: SpeakingRoomSummary }) {
  return (
    <Card className={styles.contextCard} as='section'>
      <div className={styles.contextTopline}><span className={styles.liveDot} aria-hidden='true' /><span>{room.lifecycle === 'LIVE' ? 'Đang diễn ra' : lifecycleLabel(room.lifecycle)}</span><span className={styles.contextRule} /><span>{room.visibility === 'PRIVATE' ? 'Không gian riêng tư' : 'Mở cho cộng đồng'}</span></div>
      <div className={styles.contextGrid}>
        <div><span className={styles.contextLabel}>Chủ đề</span><strong>{room.topic}</strong></div>
        <div><span className={styles.contextLabel}>Ngôn ngữ</span><strong>{languageLabel(room.languageCode)}</strong></div>
        <div><span className={styles.contextLabel}>Trình độ</span><strong>{room.level ?? 'Mọi trình độ'}</strong></div>
      </div>
    </Card>
  );
}

function AudioDock({ isJoined, isLive, audioState, providerState, ownParticipant, hasWaitingHand, pendingAction, authenticated, onAudio, onRaiseHand, onJoin }: {
  isJoined: boolean;
  isLive: boolean;
  audioState: AudioState;
  providerState: string;
  ownParticipant: SpeakingRoomParticipant | null;
  hasWaitingHand: boolean;
  pendingAction: string | null;
  authenticated: boolean;
  onAudio: () => void;
  onRaiseHand: () => void;
  onJoin: () => void;
}) {
  if (!authenticated) {
    return <section className={styles.audioDock} aria-label='Đăng nhập để tham gia'><div><p className={styles.sectionKicker}>SẴN SÀNG THAM GIA?</p><strong>Đăng nhập để vào phòng và giữ quyền kiểm soát micro.</strong></div><Link className={styles.primaryLink} to='/login'>Đăng nhập</Link></section>;
  }
  if (!isJoined) {
    return <section className={styles.audioDock} aria-label='Tham gia phòng'><div><p className={styles.sectionKicker}>PHIÊN ÂM THANH TẠM THỜI</p><strong>{isLive ? 'Tham gia để nghe, giơ tay và trò chuyện an toàn.' : 'Phòng chưa sẵn sàng nhận người tham gia.'}</strong><span>Không tự động ghi âm hoặc lưu nội dung.</span></div><Button variant='secondary' onClick={onJoin} loading={pendingAction === 'join'} disabled={!isLive}>Tham gia phòng</Button></section>;
  }
  const audioLabel = audioState === 'provider-unavailable' || providerState !== 'AVAILABLE'
    ? 'Nhà cung cấp âm thanh chưa sẵn sàng'
    : audioState === 'permission-denied'
      ? 'Micro chưa được cấp quyền'
      : audioState === 'ready'
        ? 'Phiên âm thanh đã sẵn sàng'
        : 'Kết nối âm thanh';
  return (
    <section className={styles.audioDock} aria-label='Điều khiển phiên âm thanh'>
      <div className={styles.audioStatus}><span className={`${styles.audioIndicator} ${audioState === 'ready' ? styles.audioIndicatorReady : ''}`} aria-hidden='true' /><div><strong>{audioLabel}</strong><span>{roleLabel(ownParticipant?.role ?? 'LISTENER')} · trạng thái do máy chủ xác nhận</span></div></div>
      <div className={styles.audioActions}><Button variant='quiet' onClick={onAudio} loading={pendingAction === 'audio'} disabled={audioState === 'ready'}><Icon name={audioState === 'permission-denied' ? 'mic-off' : 'mic'} size={18} /> {audioState === 'permission-denied' ? 'Thử cấp quyền lại' : 'Cấp quyền micro'}</Button><Button variant={hasWaitingHand ? 'secondary' : 'primary'} onClick={onRaiseHand} loading={pendingAction === 'raise-hand' || pendingAction === 'cancel-hand'}><Icon name='hand' size={18} /> {hasWaitingHand ? 'Hủy giơ tay' : 'Giơ tay phát biểu'}</Button></div>
    </section>
  );
}

function ParticipantCard({ participant, own, canModerate, pendingAction, onAction }: ParticipantProps) {
  return <article className={styles.speakerCard}><div className={styles.participantTop}><Avatar name={participant.displayName} size='lg' /><div className={styles.participantIdentity}><strong>{participant.displayName}{own ? ' · Bạn' : ''}</strong><span>{roleLabel(participant.role)}</span></div><ParticipantState participant={participant} /></div><div className={styles.speakerCardFooter}><span>{participant.muted ? <><Icon name='mic-off' size={16} /> Đang tắt tiếng</> : <><Icon name='volume-2' size={16} /> Có thể phát biểu</>}</span><ParticipantActions participant={participant} own={own} canModerate={canModerate} pendingAction={pendingAction} onAction={onAction} /></div></article>;
}

function ParticipantRow({ participant, own, canModerate, pendingAction, onAction }: ParticipantProps) {
  return <article className={styles.listenerRow}><div className={styles.participantTop}><Avatar name={participant.displayName} size='sm' /><div className={styles.participantIdentity}><strong>{participant.displayName}{own ? ' · Bạn' : ''}</strong><span>{roleLabel(participant.role)}</span></div><ParticipantState participant={participant} /></div><ParticipantActions participant={participant} own={own} canModerate={canModerate} pendingAction={pendingAction} onAction={onAction} /></article>;
}

function ParticipantState({ participant }: { participant: SpeakingRoomParticipant }) {
  if (participant.state === 'DISCONNECTED') return <Badge tone='warning'>Đang kết nối lại</Badge>;
  if (participant.muted) return <span className={styles.mutedIcon} title='Đang tắt tiếng'><Icon name='mic-off' size={16} /></span>;
  return <span className={styles.presenceDot} title='Đang hiện diện' aria-label='Đang hiện diện' />;
}

interface ParticipantProps {
  participant: SpeakingRoomParticipant;
  own: boolean;
  canModerate: boolean;
  pendingAction: string | null;
  onAction: (action: ParticipantAction, participant: SpeakingRoomParticipant) => void;
}

function ParticipantActions({ participant, own, canModerate, pendingAction, onAction }: ParticipantProps) {
  if (own) return <span className={styles.youLabel}>Bạn</span>;
  const actionKey = (action: ParticipantAction) => `${action}:${participant.participantId}`;
  return (
    <details className={styles.participantActions}>
      <summary aria-label={`Thao tác với ${participant.displayName}`}><Icon name='more-horizontal' size={18} /></summary>
      <div className={styles.actionMenu}>
        {canModerate && participant.role === 'LISTENER' ? <button type='button' disabled={Boolean(pendingAction)} onClick={() => onAction('promote', participant)}><Icon name='user-plus' size={16} /> Mời lên phát biểu</button> : null}
        {canModerate && participant.role === 'SPEAKER' ? <button type='button' disabled={Boolean(pendingAction)} onClick={() => onAction('demote', participant)}><Icon name='user-minus' size={16} /> Hạ xuống người nghe</button> : null}
        {canModerate && !participant.muted ? <button type='button' disabled={pendingAction === actionKey('mute')} onClick={() => onAction('mute', participant)}><Icon name='mic-off' size={16} /> Tắt tiếng</button> : null}
        {canModerate && participant.muted ? <button type='button' disabled={pendingAction === actionKey('unmute')} onClick={() => onAction('unmute', participant)}><Icon name='mic' size={16} /> Bật tiếng</button> : null}
        {canModerate ? <button type='button' className={styles.dangerAction} disabled={pendingAction === actionKey('remove')} onClick={() => onAction('remove', participant)}><Icon name='user-minus' size={16} /> Mời rời phòng</button> : null}
        <button type='button' disabled={Boolean(pendingAction)} onClick={() => onAction('block', participant)}><Icon name='shield-alert' size={16} /> Chặn trong phòng</button>
        <button type='button' disabled={Boolean(pendingAction)} onClick={() => onAction('report', participant)}><Icon name='flag' size={16} /> Báo cáo</button>
      </div>
    </details>
  );
}

function QueuePanel({ queue, ownQueueItem, canModerate, pendingAction, onCancel, onDecision }: { queue: SpeakingRoomQueue; ownQueueItem: SpeakingRoomQueueItem | undefined; canModerate: boolean; pendingAction: string | null; onCancel: () => void; onDecision: (item: SpeakingRoomQueueItem, decision: 'ACCEPT' | 'DECLINE') => void }) {
  return <section className={styles.panel} aria-labelledby='queue-panel-title'><div className={styles.panelHeader}><div><p className={styles.sectionKicker}>SPEAKER QUEUE</p><h2 id='queue-panel-title'>Hàng chờ phát biểu</h2></div><Badge tone='warning'>{queue.items.filter((item) => item.state === 'WAITING').length} đang chờ</Badge></div>{ownQueueItem ? <div className={styles.queueNotice}><Icon name='hand' size={18} /><span>Bạn đang ở vị trí <strong>{ownQueueItem.position ?? '—'}</strong>. Người điều phối sẽ quyết định từ máy chủ.</span><Button variant='quiet' size='sm' onClick={onCancel} loading={pendingAction === 'cancel-hand'}>Hủy</Button></div> : null}{queue.items.length > 0 ? <ol className={styles.queueList}>{queue.items.map((item) => <li key={item.queueEntryId ?? `${item.displayName}-${item.requestedAt}`}><div><strong>{item.displayName}</strong><span>{item.state === 'WAITING' ? `Vị trí ${item.position ?? '—'}` : queueStateLabel(item.state)}</span></div>{canModerate && item.state === 'WAITING' && item.queueEntryId ? <div className={styles.queueActions}><Button variant='secondary' size='sm' disabled={Boolean(pendingAction)} onClick={() => onDecision(item, 'ACCEPT')}>Chấp nhận</Button><Button variant='quiet' size='sm' disabled={Boolean(pendingAction)} onClick={() => onDecision(item, 'DECLINE')}>Từ chối</Button></div> : null}</li>)}</ol> : <EmptyRoomState label='Chưa có yêu cầu phát biểu.' />}</section>;
}

function ChatPanel({ chat, draft, onDraftChange, onSubmit, scrollRef, disabled, pending }: { chat: SpeakingRoomChat; draft: string; onDraftChange: (value: string) => void; onSubmit: (event: FormEvent) => void; scrollRef: RefObject<HTMLDivElement>; disabled: boolean; pending: boolean }) {
  return <section className={styles.panel} aria-labelledby='chat-panel-title'><div className={styles.panelHeader}><div><p className={styles.sectionKicker}>ROOM CHAT</p><h2 id='chat-panel-title'>Trò chuyện</h2></div><span className={styles.boundedLabel}>Tối đa 1.000 ký tự</span></div>{disabled ? <EmptyRoomState label='Tham gia phòng để xem chat.' /> : <><div className={styles.chatList} ref={scrollRef} role='log' aria-live='polite' aria-label='Tin nhắn trong phòng'>{chat.items.length > 0 ? chat.items.map((message) => <article className={message.own ? `${styles.chatMessage} ${styles.chatMessageOwn}` : styles.chatMessage} key={message.id}><Avatar name={message.displayName} size='sm' decorative /><div><div className={styles.chatMeta}><strong>{message.own ? 'Bạn' : message.displayName}</strong><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div><p>{message.body}</p></div></article>) : <EmptyRoomState label='Chưa có tin nhắn. Hãy bắt đầu bằng một lời chào.' />}</div><form className={styles.chatForm} onSubmit={onSubmit}><label className={styles.srOnly} htmlFor='room-chat-input'>Tin nhắn</label><textarea id='room-chat-input' rows={2} maxLength={1000} value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder='Viết tin nhắn ngắn, thân thiện…' /><Button type='submit' variant='primary' aria-label='Gửi tin nhắn' disabled={!draft.trim()} loading={pending}><Icon name='send' size={18} /></Button></form></>}</section>;
}

function RoomSafetyCard({ providerState, visibility }: { providerState: string; visibility: 'PUBLIC' | 'PRIVATE' }) {
  return <section className={styles.safetyCard} aria-label='An toàn phòng'><div className={styles.safetyHeading}><Icon name='shield-check' size={18} /><strong>Biên an toàn</strong></div><ul><li>{visibility === 'PRIVATE' ? 'Mã truy cập không hiển thị trong URL.' : 'Quyền tham gia được kiểm tra ở máy chủ.'}</li><li>Chat là văn bản thuần, không render HTML.</li><li>{providerState === 'AVAILABLE' ? 'Nhà cung cấp âm thanh đang sẵn sàng.' : 'Âm thanh đang ở chế độ an toàn, chưa kết nối provider.'}</li></ul></section>;
}

function EmptyRoomState({ label }: { label: string }) { return <div className={styles.emptyState}><Icon name='users' size={20} /><span>{label}</span></div>; }

function usePageMetadata(room: SpeakingRoomSummary | null) {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    document.title = room ? `${room.topic} · Phòng luyện nói | CongDongNgonNgu.vn` : 'Phòng luyện nói | CongDongNgonNgu.vn';
    meta?.setAttribute('content', room ? `Phòng luyện nói ${room.languageCode}, trạng thái ${room.lifecycle.toLowerCase()}.` : 'Tham gia phòng luyện nói ngôn ngữ an toàn.');
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
    };
  }, [room]);
}
