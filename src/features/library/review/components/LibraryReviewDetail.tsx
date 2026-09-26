import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Textarea } from '../../../../components/ui/FormControls/Textarea';
import { Dialog } from '../../../../components/ui/Overlays';
import { type LibraryResourceDetails, type LibraryResourceType } from '../../library.types';
import {
  getLibraryReviewErrorCode,
  getLibraryReviewErrorMessage,
  isReviewConflict,
  isSourceStillValid,
} from '../library-review.errors';
import type {
  LibraryReviewApiPort,
  LibraryReviewDetail as LibraryReviewDetailModel,
  LibraryReviewProvenanceSummary,
} from '../library-review.types';
import styles from './LibraryReviewDetail.module.css';

interface LibraryReviewDetailProps {
  api: LibraryReviewApiPort;
  detail: LibraryReviewDetailModel;
  onRefresh: () => Promise<void>;
}

type ReviewAction = 'VERIFY' | 'REJECT' | 'RECONCILE';

const resourceTypeLabels: Record<LibraryResourceType, string> = {
  VOCABULARY: 'Từ vựng',
  SENTENCE: 'Câu mẫu',
  TRANSLATION: 'Bản dịch',
  GRAMMAR_ITEM: 'Ngữ pháp',
  DIALOGUE: 'Hội thoại',
  IDIOM: 'Thành ngữ',
  SLANG: 'Tiếng lóng',
  CULTURAL_NOTE: 'Văn hoá',
  PRONUNCIATION: 'Phát âm',
  LEARNING_COLLECTION: 'Bộ sưu tập',
};

const sourceHealthLabels: Record<string, string> = {
  VALID: 'Nguồn hiện hợp lệ',
  CANDIDATE_INVALIDATED: 'Ứng viên nguồn đã bị vô hiệu hóa',
  CANDIDATE_MISSING: 'Không còn tìm thấy ứng viên nguồn',
  ACCEPTANCE_REVOKED_OR_REPLACED: 'Xác nhận nguồn đã bị thu hồi hoặc thay thế',
  RESPONSE_INACTIVE_OR_MISSING: 'Phản hồi nguồn không còn hoạt động',
  PARENT_INACTIVE_OR_MISSING: 'Bài nguồn không còn hoạt động',
  PARENT_NOT_PUBLIC: 'Bài nguồn không còn công khai',
  SOURCE_REFERENCE_MISMATCH: 'Liên kết nguồn không còn nhất quán',
};

const eligibilityLabels: Record<string, string> = {
  PROVENANCE_REQUIRED: 'Cần bổ sung bằng chứng nguồn gốc',
  LICENSE_UNKNOWN: 'Không xác định được giấy phép',
  LICENSE_INACTIVE: 'Giấy phép không còn hoạt động',
  LICENSE_REDISTRIBUTION_UNSAFE: 'Giấy phép không cho phép tái phân phối công khai',
  MODERATION_INACTIVE: 'Nội dung chưa ở trạng thái hoạt động',
  SOURCE_INVALID: 'Có nguồn Phase 06 không còn hợp lệ',
};

