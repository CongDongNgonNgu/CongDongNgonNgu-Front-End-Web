import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiClientError } from '../../../../services/api-client';
import { useAuth } from '../../../auth/AuthProvider';
import type { OwnProfile } from '../../../onboarding/onboarding.types';
import { AiCoachingApi } from '../ai-coaching.api';
import type { AiCoachMode, AiCoachingCorrectionStyle, AiCoachingExplanationLanguage, AiCoachingResult } from '../ai-coaching.types';
import { AiCoachingWorkspace } from '../components/AiCoachingWorkspace';

export function AiCoachingPage() {
  const { status, api } = useAuth();
  const { pathname } = useLocation();
  const mode: AiCoachMode = pathname.includes('/grammar') ? 'grammar' : 'writing';
  const coachingApi = useMemo(() => new AiCoachingApi(api), [api]);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [text, setText] = useState('');
  const [writingTask, setWritingTask] = useState('');
  const [goal, setGoal] = useState('');
  const [grammarFocus, setGrammarFocus] = useState('');
  const [explanationLanguage, setExplanationLanguage] = useState<AiCoachingExplanationLanguage>('TARGET');
  const [correctionStyle, setCorrectionStyle] = useState<AiCoachingCorrectionStyle>('CONCISE');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiCoachingResult | null>(null);

  const targetLanguage = useMemo(() => {
    const learning = profile?.languages.find((language) => language.roles.includes('learning') && language.isPrimaryLearningTarget)
      ?? profile?.languages.find((language) => language.roles.includes('learning'));
    return learning ? { code: learning.code, name: learning.englishName, proficiency: learning.assessedProficiency ?? learning.declaredProficiency } : null;
  }, [profile]);

  const loadProfile = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsProfileLoading(true);
    setError(null);
    try { setProfile(await api.getProfile()); }
    catch (reason) { setProfile(null); setError(readCoachingError(reason)); }
    finally { setIsProfileLoading(false); }
  }, [api, status]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);
  useEffect(() => { setResult(null); setError(null); }, [mode]);

  async function submit() {
    if (!targetLanguage || !text.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const next = mode === 'writing'
        ? await coachingApi.write({
            targetLanguageCode: targetLanguage.code,
            text: text.trim(),
            writingTask: writingTask.trim() || undefined,
            goal: goal.trim() || undefined,
            explanationLanguage,
            correctionStyle,
          })
        : await coachingApi.grammar({
            targetLanguageCode: targetLanguage.code,
            text: text.trim(),
            grammarFocus: grammarFocus.trim() || undefined,
            goal: goal.trim() || undefined,
            explanationLanguage,
          });
      setResult(next);
    } catch (reason) { setError(readCoachingError(reason)); }
    finally { setIsLoading(false); }
  }

  return <AiCoachingWorkspace authenticated={status === 'authenticated'} mode={mode} targetLanguage={targetLanguage} text={text} writingTask={writingTask} goal={goal} grammarFocus={grammarFocus} explanationLanguage={explanationLanguage} correctionStyle={correctionStyle} isLoading={status === 'loading' || isProfileLoading || isLoading} error={error} result={result} onTextChange={setText} onWritingTaskChange={setWritingTask} onGoalChange={setGoal} onGrammarFocusChange={setGrammarFocus} onExplanationLanguageChange={setExplanationLanguage} onCorrectionStyleChange={setCorrectionStyle} onSubmit={() => void submit()} onRetry={() => void (targetLanguage ? submit() : loadProfile())} />;
}

function readCoachingError(reason: unknown): string {
  if (reason instanceof ApiClientError) {
    if (reason.code === 'AI_PROVIDER_UNAVAILABLE' || reason.code === 'AI_PROVIDER_TIMEOUT') return 'Nhà cung cấp AI đang ngoại tuyến hoặc không phản hồi. Bản gốc của bạn vẫn còn trong ô nhập.';
    if (reason.code === 'AI_RATE_LIMITED' || reason.code === 'AI_QUOTA_EXCEEDED') return 'Lượt luyện tập đã chạm giới hạn. Hãy thử lại sau khi hạn ngạch được làm mới.';
    if (reason.code === 'AI_INVALID_RESPONSE' || reason.code === 'AI_STRUCTURED_OUTPUT_INVALID') return 'Phản hồi AI không đúng cấu trúc học tập nên đã bị từ chối. Không có gợi ý chưa được kiểm chứng nào được hiển thị.';
    if (reason.code === 'AI_CONTEXT_TARGET_UNAVAILABLE') return 'Hãy chọn ngôn ngữ đang học và trình độ trong hồ sơ trước khi luyện tập.';
    return reason.message;
  }
  return reason instanceof Error ? reason.message : 'Không thể mở phòng luyện tập lúc này.';
}
