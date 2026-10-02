import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Surface/Card';
import { SelectControl, TextInput, Textarea } from '../../../../components/ui/FormControls';
import type {
  AiCoachMode,
  AiCoachingCorrectionStyle,
  AiCoachingExplanationLanguage,
  AiCoachingResult,
} from '../ai-coaching.types';
import { CoachingDiff } from './CoachingDiff';
import styles from './AiCoachingWorkspace.module.css';

interface TargetLanguage {
  code: string;
  name: string;
  proficiency: string;
}

interface AiCoachingWorkspaceProps {
  authenticated: boolean;
  mode: AiCoachMode;
  targetLanguage: TargetLanguage | null;
  text: string;
  writingTask: string;
  goal: string;
  grammarFocus: string;
  explanationLanguage: AiCoachingExplanationLanguage;
  correctionStyle: AiCoachingCorrectionStyle;
  isLoading: boolean;
  error: string | null;
  result: AiCoachingResult | null;
  onTextChange: (value: string) => void;
  onWritingTaskChange: (value: string) => void;
  onGoalChange: (value: string) => void;
  onGrammarFocusChange: (value: string) => void;
  onExplanationLanguageChange: (value: AiCoachingExplanationLanguage) => void;
  onCorrectionStyleChange: (value: AiCoachingCorrectionStyle) => void;
  onSubmit: () => void;
  onRetry: () => void;
}

