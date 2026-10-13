import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Textarea } from '../../../components/ui/FormControls/Textarea';
import type {
  StructuredResponseInput,
  StructuredResponseKind,
} from '../corrections.types';
import styles from './StructuredResponse.module.css';
import editorStyles from './StructuredResponseEditor.module.css';
import { useResponseTextarea } from '../hooks/useResponseTextarea';

const MAX_TEXT_CODE_POINTS = 20_000;
const MAX_EXPLANATION_CODE_POINTS = 5_000;

interface StructuredResponseEditorProps {
  kind: StructuredResponseKind;
  originalText?: string;
  authenticated: boolean;
  busy: boolean;
  error: string | null;
  onAuthRequired: () => void;
  onSubmit: (input: StructuredResponseInput) => Promise<void>;
}

export function StructuredResponseEditor({
  kind,
  originalText,
  authenticated,
  busy,
  error,
  onAuthRequired,
  onSubmit,
}: StructuredResponseEditorProps) {
  const { t } = useUiLocale();
  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explanationOpen, setExplanationOpen] = useState(false);
  const textRef = useResponseTextarea(text);
  const explanationRef = useResponseTextarea(explanationOpen ? explanation : '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textLabel = kind === 'CORRECTION_PROPOSAL' ? t('community.detail.suggested.correction') : t('community.detail.answer');
  const submitLabel = kind === 'CORRECTION_PROPOSAL' ? t('community.detail.submit.correction') : t('community.detail.submit.answer');
  const textCount = useMemo(() => Array.from(text).length, [text]);
  const explanationCount = useMemo(() => Array.from(explanation).length, [explanation]);

  if (!authenticated) {
    return (
      <section className={styles.editorGate} aria-labelledby='structured-response-editor-title'>
        <h3 id='structured-response-editor-title'>{t('community.detail.contribute.an.answer')}</h3>
        <p>{t('community.detail.sign.in.to.share.a.correction.or.an.answer.with')}</p>
        <Button variant='secondary' onClick={onAuthRequired}>{t('community.detail.sign.in.to.contribute')}</Button>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const normalized = text.replace(/\r\n?/gu, '\n');
    if (!normalized.trim()) {
      setValidationError(t('community.detail.required', {label: kind === 'CORRECTION_PROPOSAL' ? t('community.detail.a.suggested.correction') : t('community.detail.an.answer')}));
      return;
    }
    if (Array.from(normalized).length > MAX_TEXT_CODE_POINTS) {
      setValidationError(t('community.detail.content.exceeds.twenty.thousand.unicode.characters'));
      return;
    }
    if (kind === 'CORRECTION_PROPOSAL' && normalized === originalText) {
      setValidationError(t('community.detail.the.correction.must.differ.from.the.original'));
      return;
    }
    if (Array.from(explanation).length > MAX_EXPLANATION_CODE_POINTS) {
      setValidationError(t('community.detail.explanation.exceeds.five.thousand.unicode.characters'));
      return;
    }
    setValidationError(null);
    await onSubmit(kind === 'CORRECTION_PROPOSAL'
      ? { responseKind: kind, correctedText: normalized, ...(explanation ? { explanation } : {}) }
      : { responseKind: kind, answerText: normalized, ...(explanation ? { explanation } : {}) });
  };

  return (
    <section className={styles.editor} aria-labelledby='structured-response-editor-title'>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{t('community.detail.structured.contributions')}</p>
          <h3 id='structured-response-editor-title'>{t('community.detail.share.your.perspective')}</h3>
        </div>
        <span className={styles.editorNote}>{t('community.detail.keep.your.response.specific.and.respectful')}</span>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Textarea
          ref={textRef}
          className={editorStyles.textarea}
          disabled={busy}
          label={textLabel}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          hint={t('community.detail.counter', {count: textCount, max: 20000})}
          required
        />
        <Button type='button' variant='quiet' aria-expanded={explanationOpen} aria-controls='structured-explanation' disabled={busy} onClick={() => setExplanationOpen((current) => !current)}>{explanationOpen ? t('community.detail.hide.explanation') : t('community.detail.add.explanation')}</Button>
        {explanationOpen ? <div id='structured-explanation'>
        <Textarea
          ref={explanationRef}
          className={editorStyles.textarea}
          disabled={busy}
          label={t('community.detail.explanation.optional')}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={3}
          hint={t('community.detail.counter', {count: explanationCount, max: 5000})}
        />
        </div> : null}
        {validationError || error ? <p className={styles.error} role='alert'>{validationError ?? error}</p> : null}
        <div className={`${styles.editorActions} ${editorStyles.actions}`}>
          <Button
            type='button'
            variant='quiet'
            onClick={() => { setText(''); setExplanation(''); setExplanationOpen(false); setValidationError(null); }}
            disabled={busy}
          >
            {t('community.detail.reset.draft')}</Button>
          <Button type='submit' loading={busy}>{submitLabel}</Button>
        </div>
      </form>
    </section>
  );
}
