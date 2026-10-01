import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type {
  SpeakingRoomChat,
  SpeakingRoomClient,
  SpeakingRoomParticipant,
  SpeakingRoomPresence,
  SpeakingRoomQueue,
  SpeakingRoomQueueItem,
  SpeakingRoomReportCategory,
  SpeakingRoomSummary,
} from '../room.types';
import {
  type AudioState,
  type ConnectionState,
  type Notice,
  type ParticipantAction,
  createRequestId,
  errorCode,
  getRoomDeviceId,
  isMicrophonePermissionError,
  participantActionMessage,
  roomActionMessage,
} from '../room-page.utils';

export interface UseSpeakingRoomOptions {
  api: SpeakingRoomClient;
  roomId: string;
  authenticated: boolean;
  authLoading: boolean;
  privateAccessToken?: string;
}

export interface SpeakingRoomState {
  room: SpeakingRoomSummary | null;
  presence: SpeakingRoomPresence | null;
  queue: SpeakingRoomQueue;
  chat: SpeakingRoomChat;
  ownParticipant: SpeakingRoomParticipant | null;
  roomError: unknown;
  snapshotError: unknown;
  isLoading: boolean;
  connectionState: ConnectionState;
  audioState: AudioState;
  activePanel: 'queue' | 'chat';
  privateTokenDraft: string;
  pendingAction: string | null;
  chatDraft: string;
  notice: Notice | null;
  reportTarget: SpeakingRoomParticipant | null;
  reportCategory: SpeakingRoomReportCategory;
  reportDetails: string;
  reportSubmitting: boolean;
  chatScrollRef: RefObject<HTMLDivElement>;
  isJoined: boolean;
  isRemoved: boolean;
  setActivePanel: (panel: 'queue' | 'chat') => void;
  setPrivateTokenDraft: (value: string) => void;
  setChatDraft: (value: string) => void;
  setReportCategory: (category: SpeakingRoomReportCategory) => void;
  setReportDetails: (value: string) => void;
  setReportTarget: (participant: SpeakingRoomParticipant | null) => void;
  refreshSnapshot: () => Promise<void>;
  handlePrivateAccess: (event: FormEvent) => void;
  handleJoin: () => Promise<void>;
  handleLeave: () => Promise<void>;
  handleRaiseHand: () => Promise<void>;
  handleAudio: () => Promise<void>;
  handleParticipantAction: (action: ParticipantAction, participant: SpeakingRoomParticipant) => Promise<void>;
  handleQueueDecision: (item: SpeakingRoomQueueItem, decision: 'ACCEPT' | 'DECLINE') => Promise<void>;
  handleSubmitChat: (event: FormEvent) => Promise<void>;
  handleReportSubmit: (event: FormEvent) => Promise<void>;
  retryRoom: () => void;
}