export function AiCoachingWorkspace({
  authenticated, mode, targetLanguage, text, writingTask, goal, grammarFocus,
  explanationLanguage, correctionStyle, isLoading, error, result,
  onTextChange, onWritingTaskChange, onGoalChange, onGrammarFocusChange,
  onExplanationLanguageChange, onCorrectionStyleChange, onSubmit, onRetry,
}: AiCoachingWorkspaceProps) {
  const modeTitle = mode === 'writing' ? 'Trợ lý Viết câu' : 'Trợ lý Ngữ pháp';
  const canSubmit = authenticated && Boolean(targetLanguage && text.trim()) && !isLoading;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit();
  }

  function handleTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Điều hướng vị trí'>
        <Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><Link to='/ai'>Luyện tập AI</Link><span aria-hidden='true'>/</span><span aria-current='page'>Trợ lý Viết & Ngữ pháp</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>PHÒNG TẬP DƯỢT NGÔN NGỮ</p>
          <h1>Trợ lý Viết & Ngữ pháp AI</h1>
          <p className={styles.lede}>Luyện cách diễn đạt, nhìn rõ điểm cần sửa và chuyển một lỗi cụ thể thành bài tập ngắn có thể tự kiểm tra.</p>
        </div>
        <span className={styles.statusPill}>{targetLanguage ? `${targetLanguage.name} · ${targetLanguage.proficiency}` : 'Cần thiết lập hồ sơ'}</span>
      </header>

      <nav className={styles.modeTabs} aria-label='Chế độ luyện tập AI'>
        <NavLink to='/ai/writing' className={({ isActive }) => isActive ? styles.activeTab : styles.tab}>Trợ lý Viết câu</NavLink>
        <NavLink to='/ai/grammar' className={({ isActive }) => isActive ? styles.activeTab : styles.tab}>Trợ lý Ngữ pháp</NavLink>
      </nav>

      {!authenticated ? (
        <Card className={styles.authNotice}>
          <div><h2>Đăng nhập để bắt đầu luyện tập</h2><p>Nội dung bạn gửi chỉ dùng cho phiên học này và không tự động trở thành nội dung cộng đồng.</p></div>
          <Link className={styles.linkAction} to='/login' state={{ from: mode === 'writing' ? '/ai/writing' : '/ai/grammar' }}>Đăng nhập →</Link>
        </Card>
      ) : null}

      {authenticated && !targetLanguage ? (
        <Card className={styles.authNotice}>
          <div><h2>Chọn ngôn ngữ đang học trong hồ sơ</h2><p>Trợ lý cần ngôn ngữ mục tiêu và trình độ đã khai báo để điều chỉnh hướng dẫn an toàn.</p></div>
          <Link className={styles.linkAction} to='/profile'>Mở hồ sơ →</Link>
        </Card>
      ) : null}

      <div className={styles.content}>
        <section className={styles.inputSection} aria-labelledby='coaching-input-title'>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>NỘI DUNG CỦA BẠN</p><h2 id='coaching-input-title'>{modeTitle}</h2></div>
            <span className={styles.counter}>{text.length.toLocaleString('vi-VN')} / 4.000 ký tự</span>
          </div>
          <form onSubmit={submit}>
            <div className={styles.inputArea}>
              <Textarea
                label='Đoạn văn cần trợ lý rà soát'
                value={text}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onTextChange(event.target.value)}
                onKeyDown={handleTextKeyDown}
                maxLength={4_000}
                disabled={!authenticated || !targetLanguage || isLoading}
                placeholder={mode === 'writing' ? 'Viết một email, đoạn nhật ký hoặc câu bạn muốn diễn đạt…' : 'Dán một câu hoặc đoạn có lỗi ngữ pháp bạn muốn hiểu rõ…'}
                hint='Ctrl/Cmd + Enter để gửi nhanh. Văn bản dài sẽ được giới hạn để bảo vệ phiên học.'
                required
              />
            </div>
            <div className={styles.optionsGrid}>
              {mode === 'writing' ? (
                <>
                  <TextInput label='Bối cảnh / nhiệm vụ (tuỳ chọn)' value={writingTask} onChange={(event) => onWritingTaskChange(event.target.value)} maxLength={160} disabled={!authenticated || isLoading} placeholder='Ví dụ: email cập nhật tiến độ' />
                  <SelectControl label='Mức độ giải thích' value={correctionStyle} onChange={(event) => onCorrectionStyleChange(event.target.value as AiCoachingCorrectionStyle)} disabled={!authenticated || isLoading}>
                    <option value='CONCISE'>Ngắn gọn, tập trung</option><option value='DETAILED'>Chi tiết hơn</option>
                  </SelectControl>
                </>
              ) : (
                <>
                  <TextInput label='Điểm ngữ pháp muốn tập trung (tuỳ chọn)' value={grammarFocus} onChange={(event) => onGrammarFocusChange(event.target.value)} maxLength={160} disabled={!authenticated || isLoading} placeholder='Ví dụ: thì quá khứ, trợ từ, mạo từ' />
                  <div className={styles.optionNote}><strong>Bài luyện tập sau phần giải thích</strong><span>Trợ lý sẽ đưa ra bài tập ngắn và chỉ hiện đáp án khi bạn yêu cầu.</span></div>
                </>
              )}
              <TextInput label='Mục tiêu học (tuỳ chọn)' value={goal} onChange={(event) => onGoalChange(event.target.value)} maxLength={160} disabled={!authenticated || isLoading} placeholder='Ví dụ: tự nhiên hơn khi giao tiếp' />
              <SelectControl label='Ngôn ngữ giải thích' value={explanationLanguage} onChange={(event) => onExplanationLanguageChange(event.target.value as AiCoachingExplanationLanguage)} disabled={!authenticated || isLoading}>
                <option value='TARGET'>{targetLanguage?.name ?? 'Ngôn ngữ mục tiêu'}</option><option value='VIETNAMESE'>Tiếng Việt</option>
              </SelectControl>
            </div>
            <div className={styles.formFooter}>
              <p>Nội dung gốc được giữ riêng trong kết quả; gợi ý không phải xác nhận của người bản xứ.</p>
              <Button type='submit' variant='secondary' loading={isLoading} disabled={!canSubmit}>{isLoading ? 'Đang phân tích' : 'Phân tích & hướng dẫn sửa'}</Button>
            </div>
          </form>
        </section>

        {isLoading ? <div className={styles.loading} role='status' aria-live='polite' aria-busy='true'>Đang phân tích nội dung theo ngữ cảnh học tập của bạn…</div> : null}
        {error ? <div className={styles.error} role='alert'><div><strong>Chưa thể hoàn tất lượt luyện tập</strong><p>{error}</p></div><Button variant='quiet' size='sm' onClick={onRetry} disabled={!authenticated || !targetLanguage}>Thử lại</Button></div> : null}
        {result ? <CoachingResult result={result} /> : null}
      </div>

      <aside className={styles.communityBridge} aria-label='Học cùng cộng đồng'>
        <div><strong>Muốn người học khác góp ý sắc thái thực tế?</strong><p>AI chỉ là gợi ý học tập. Bạn có thể mang câu này tới cộng đồng để nghe thêm trải nghiệm của con người.</p></div>
        <Link to='/community/ask/correction'>Nhờ cộng đồng sửa giúp →</Link>
      </aside>
    </div>
  );
}

