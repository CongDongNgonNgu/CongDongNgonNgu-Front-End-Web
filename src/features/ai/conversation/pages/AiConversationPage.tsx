import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import type { OwnProfile } from '../../../onboarding/onboarding.types';
import { ApiClientError } from '../../../../services/api-client';
import { AiConversationApi } from '../ai-conversation.api';
import { AI_ROLEPLAY_SCENARIOS, type AiConversation, type AiConversationMode, type AiRoleplayConfig } from '../ai-conversation.types';
import { ConversationWorkspace } from '../components/ConversationWorkspace';

export function AiConversationPage({ forcedMode }: { forcedMode?: AiConversationMode } = {}) {
  const { status, api } = useAuth();
  const { pathname } = useLocation();
  const mode: AiConversationMode = forcedMode ?? (pathname.includes('/roleplay') ? 'roleplay' : 'conversation');
  const conversationApi = useMemo(() => new AiConversationApi(api), [api]);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [session, setSession] = useState<AiConversation | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState('business-meeting');
  const selectedScenarioRef = useRef(selectedScenarioId);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetLanguage = useMemo(() => {
    const learning = profile?.languages.find((language) => language.roles.includes('learning') && language.isPrimaryLearningTarget)
      ?? profile?.languages.find((language) => language.roles.includes('learning'));
    return learning ? { code: learning.code, name: learning.englishName, proficiency: learning.assessedProficiency ?? learning.declaredProficiency } : null;
  }, [profile]);

  const createSession = useCallback(async (nextProfile: OwnProfile, nextScenarioId: string) => {
    const language = nextProfile.languages.find((item) => item.roles.includes('learning') && item.isPrimaryLearningTarget)
      ?? nextProfile.languages.find((item) => item.roles.includes('learning'));
    if (!language) throw new Error('Hãy chọn một ngôn ngữ đang học trong hồ sơ trước khi luyện tập.');
    const base = { mode, targetLanguageCode: language.code, responseLanguageCode: language.code } as { mode: AiConversationMode; targetLanguageCode: string; responseLanguageCode: string; roleplay?: AiRoleplayConfig };
    if (mode === 'roleplay') {
      const scenario = AI_ROLEPLAY_SCENARIOS.find((item) => item.id === nextScenarioId) ?? AI_ROLEPLAY_SCENARIOS[0];
      base.roleplay = {
        scenarioId: scenario.id,
        context: scenario.context,
        learnerRole: scenario.learnerRole,
        assistantRole: scenario.assistantRole,
        targetLanguageCode: language.code,
        proficiency: language.assessedProficiency ?? language.declaredProficiency,
        objective: scenario.objective,
        tone: 'Lịch sự, tự nhiên',
        responseStyle: 'Một lượt phản hồi ngắn, có câu hỏi tiếp nối',
        constraints: ['Không tự nhận là người thật hoặc người bản xứ thật'],
        safeBoundaries: scenario.safeBoundaries,
        goals: scenario.goals,
      };
    }
    return conversationApi.create(base);
  }, [conversationApi, mode]);

  const loadSession = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    setError(null);
    try {
      const nextProfile = await api.getProfile();
      setProfile(nextProfile);
      const nextSession = await createSession(nextProfile, selectedScenarioRef.current);
      setSession(nextSession);
    } catch (reason) {
      setSession(null);
      setError(readConversationError(reason));
    } finally {
      setIsLoading(false);
    }
  }, [api, createSession, status]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  async function sendTurn() {
    if (!session || !draft.trim() || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      setSession(await conversationApi.sendTurn(session.id, { message: draft.trim() }));
      setDraft('');
    } catch (reason) {
      setError(readConversationError(reason));
      try { setSession(await conversationApi.get(session.id)); } catch { /* preserve draft when the session cannot be refreshed */ }
    } finally { setIsSending(false); }
  }

  async function retryTurn() {
    if (!session || isSending) return;
    setIsSending(true);
    setError(null);
    try { setSession(await conversationApi.sendTurn(session.id, { retry: true })); }
    catch (reason) { setError(readConversationError(reason)); }
    finally { setIsSending(false); }
  }

  async function explain(messageId: string) {
    if (!session || isSending) return;
    setIsSending(true);
    setError(null);
    try { setSession(await conversationApi.explain(session.id, messageId)); }
    catch (reason) { setError(readConversationError(reason)); }
    finally { setIsSending(false); }
  }

  async function stop() {
    if (!session || isStopping) return;
    setIsStopping(true);
    try { setSession(await conversationApi.stop(session.id)); }
    catch (reason) { setError(readConversationError(reason)); }
    finally { setIsStopping(false); }
  }

  async function changeScenario(nextScenarioId: string) {
    selectedScenarioRef.current = nextScenarioId;
    setSelectedScenarioId(nextScenarioId);
    if (!profile || mode !== 'roleplay') return;
    setIsLoading(true);
    setError(null);
    try { setSession(await createSession(profile, nextScenarioId)); setDraft(''); }
    catch (reason) { setError(readConversationError(reason)); }
    finally { setIsLoading(false); }
  }

  return <ConversationWorkspace authenticated={status === 'authenticated'} mode={mode} session={session} scenarios={AI_ROLEPLAY_SCENARIOS} selectedScenarioId={selectedScenarioId} draft={draft} isLoading={status === 'loading' || isLoading} isSending={isSending} isStopping={isStopping} error={error} onDraftChange={setDraft} onSend={() => void sendTurn()} onRetry={() => void (session ? retryTurn() : loadSession())} onExplain={(messageId) => void explain(messageId)} onStop={() => void stop()} onScenarioChange={(scenarioId) => void changeScenario(scenarioId)} />;
}

function readConversationError(reason: unknown): string {
  if (reason instanceof ApiClientError) {
    if (reason.code === 'AI_PROVIDER_UNAVAILABLE') return 'Nhà cung cấp AI đang ngoại tuyến. Bạn có thể thử lại mà không mất lượt thoại.';
    if (reason.code === 'AI_RATE_LIMITED' || reason.code === 'AI_QUOTA_EXCEEDED') return 'Phiên đã chạm giới hạn lượt thử. Hãy quay lại sau hoặc tiếp tục bằng tài liệu cộng đồng.';
    if (reason.code === 'AI_CONTEXT_TARGET_UNAVAILABLE') return 'Hãy chọn ngôn ngữ đang học và trình độ trong hồ sơ trước khi mở phòng luyện tập.';
    return reason.message;
  }
  return reason instanceof Error ? reason.message : 'Không thể mở phòng luyện tập lúc này.';
}