export function useSpeakingRoom({ api, roomId, authenticated, authLoading, privateAccessToken }: UseSpeakingRoomOptions): SpeakingRoomState {
  const [room, setRoom] = useState<SpeakingRoomSummary | null>(null);
  const [presence, setPresence] = useState<SpeakingRoomPresence | null>(null);
  const [queue, setQueue] = useState<SpeakingRoomQueue>({ items: [] });
  const [chat, setChat] = useState<SpeakingRoomChat>({ items: [], nextCursor: null });
  const [ownParticipant, setOwnParticipant] = useState<SpeakingRoomParticipant | null>(null);
  const [roomError, setRoomError] = useState<unknown>(null);
  const [snapshotError, setSnapshotError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [activePanel, setActivePanel] = useState<'queue' | 'chat'>('chat');
  const [privateTokenDraft, setPrivateTokenDraft] = useState(privateAccessToken ?? '');
  const [accessToken, setAccessToken] = useState(privateAccessToken);
  const [retryKey, setRetryKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reportTarget, setReportTarget] = useState<SpeakingRoomParticipant | null>(null);
  const [reportCategory, setReportCategory] = useState<SpeakingRoomReportCategory>('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const requestSequence = useRef(0);

  const nextRequestId = useCallback(() => {
    requestSequence.current += 1;
    return createRequestId(requestSequence.current);
  }, []);

  const applyCounts = useCallback((counts: SpeakingRoomPresence['counts']) => {
    setRoom((current) => current ? { ...current, ...counts } : current);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (!authenticated) return;
    const nextPresence = await api.listParticipants(roomId, accessToken);
    setPresence(nextPresence);
    applyCounts(nextPresence.counts);
    const nextOwn = nextPresence.participants.find((participant) => participant.lastSeenAt !== null) ?? null;
    setOwnParticipant(nextOwn);
    if (!nextOwn || nextOwn.state === 'LEFT' || nextOwn.state === 'REMOVED') {
      setQueue({ items: [] });
      setChat({ items: [], nextCursor: null });
      setConnectionState('connected');
      setSnapshotError(null);
      return;
    }
    const [nextQueue, nextChat] = await Promise.all([
      api.listQueue(roomId, accessToken),
      api.listChat(roomId, { limit: 50, accessToken }),
    ]);
    setQueue(nextQueue);
    setChat(nextChat);
    setConnectionState('connected');
    setSnapshotError(null);
  }, [accessToken, api, applyCounts, authenticated, roomId]);

  useEffect(() => {
    if (authLoading || !roomId) return;
    let active = true;
    setIsLoading(true);
    setRoomError(null);
    setSnapshotError(null);
    void api.getRoom(roomId, { accessToken, authenticated })
      .then((nextRoom) => {
        if (!active) return;
        setRoom(nextRoom);
        setConnectionState('connected');
      })
      .catch((error) => {
        if (!active) return;
        setRoom(null);
        setRoomError(error);
        setConnectionState('connected');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [accessToken, api, authLoading, authenticated, retryKey, roomId]);

  useEffect(() => {
    if (!room || !authenticated) {
      setPresence(null);
      setOwnParticipant(null);
      setQueue({ items: [] });
      setChat({ items: [], nextCursor: null });
      return;
    }
    let active = true;
    void refreshSnapshot().catch((error) => {
      if (!active) return;
      setSnapshotError(error);
      setConnectionState(navigator.onLine === false ? 'offline' : 'reconnecting');
    });
    return () => { active = false; };
  }, [authenticated, refreshSnapshot, room?.id]);

  const isJoined = ownParticipant?.state === 'PRESENT' || ownParticipant?.state === 'DISCONNECTED';
  const isRemoved = ownParticipant?.state === 'REMOVED';

  useEffect(() => {
    if (!authenticated || !room || !isJoined || !ownParticipant?.participantId) return;
    let active = true;
    const poll = window.setInterval(() => {
      void refreshSnapshot().catch((error) => {
        if (!active) return;
        setSnapshotError(error);
        setConnectionState(navigator.onLine === false ? 'offline' : 'reconnecting');
      });
    }, 10_000);
    const heartbeat = window.setInterval(() => {
      void api.heartbeat(room.id, { requestId: nextRequestId(), participantId: ownParticipant.participantId! }, accessToken)
        .then((result) => {
          if (!active) return;
          setOwnParticipant(result.participant);
          applyCounts(result.counts);
          setConnectionState('connected');
        })
        .catch((error) => {
          if (!active) return;
          setSnapshotError(error);
          setConnectionState(navigator.onLine === false ? 'offline' : 'reconnecting');
        });
    }, 20_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.clearInterval(heartbeat);
    };
  }, [accessToken, api, applyCounts, authenticated, isJoined, nextRequestId, ownParticipant?.participantId, refreshSnapshot, room?.id]);

  useEffect(() => {
    const handleOffline = () => setConnectionState('offline');
    const handleOnline = () => {
      setConnectionState('reconnecting');
      void refreshSnapshot().catch(() => undefined);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    const node = chatScrollRef.current;
    if (node && activePanel === 'chat') node.scrollTop = node.scrollHeight;
  }, [activePanel, chat.items]);

  const handlePrivateAccess = (event: FormEvent) => {
    event.preventDefault();
    const nextToken = privateTokenDraft.trim();
    if (!nextToken) return;
    setAccessToken(nextToken);
    setRetryKey((value) => value + 1);
  };

  const handleJoin = async () => {
    if (!authenticated || !room || room.lifecycle !== 'LIVE') return;
    setPendingAction('join');
    setNotice(null);
    try {
      const result = await api.joinRoom(room.id, { requestId: nextRequestId(), deviceId: getRoomDeviceId(), participantId: ownParticipant?.participantId ?? null }, accessToken);
      setOwnParticipant(result.participant);
      applyCounts(result.counts);
      await refreshSnapshot();
      setNotice({ tone: 'success', message: 'Bạn đã tham gia phòng. Vai trò và trạng thái micro do máy chủ quyết định.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleLeave = async () => {
    if (!room || !ownParticipant?.participantId) return;
    setPendingAction('leave');
    try {
      const result = await api.leaveRoom(room.id, { requestId: nextRequestId(), participantId: ownParticipant.participantId, mode: 'VOLUNTARY' }, accessToken);
      applyCounts(result.counts);
      setOwnParticipant(null);
      setQueue({ items: [] });
      setChat({ items: [], nextCursor: null });
      setNotice({ tone: 'info', message: 'Bạn đã rời phòng. Không có bản ghi âm nào được tạo từ thao tác này.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRaiseHand = async () => {
    if (!room || !isJoined) return;
    const ownQueueItem = queue.items.find((item) => item.participantId && item.participantId === ownParticipant?.participantId && item.state === 'WAITING');
    const action = ownQueueItem ? 'cancel-hand' : 'raise-hand';
    setPendingAction(action);
    try {
      const nextQueue = ownQueueItem ? await api.cancelHand(room.id, nextRequestId(), accessToken) : await api.raiseHand(room.id, nextRequestId(), accessToken);
      setQueue(nextQueue);
      setNotice({ tone: 'success', message: ownQueueItem ? 'Đã hủy yêu cầu phát biểu.' : 'Đã thêm bạn vào hàng chờ phát biểu.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleAudio = async () => {
    if (!room || !isJoined) return;
    setPendingAction('audio');
    setAudioState('connecting');
    try {
      if (room.mediaProvider.state !== 'AVAILABLE') {
        const session = await api.issueMediaSession(room.id, nextRequestId(), accessToken);
        setAudioState(session.providerState === 'AVAILABLE' ? 'ready' : 'provider-unavailable');
      } else {
        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices?.getUserMedia) {
          setAudioState('permission-denied');
          return;
        }
        const stream = await mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        const session = await api.issueMediaSession(room.id, nextRequestId(), accessToken);
        setAudioState(session.providerState === 'AVAILABLE' ? 'ready' : 'provider-unavailable');
      }
    } catch (error) {
      if (isMicrophonePermissionError(error)) setAudioState('permission-denied');
      else if (errorCode(error) === 'ROOM_MEDIA_UNAVAILABLE' || room.mediaProvider.state !== 'AVAILABLE') setAudioState('provider-unavailable');
      else setAudioState('idle');
    } finally {
      setPendingAction(null);
    }
  };

  const handleParticipantAction = async (action: ParticipantAction, participant: SpeakingRoomParticipant) => {
    if (!room || !participant.participantId) return;
    if (action === 'report') {
      setReportTarget(participant);
      return;
    }
    const actionKey = `${action}:${participant.participantId}`;
    setPendingAction(actionKey);
    try {
      if (action === 'promote') await api.promoteParticipant(room.id, participant.participantId, nextRequestId(), accessToken);
      if (action === 'demote') await api.demoteParticipant(room.id, participant.participantId, nextRequestId(), accessToken);
      if (action === 'mute') await api.muteParticipant(room.id, participant.participantId, { requestId: nextRequestId(), durationSeconds: 300 }, accessToken);
      if (action === 'unmute') await api.unmuteParticipant(room.id, participant.participantId, nextRequestId(), accessToken);
      if (action === 'remove') await api.removeParticipant(room.id, participant.participantId, nextRequestId(), accessToken);
      if (action === 'block') await api.blockParticipant(room.id, participant.participantId, nextRequestId(), accessToken);
      await refreshSnapshot();
      setNotice({ tone: 'success', message: participantActionMessage(action) });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleQueueDecision = async (item: SpeakingRoomQueueItem, decision: 'ACCEPT' | 'DECLINE') => {
    if (!room || !item.queueEntryId) return;
    setPendingAction(`queue:${item.queueEntryId}`);
    try {
      await api.decideQueue(room.id, item.queueEntryId, { requestId: nextRequestId(), decision }, accessToken);
      await refreshSnapshot();
      setNotice({ tone: 'success', message: decision === 'ACCEPT' ? 'Đã chấp nhận người học lên phát biểu.' : 'Đã từ chối yêu cầu phát biểu.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmitChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!room || !isJoined) return;
    const content = chatDraft.trim();
    if (!content || content.length > 1000) return;
    setPendingAction('chat');
    try {
      await api.sendChat(room.id, { requestId: nextRequestId(), content }, accessToken);
      setChatDraft('');
      setChat(await api.listChat(room.id, { limit: 50, accessToken }));
      setNotice(null);
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const handleReportSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!room || !reportTarget?.participantId) return;
    setReportSubmitting(true);
    try {
      await api.reportParticipant(room.id, reportTarget.participantId, { requestId: nextRequestId(), category: reportCategory, details: reportDetails.trim() || null }, accessToken);
      setReportTarget(null);
      setReportDetails('');
      setNotice({ tone: 'success', message: 'Báo cáo đã được gửi cho đội ngũ kiểm duyệt.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: roomActionMessage(error) });
    } finally {
      setReportSubmitting(false);
    }
  };

  return {
    room, presence, queue, chat, ownParticipant, roomError, snapshotError, isLoading, connectionState, audioState, activePanel,
    privateTokenDraft, pendingAction, chatDraft, notice, reportTarget, reportCategory, reportDetails, reportSubmitting, chatScrollRef,
    isJoined, isRemoved, setActivePanel, setPrivateTokenDraft, setChatDraft, setReportCategory, setReportDetails, setReportTarget,
    refreshSnapshot, handlePrivateAccess, handleJoin, handleLeave, handleRaiseHand, handleAudio, handleParticipantAction,
    handleQueueDecision, handleSubmitChat, handleReportSubmit, retryRoom: () => setRetryKey((value) => value + 1),
  };
}
