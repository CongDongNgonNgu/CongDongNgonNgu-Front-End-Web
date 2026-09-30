import { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Surface/Card';
import { Icon } from '../../../../components/ui/Icon/Icon';
import type { AiConversation, AiConversationMode, AiRoleplayScenario } from '../ai-conversation.types';
import styles from './ConversationWorkspace.module.css';

interface ConversationWorkspaceProps {
  authenticated: boolean;
  mode: AiConversationMode;
  session: AiConversation | null;
  scenarios: AiRoleplayScenario[];
  selectedScenarioId: string;
  draft: string;
  isLoading: boolean;
  isSending: boolean;
  isStopping: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onExplain: (messageId: string) => void;
  onStop: () => void;
  onScenarioChange: (scenarioId: string) => void;
}

export function ConversationWorkspace({
  authenticated, mode, session, scenarios, selectedScenarioId, draft, isLoading, isSending, isStopping, error,
  onDraftChange, onSend, onRetry, onExplain, onStop, onScenarioChange,
}: ConversationWorkspaceProps) {
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];
  const targetLanguage = session?.learnerContext.targetLanguage.name ?? 'ngôn ngữ mục tiêu';
  const proficiency = session?.learnerContext.proficiency.effective ?? '—';
  const canSend = Boolean(session && session.status !== 'STOPPED' && draft.trim() && !isSending);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) onSend();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.key === 'Enter' || event.code === 'Enter') && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Điều hướng vị trí'>
        <Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><span aria-current='page'>Luyện tập AI</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>PHÒNG TẬP DƯỢT NGÔN NGỮ</p>
          <h1>{mode === 'roleplay' ? 'Đối thoại theo tình huống' : 'Luyện tập hội thoại AI'}</h1>
          <p className={styles.lede}>Thử câu chữ trong một ngữ cảnh có định hướng, rồi mang điều phù hợp vào cuộc trò chuyện thật.</p>
        </div>
        <div className={styles.headerMeta} aria-label='Ngữ cảnh phiên'>
          <span className={styles.statusPill}><span className={styles.statusDot} aria-hidden='true' />{session?.status === 'STOPPED' ? 'Đã kết thúc' : `${proficiency} · Đang luyện tập`}</span>
          <span className={styles.availability}>Nhà cung cấp AI: {session?.status === 'ERROR' ? 'Ngoại tuyến' : 'Sẵn sàng kiểm tra'}</span>
        </div>
      </header>

      {!authenticated ? (
        <Card className={styles.authNotice}>
          <span className={styles.noticeIcon} aria-hidden='true'><Icon name='lock' size={20} /></span>
          <div><h2>Đăng nhập để bắt đầu phòng luyện tập</h2><p>Phiên hội thoại chỉ dành cho việc học cá nhân và không tự động chia sẻ ra cộng đồng.</p></div>
          <Link className={styles.inlineAction} to='/login' state={{ from: '/ai/conversation' }}>Đăng nhập →</Link>
        </Card>
      ) : null}

      {authenticated ? (
        <div className={styles.contextBanner}>
          <div>
            <p className={styles.contextKicker}>{mode === 'roleplay' ? 'KỊCH BẢN ĐANG CHẠY' : 'NGỮ CẢNH PHIÊN'}</p>
            <h2>{mode === 'roleplay' ? selectedScenario?.label : 'Đối thoại mở theo trình độ của bạn'}</h2>
            <p>{mode === 'roleplay' ? selectedScenario?.context : `Phản hồi được điều chỉnh theo ${targetLanguage} và mức ${proficiency}.`}</p>
          </div>
          <div className={styles.contextFacts}>
            <span><strong>{targetLanguage}</strong><small>{proficiency}</small></span>
            <span><strong>{mode === 'roleplay' ? selectedScenario?.learnerRole : 'Bạn'}</strong><small>Vai người học</small></span>
            <span><strong>{mode === 'roleplay' ? selectedScenario?.assistantRole : 'AI practice engine'}</strong><small>Vai đối thoại</small></span>
          </div>
        </div>
      ) : null}

      {authenticated ? (
        <div className={styles.mobileDisclosure}>
          <details>
            <summary><span>Mục tiêu & thiết lập phiên</span><span>{session?.goals.length ?? 0} mục tiêu</span></summary>
            <div className={styles.mobileDisclosureBody}>{renderRailContent('mobile')}</div>
          </details>
        </div>
      ) : null}

      <div className={styles.workspaceGrid}>
        <main className={styles.dialogueColumn} aria-labelledby='dialogue-heading'>
          <div className={styles.columnHeading}>
            <div><p className={styles.eyebrow}>DÒNG HỘI THOẠI</p><h2 id='dialogue-heading'>Luyện nói bằng văn bản</h2></div>
            <span className={styles.privacyMark}><Icon name='lock' size={16} /> Riêng tư</span>
          </div>

          {isLoading ? <div className={styles.loadingState} role='status'>Đang chuẩn bị phòng luyện tập…</div> : null}
          {error && !session ? <div className={styles.errorState} role='alert'><Icon name='alert-circle' size={20} /><div><strong>Chưa thể mở phiên</strong><p>{error}</p></div><Button variant='quiet' size='sm' onClick={onRetry}>Thử lại</Button></div> : null}
          {!isLoading && session?.turns.length === 0 ? <div className={styles.emptyState}><span className={styles.emptyIcon} aria-hidden='true'><Icon name='message-circle' size={24} /></span><h3>Bắt đầu bằng một câu ngắn</h3><p>Hãy nói điều bạn muốn diễn đạt. Bạn có thể gửi bằng ngôn ngữ đang học hoặc mô tả ý bằng tiếng Việt.</p></div> : null}

          <div className={styles.turnStream} aria-live='polite'>
            {session?.turns.map((turn) => (
              <article className={`${styles.turn} ${turn.role === 'learner' ? styles.learnerTurn : styles.assistantTurn}`} key={turn.id}>
                <div className={styles.turnLabel}><span className={styles.avatar}>{turn.role === 'learner' ? 'BẠN' : 'AI'}</span><span>{turn.role === 'learner' ? 'Lời thoại của bạn' : turn.kind === 'explanation' ? 'Giải thích ngữ cảnh' : 'Gợi ý từ AI'}</span><time dateTime={turn.createdAt}>{formatTime(turn.createdAt)}</time></div>
                <div className={styles.turnBody}><p>{turn.content}</p>{turn.role === 'assistant' && turn.kind === 'response' ? <button className={styles.textAction} type='button' onClick={() => onExplain(turn.id)}>Giải thích câu này</button> : null}</div>
              </article>
            ))}
          </div>

          {session?.status === 'ERROR' ? <div className={styles.providerNotice} role='alert'><span className={styles.noticeIcon}><Icon name='info' size={18} /></span><div><strong>AI đang ngoại tuyến</strong><p>Tin nhắn của bạn vẫn được giữ trong phiên để thử lại; chưa có phản hồi AI nào được tạo.</p></div><Button variant='quiet' size='sm' onClick={onRetry} loading={isSending}>Thử lại</Button></div> : null}
          {session?.feedback ? <div className={styles.feedbackNotice} role='status'><Icon name='check-circle' size={20} /><div><strong>Phiên đã khép lại</strong><p>{session.feedback.summary}</p></div></div> : null}

          <form className={styles.composer} onSubmit={submit}>
            <div className={styles.composerTop}><label htmlFor='conversation-draft'>Soạn câu trả lời bằng {targetLanguage}</label><span>{draft.length} / 400</span></div>
            <textarea id='conversation-draft' value={draft} onChange={(event) => onDraftChange(event.target.value.slice(0, 400))} onKeyDown={handleComposerKeyDown} placeholder='Nhập câu phản hồi hoặc mô tả ý bạn muốn nói…' disabled={!session || session.status === 'STOPPED' || isSending} rows={4} aria-describedby='composer-hint' />
            <div className={styles.composerBottom}><p id='composer-hint'>Enter để gửi · Shift + Enter để xuống dòng · Không dùng dữ liệu nhạy cảm</p><div className={styles.composerActions}>{session?.status !== 'STOPPED' ? <Button type='button' variant='quiet' size='sm' onClick={onStop} disabled={!session || isStopping} loading={isStopping}>Dừng phiên</Button> : null}<Button type='submit' variant='secondary' disabled={!canSend} loading={isSending}>Gửi lời thoại <span aria-hidden='true'>→</span></Button></div></div>
          </form>
        </main>

        <aside className={styles.rail} aria-label='Thiết lập và mục tiêu phiên'>
          {renderRailContent('desktop')}
        </aside>
      </div>
    </div>
  );

  function renderRailContent(surface: 'mobile' | 'desktop') {
    const scenarioSelectId = `scenario-select-${surface}`;
    return (
      <div className={styles.railContent}>
        {mode === 'roleplay' ? <section className={styles.railSection}><p className={styles.railKicker}>KỊCH BẢN</p><label className={styles.selectLabel} htmlFor={scenarioSelectId}>Đổi kịch bản</label><select id={scenarioSelectId} value={selectedScenarioId} onChange={(event) => onScenarioChange(event.target.value)} disabled={isLoading || isSending}><option value=''>Chọn kịch bản</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select><p className={styles.railDescription}>{selectedScenario?.objective}</p></section> : <section className={styles.railSection}><p className={styles.railKicker}>CÁCH DÙNG</p><h3>Thử, nhìn lại, rồi chọn cách phù hợp</h3><p className={styles.railDescription}>AI chỉ đưa ra gợi ý sinh tự động. Không có người bản xứ hay kiểm duyệt viên thật trong phiên này.</p></section>}
        <section className={styles.railSection}><p className={styles.railKicker}>MỤC TIÊU PHIÊN</p>{session?.goals.length ? <ul className={styles.goalList}>{session.goals.map((goal) => <li key={goal.label} className={goal.completed ? styles.goalDone : ''}><span aria-hidden='true'>{goal.completed ? '✓' : '○'}</span>{goal.label}</li>)}</ul> : <p className={styles.railDescription}>Chưa đặt mục tiêu chấm điểm. Tập trung vào một lượt thoại rõ ràng.</p>}</section>
        <section className={styles.statusSection}><p className={styles.railKicker}>TRẠNG THÁI HỆ THỐNG</p><div className={styles.statusRow}><span className={`${styles.statusSquare} ${session?.status === 'ERROR' ? styles.statusSquareOffline : ''}`} aria-hidden='true' /> <span>{session?.status === 'ERROR' ? 'Nhà cung cấp AI ngoại tuyến' : 'Phiên sẵn sàng nhận lượt thoại'}</span></div><p className={styles.railDescription}>Hạn mức và nhà cung cấp sẽ được kiểm tra ở backend; trình duyệt không giữ khóa provider.</p></section>
        <p className={styles.privacyNote}><Icon name='lock' size={16} /> Dữ liệu luyện tập riêng tư, không dùng cho quảng cáo.</p>
      </div>
    );
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
