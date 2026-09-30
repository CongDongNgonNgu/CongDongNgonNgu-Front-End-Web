export interface AiLearningRequestClient {
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface AiLearningRequest {
  resourceId: string;
  targetLanguageCode?: string;
  goal?: string;
}

export interface AiLearningProvenance {
  sourceType: string;
  sourceUrl: string | null;
  attribution: string;
  license: {
    licenseKey: string;
    displayName: string;
    canonicalUrl: string;
  };
}

export interface AiLearningResult {
  contractVersion: 'ai.learning.v1';
  mode: 'learn_from_content';
  source: 'AI_GENERATED';
  learnerContext: {
    targetLanguage: { code: string; name: string };
    proficiency: { effective: string };
  };
  sourceResource: {
    id: string;
    resourceType: string;
    primaryLanguageCode: string;
    secondaryLanguageCode: string | null;
    cefrLevel: string | null;
    topics: string[];
    provenance: AiLearningProvenance[];
  };
  output: {
    version: 'ai.output.v1';
    kind: 'LEARN_FROM_CONTENT';
    summary: string;
    vocabulary: Array<{ term: string; meaning: string; exampleSentence: string }>;
    grammarNotes: Array<{ title: string; explanation: string; example: string }>;
    questions: Array<{ question: string; answerGuide: string }>;
    miniQuiz: Array<{ question: string; options: string[]; correctOptionIndex: number; explanation: string }>;
    speakingPrompts: Array<{ prompt: string; followUp: string }>;
  };
}