export function LibraryReviewDetail({ api, detail, onRefresh }: LibraryReviewDetailProps) {
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const actionTriggerRef = useRef<HTMLButtonElement>(null);

  const resource = detail.resource;
  const hasInvalidSource = detail.provenance.some((entry) => entry.sourceHealth.applicable && !entry.sourceHealth.valid);
  const canVerify = resource.reviewState === 'COMMUNITY_REVIEW' && detail.verificationEligibility.eligible;
  const canReject = resource.reviewState === 'COMMUNITY_REVIEW';
  const canReconcile = resource.reviewState === 'VERIFIED' && hasInvalidSource;

  useEffect(() => {
    if (!notice) return;
    window.setTimeout(() => statusRef.current?.focus(), 0);
  }, [notice]);

  const openAction = (nextAction: ReviewAction) => {
    setActionError(null);
    setNotice(null);
    setNote('');
    setAction(nextAction);
  };

  const closeAction = () => {
    if (isSubmitting) return;
    setAction(null);
    setActionError(null);
    setNote('');
  };

  const confirmAction = async () => {
    if (!action) return;
    if (action === 'REJECT' && !note.trim()) {
      setActionError({ code: 'LIBRARY_REVIEW_NOTE_REQUIRED' });
      window.setTimeout(() => document.getElementById('review-reject-note')?.focus(), 0);
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const input = note.trim() ? { note: note.trim() } : {};
      if (action === 'RECONCILE') await api.reconcileSource(resource.id, input);
      else await api.transitionReview(resource.id, { nextState: action === 'VERIFY' ? 'VERIFIED' : 'REJECTED', ...input });
      setAction(null);
      setNote('');
      setNotice(action === 'VERIFY'
        ? 'Đã ghi nhận quyết định xác minh. Backend sẽ áp dụng các cổng công khai hiện tại.'
        : action === 'REJECT'
          ? 'Đã ghi nhận quyết định từ chối trong lịch sử kiểm duyệt.'
          : 'Đã đưa tài nguyên về hàng chờ xem xét. Không có tự động xác minh lại.');
      await onRefresh();
    } catch (error) {
      if (isReviewConflict(error) || isSourceStillValid(error)) {
        setAction(null);
        setActionError(null);
        setNotice(getLibraryReviewErrorMessage(error));
        if (isSourceStillValid(error)) await onRefresh();
      } else {
        setActionError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className={styles.article}>
      <Link className={styles.backLink} to='/library/review'>← Quay lại hàng chờ</Link>
      {notice ? <div className={styles.actionNotice} role='status' tabIndex={-1} ref={statusRef}>{notice}</div> : null}

      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.typeLine}><span className={styles.typeBadge}>{resourceTypeLabels[resource.resourceType]}</span><span>{resource.primaryLanguageCode.toUpperCase()}{resource.secondaryLanguageCode ? ` · ${resource.secondaryLanguageCode.toUpperCase()}` : ''}</span><span className={styles.stateBadge}>{stateLabel(resource.reviewState)}</span></div>
          <h1>{getDetailsTitle(resource.details)}</h1>
          <p className={styles.lede}>{getDetailsLede(resource.details)}</p>
        </div>
        <aside className={styles.metaRail} aria-label='Trạng thái tài nguyên'>
          <span className={styles.metaLabel}>REVIEW STATE</span>
          <strong>{stateLabel(resource.reviewState)}</strong>
          <span>Visibility: {resource.visibility}</span>
          <span>Moderation: {resource.moderationState}</span>
          <span>Provenance revision: {resource.provenanceRevision}</span>
        </aside>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.content} aria-labelledby='review-content-heading'>
          <p className={styles.eyebrow}>LEARNING CONTENT</p>
          <h2 id='review-content-heading'>Nội dung cần đọc</h2>
          <ReviewResourceContent details={resource.details} />
          {resource.topics.length > 0 ? <div className={styles.topicList}>{resource.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div> : null}
        </section>
        <aside className={styles.statusRail} aria-labelledby='eligibility-heading'>
          <p className={styles.eyebrow}>DECISION GATE</p>
          <h2 id='eligibility-heading'>Điều kiện xác minh</h2>
          <div className={detail.verificationEligibility.eligible ? styles.eligible : styles.ineligible}>{detail.verificationEligibility.eligible ? 'Đủ điều kiện sơ bộ' : 'Chưa đủ điều kiện'}</div>
          {detail.verificationEligibility.issues.length > 0 ? <ul className={styles.issueList}>{detail.verificationEligibility.issues.map((issue) => <li key={issue}>{eligibilityLabels[issue] ?? issue}</li>)}</ul> : <p>Backend sẽ kiểm tra lại một lần nữa trong giao dịch xác minh.</p>}
        </aside>
      </div>

      <section className={styles.section} aria-labelledby='provenance-heading'>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>SOURCE & LICENSE</p><h2 id='provenance-heading'>Nguồn gốc và quyền sử dụng</h2></div>
        <div className={styles.provenanceGrid}>{detail.provenance.length === 0 ? <p>Chưa có bằng chứng nguồn gốc.</p> : detail.provenance.map((entry) => <ProvenanceCard entry={entry} key={entry.id} />)}</div>
      </section>

      {detail.contributionEvents.length > 0 ? <section className={styles.section} aria-labelledby='contribution-event-heading'><div className={styles.sectionHeading}><p className={styles.eyebrow}>CONTRIBUTION EVIDENCE</p><h2 id='contribution-event-heading'>Bằng chứng đóng góp</h2></div><div className={styles.eventList}>{detail.contributionEvents.map((event) => <div className={styles.eventCard} key={event.id}><strong>{event.eventType} · v{event.eventVersion}</strong><dl><div><dt>Terms</dt><dd>{event.termsVersion}</dd></div><div><dt>Rights confirmed</dt><dd>{event.rightsConfirmed ? 'Có' : 'Không'}</dd></div><div><dt>Reuse consent</dt><dd>{event.reuseConsent ? 'Có' : 'Không'}</dd></div><div><dt>Received</dt><dd>{formatDate(event.occurredAt)}</dd></div></dl></div>)}</div></section> : null}

      <section className={styles.section} aria-labelledby='audit-heading'>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>APPEND-ONLY HISTORY</p><h2 id='audit-heading'>Lịch sử kiểm duyệt</h2></div>
        {detail.reviewAuditHistory.length === 0 ? <p className={styles.muted}>Chưa có hành động kiểm duyệt nào.</p> : <ol className={styles.auditList}>{detail.reviewAuditHistory.map((audit) => <li className={styles.auditItem} key={audit.id}><div><strong>{auditActionLabel(audit.action)}</strong><span>{audit.previousState} → {audit.newState}</span></div><p>{audit.note || 'Không có ghi chú.'}</p><small>{formatDate(audit.createdAt)} · actor {audit.actorUserId}</small></li>)}</ol>}
      </section>

      <section className={styles.actionSection} aria-labelledby='actions-heading'>
        <div><p className={styles.eyebrow}>REVIEW ACTIONS</p><h2 id='actions-heading'>Ghi nhận quyết định</h2><p>Không có thao tác Request Changes trong lifecycle hiện tại.</p></div>
        <div className={styles.actions}>
          {resource.reviewState === 'COMMUNITY_REVIEW' ? <>
            <Button ref={actionTriggerRef} disabled={!canVerify} onClick={() => openAction('VERIFY')}>Xác minh</Button>
            <Button variant='danger' disabled={!canReject} onClick={() => openAction('REJECT')}>Từ chối</Button>
          </> : null}
          {canReconcile ? <Button ref={actionTriggerRef} variant='secondary' onClick={() => openAction('RECONCILE')}>Đưa về hàng chờ xem xét</Button> : null}
        </div>
      </section>

      <Dialog
        open={action !== null}
        title={actionTitle(action)}
        description={action === 'RECONCILE' ? 'Backend đã ẩn tài nguyên khỏi các public read. Thao tác này chỉ ghi nhận việc đối soát lifecycle và đưa trạng thái về COMMUNITY_REVIEW.' : action === 'VERIFY' ? 'Nếu mọi cổng công khai hiện tại vẫn hợp lệ, tài nguyên có thể xuất hiện trong Thư viện mở.' : 'Ghi một ghi chú trung tính để giải thích quyết định từ chối.'}
        onClose={closeAction}
        returnFocusRef={actionTriggerRef}
        footer={<><Button variant='quiet' onClick={closeAction} disabled={isSubmitting}>Huỷ</Button><Button variant={action === 'REJECT' ? 'danger' : 'primary'} onClick={() => void confirmAction()} loading={isSubmitting}>{action === 'VERIFY' ? 'Xác nhận xác minh' : action === 'REJECT' ? 'Xác nhận từ chối' : 'Đưa về hàng chờ'}</Button></>}
      >
        {action === 'REJECT' || action === 'RECONCILE' ? <Textarea id='review-reject-note' label={action === 'REJECT' ? 'Ghi chú từ chối' : 'Ghi chú đối soát (tuỳ chọn)'} value={note} onChange={(event) => setNote(event.target.value)} error={getLibraryReviewErrorCode(actionError) === 'LIBRARY_REVIEW_NOTE_REQUIRED' ? getLibraryReviewErrorMessage(actionError) : undefined} maxLength={1800} autoFocus={action === 'REJECT'} /> : <p className={styles.confirmCopy}>Bạn đang ghi nhận quyết định cho tài nguyên này. Backend sẽ kiểm tra lại trạng thái nguồn, license và moderation trong cùng giao dịch.</p>}
        {actionError && getLibraryReviewErrorCode(actionError) !== 'LIBRARY_REVIEW_NOTE_REQUIRED' ? <p className={styles.dialogError} role='alert'>{getLibraryReviewErrorMessage(actionError)}</p> : null}
      </Dialog>
    </article>
  );
}

function ProvenanceCard({ entry }: { entry: LibraryReviewProvenanceSummary }) {
  const healthLabel = entry.sourceHealth.applicable
    ? entry.sourceHealth.valid ? 'Nguồn hiện hợp lệ' : sourceHealthLabels[entry.sourceHealth.reason ?? ''] ?? entry.sourceHealth.reason ?? 'Nguồn không còn hợp lệ'
    : 'Không áp dụng kiểm tra Phase 06';
  return <article className={styles.provenanceCard}><div className={styles.cardHeader}><span>{entry.sourceType}</span><span className={entry.sourceHealth.applicable && !entry.sourceHealth.valid ? styles.warningPill : styles.successPill}>{healthLabel}</span></div><dl><div><dt>Source ID</dt><dd><code>{entry.sourceId}</code></dd></div>{entry.sourceUrl ? <div><dt>Source URL</dt><dd><a href={entry.sourceUrl} target='_blank' rel='noreferrer noopener'>{entry.sourceUrl}</a></dd></div> : null}<div><dt>Attribution</dt><dd>{entry.attribution || 'Chưa có attribution'}</dd></div><div><dt>License</dt><dd>{entry.license.displayName || entry.license.licenseKey}</dd></div><div><dt>License status</dt><dd>{entry.license.active ? 'Active' : 'Inactive'} · {entry.license.redistributionAllowed === true ? 'Redistribution allowed' : 'Redistribution unsafe'}</dd></div>{entry.license.derivativeConstraints ? <div><dt>Derivative constraints</dt><dd>{entry.license.derivativeConstraints}</dd></div> : null}</dl>{entry.license.canonicalUrl ? <a className={styles.licenseLink} href={entry.license.canonicalUrl} target='_blank' rel='noreferrer noopener'>Xem giấy phép chuẩn ↗</a> : null}</article>;
}

function ReviewResourceContent({ details }: { details: LibraryResourceDetails }) {
  switch (details.resourceType) {
    case 'VOCABULARY': return <div className={styles.detailStack}><div className={styles.term}>{details.term}</div><p>{details.definition}</p>{details.partOfSpeech ? <p className={styles.muted}>{details.partOfSpeech}</p> : null}{details.exampleSentence ? <blockquote>{details.exampleSentence}</blockquote> : null}</div>;
    case 'SENTENCE': return <div className={styles.detailStack}><p className={styles.quote}>{details.text}</p>{details.context ? <p className={styles.muted}>{details.context}</p> : null}</div>;
    case 'TRANSLATION': return <div className={styles.translation}><div><span>Source text</span><p>{details.sourceText}</p></div><div><span>Translated text</span><p>{details.translatedText}</p></div></div>;
    case 'GRAMMAR_ITEM': return <div className={styles.detailStack}><p className={styles.quote}>{details.title}</p><p>{details.explanation}</p>{details.pattern ? <blockquote>{details.pattern}</blockquote> : null}{details.exampleText ? <blockquote>{details.exampleText}</blockquote> : null}</div>;
    case 'DIALOGUE': return <div className={styles.dialogue}>{details.turns.map((turn, index) => <div className={styles.turn} key={`${turn.speaker}-${index}`}><strong>{turn.speaker}</strong><div><p>{turn.text}</p>{turn.translation ? <p className={styles.muted}>{turn.translation}</p> : null}</div></div>)}</div>;
    case 'IDIOM': return <div className={styles.detailStack}><div className={styles.term}>{details.expression}</div><p>{details.meaning}</p>{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'SLANG': return <div className={styles.detailStack}><div className={styles.term}>{details.expression}</div><p>{details.meaning}</p>{details.register ? <p className={styles.muted}>{details.register}</p> : null}{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'CULTURAL_NOTE': return <div className={styles.detailStack}><p className={styles.quote}>{details.title}</p><p>{details.body}</p></div>;
    case 'PRONUNCIATION': return <div className={styles.detailStack}><div className={styles.term}>{details.term}</div><p className={styles.phonetic}>{details.phonetic}</p>{details.notes ? <p>{details.notes}</p> : null}</div>;
    case 'LEARNING_COLLECTION': return <div className={styles.detailStack}><p className={styles.quote}>{details.title}</p><p>{details.description}</p></div>;
  }
}

function getDetailsTitle(details: LibraryResourceDetails): string {
  switch (details.resourceType) {
    case 'VOCABULARY': return details.term;
    case 'SENTENCE': return details.text;
    case 'TRANSLATION': return details.sourceText;
    case 'GRAMMAR_ITEM': case 'DIALOGUE': case 'CULTURAL_NOTE': case 'LEARNING_COLLECTION': return details.title;
    case 'IDIOM': case 'SLANG': return details.expression;
    case 'PRONUNCIATION': return details.term;
  }
}

function getDetailsLede(details: LibraryResourceDetails): string {
  switch (details.resourceType) {
    case 'VOCABULARY': return details.definition;
    case 'SENTENCE': return details.context ?? 'Một câu mẫu trong thư viện mở.';
    case 'TRANSLATION': return details.translatedText;
    case 'GRAMMAR_ITEM': return details.explanation;
    case 'DIALOGUE': return details.turns[0]?.text ?? 'Một đoạn hội thoại.';
    case 'IDIOM': case 'SLANG': return details.meaning;
    case 'CULTURAL_NOTE': return details.body;
    case 'PRONUNCIATION': return details.phonetic;
    case 'LEARNING_COLLECTION': return details.description;
  }
}

function stateLabel(state: string): string {
  return { COMMUNITY_REVIEW: 'Đang xem xét', VERIFIED: 'Đã xác minh', REJECTED: 'Đã từ chối', DRAFT: 'Bản nháp' }[state] ?? state;
}

function auditActionLabel(action: string): string {
  return { SUBMIT: 'Gửi xem xét', VERIFY: 'Xác minh', REJECT: 'Từ chối', INVALIDATE: 'Đưa về xem xét lại', REOPEN: 'Mở lại bản nháp' }[action] ?? action;
}

function actionTitle(action: ReviewAction | null): string {
  return action === 'VERIFY' ? 'Xác nhận xác minh' : action === 'REJECT' ? 'Xác nhận từ chối' : 'Đối soát nguồn';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}