function CoachingResult({ result }: { result: AiCoachingResult }) {
  return (
    <section className={styles.resultSection} aria-labelledby='coaching-result-title'>
      <div className={styles.aiNotice} role='note'><strong>Hướng dẫn tạo bởi AI</strong><p>Gợi ý mang tính tham khảo học tập, chưa qua kiểm duyệt bởi chuyên gia bản xứ. Hãy giữ lại bản gốc và tự quyết định điều phù hợp.</p></div>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>KẾT QUẢ CÓ CẤU TRÚC</p><h2 id='coaching-result-title'>{result.mode === 'writing_coach' ? 'Bản sửa và cách diễn đạt' : 'Giải thích và bài tập củng cố'}</h2></div><span className={styles.sourceBadge}>AI_GENERATED</span></div>
      <div className={styles.originalBlock}><p className={styles.eyebrow}>Văn bản gốc của bạn</p><p>{result.originalText}</p></div>
      {result.mode === 'writing_coach' ? <WritingResult result={result} /> : <GrammarResult result={result} />}
    </section>
  );
}

function WritingResult({ result }: { result: Extract<AiCoachingResult, { mode: 'writing_coach' }> }) {
  return <div className={styles.resultBody}><p className={styles.summary}>{result.output.summary}</p><div className={styles.correctionList}>{result.output.corrections.map((correction, index) => <article className={styles.correction} key={`${correction.originalText}-${index}`}><CoachingDiff original={correction.originalText} corrected={correction.correctedText} label={`Điểm sửa ${index + 1}`} /><p className={styles.explanation}><strong>Vì sao:</strong> {correction.explanation}</p>{correction.naturalAlternative ? <p className={styles.alternative}><strong>Cách nói tự nhiên khác:</strong> {correction.naturalAlternative}</p> : null}</article>)}</div></div>;
}

function GrammarResult({ result }: { result: Extract<AiCoachingResult, { mode: 'grammar_coach' }> }) {
  return <div className={styles.resultBody}><p className={styles.explanation}>{result.output.explanation}</p><div className={styles.exampleList}><h3>Ví dụ trong ngữ cảnh</h3>{result.output.examples.map((example, index) => <article className={styles.example} key={`${example.incorrectText}-${index}`}><CoachingDiff original={example.incorrectText} corrected={example.correctedText} label={`Ví dụ ngữ pháp ${index + 1}`} /><p className={styles.explanation}>{example.explanation}</p></article>)}</div><div className={styles.practice} role='group' aria-label='Bài tập củng cố'><h3>Bài tập củng cố</h3>{result.output.practiceItems.map((item, index) => <PracticeItem key={`${item.prompt}-${index}`} index={index} item={item} />)}</div></div>;
}

function PracticeItem({ index, item }: { index: number; item: { prompt: string; answer: string; explanation: string } }) {
  const [revealed, setRevealed] = useState(false);
  return <article className={styles.practiceItem}><p><strong>{index + 1}.</strong> {item.prompt}</p><Button variant='quiet' size='sm' aria-expanded={revealed} onClick={() => setRevealed((current) => !current)}>{revealed ? 'Ẩn đáp án và giải thích' : 'Xem đáp án và giải thích'}</Button>{revealed ? <div className={styles.answer} role='status'><strong>{item.answer}</strong><p>{item.explanation}</p></div> : null}</article>;
}
