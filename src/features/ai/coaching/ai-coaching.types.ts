export type AiCoachMode = 'writing' | 'grammar';
export type AiCoachingExplanationLanguage = 'TARGET' | 'VIETNAMESE';
export type AiCoachingCorrectionStyle = 'CONCISE' | 'DETAILED';

export interface AiCoachingRequestClient {
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface AiWritingCoachRequest {
  targetLanguageCode: string;
  writingTask?: string;
  goal?: string;
  correctionStyle?: AiCoachingCorrectionStyle;
  explanationLanguage?: AiCoachingExplanationLanguage;
  text: string;
}

export interface AiGrammarCoachRequest {
  targetLanguageCode: string;
  grammarFocus?: string;
  goal?: string;
  explanationLanguage?: AiCoachingExplanationLanguage;
  text: string;
}

export interface AiLearnerContext {
  targetLanguage: { code: string; name: string };
  proficiency: { effective: string };
}

export interface AiWritingCorrection {
  originalText: string;
  correctedText: string;
  explanation: string;
  naturalAlternative: string | null;
}

export interface AiWritingCoachResult {
  contractVersion: 'ai.coaching.v1';
  mode: 'writing_coach';
  source: 'AI_GENERATED';
  originalText: string;
  learnerContext: AiLearnerContext;
  output: {
    version: 'ai.output.v1';
    kind: 'WRITING_CORRECTION';
    summary: string;
    corrections: AiWritingCorrection[];
  };
}

export interface AiGrammarExample {
  incorrectText: string;
  correctedText: string;
  explanation: string;
}

export interface AiGrammarPracticeItem {
  prompt: string;
  answer: string;
  explanation: string;
}

export interface AiGrammarCoachResult {
  contractVersion: 'ai.coaching.v1';
  mode: 'grammar_coach';
  source: 'AI_GENERATED';
  originalText: string;
  learnerContext: AiLearnerContext;
  output: {
    version: 'ai.output.v1';
    kind: 'GRAMMAR_COACHING';
    explanation: string;
    examples: AiGrammarExample[];
    practiceItems: AiGrammarPracticeItem[];
  };
}

export type AiCoachingResult = AiWritingCoachResult | AiGrammarCoachResult;
