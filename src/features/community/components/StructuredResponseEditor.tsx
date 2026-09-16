import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Textarea } from '../../../components/ui/FormControls/Textarea';
import type {
  StructuredResponseInput,
  StructuredResponseKind,
} from '../corrections.types';
import styles from './StructuredResponse.module.css';

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
  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textLabel = kind === 'CORRECTION_PROPOSAL' ? 'Bản sửa đề xuất' : 'Câu trả lời';
  const submitLabel = kind === 'CORRECTION_PROPOSAL' ? 'Gửi đề xuất sửa câu' : 'Gửi câu trả lời';
  const textCount = useMemo(() => Array.from(text).length, [text]);
  const explanationCount = useMemo(() => Array.from(explanation).length, [explanation]);

  if (!authenticated) {
    return (
      <section className={styles.editorGate} aria-labelledby='structured-response-editor-title'>
        <h3 id='structured-response-editor-title'>Đóng góp câu trả lời</h3>
        <p>Đăng nhập để chia sẻ một bản sửa hoặc câu trả lời có giải thích.</p>
        <Button variant='secondary' onClick={onAuthRequired}>Đăng nhập để đóng góp</Button>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = text.replace(/\r\n?/gu, '\n');
    if (!normalized.trim()) {
      setValidationError(`Vui lòng nhập ${kind === 'CORRECTION_PROPOSAL' ? 'bản sửa đề xuất' : 'câu trả lời'}.`);
      return;
    }
    if (Array.from(normalized).length > MAX_TEXT_CODE_POINTS) {
      setValidationError('Nội dung vượt quá 20.000 ký tự Unicode.');
      return;
    }
    if (kind === 'CORRECTION_PROPOSAL' && normalized === originalText) {
      setValidationError('Bản sửa cần khác với bản gốc.');
      return;
    }
    if (Array.from(explanation).length > MAX_EXPLANATION_CODE_POINTS) {
      setValidationError('Giải thích vượt quá 5.000 ký tự Unicode.');
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
          <p className={styles.eyebrow}>Đóng góp có cấu trúc</p>
          <h3 id='structured-response-editor-title'>Chia sẻ góc nhìn của bạn</h3>
        </div>
        <span className={styles.editorNote}>Giữ phản hồi cụ thể và tôn trọng.</span>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Textarea
          label={textLabel}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={kind === 'CORRECTION_PROPOSAL' ? 5 : 6}
          maxLength={MAX_TEXT_CODE_POINTS}
          hint={`${textCount.toLocaleString('vi-VN')} / 20.000 ký tự Unicode`}
          required
        />
        <Textarea
          label='Giải thích (tuỳ chọn)'
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={4}
          maxLength={MAX_EXPLANATION_CODE_POINTS}
          hint={`${explanationCount.toLocaleString('vi-VN')} / 5.000 ký tự Unicode`}
        />
        {validationError || error ? <p className={styles.error} role='alert'>{validationError ?? error}</p> : null}
        <div className={styles.editorActions}>
          <Button
            type='button'
            variant='quiet'
            onClick={() => { setText(''); setExplanation(''); setValidationError(null); }}
            disabled={busy}
          >
            Soạn lại
          </Button>
          <Button type='submit' loading={busy}>{submitLabel}</Button>
        </div>
      </form>
    </section>
  );
}
