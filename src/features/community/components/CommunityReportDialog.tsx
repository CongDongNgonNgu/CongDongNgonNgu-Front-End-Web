import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { SelectControl, Textarea } from '../../../components/ui/FormControls';
import { Dialog } from '../../../components/ui/Overlays';
import { Icon } from '../../../components/ui/Icon/Icon';
import { COMMUNITY_REPORT_CATEGORIES, COMMUNITY_REPORT_CATEGORY_LABELS } from '../community.constants';
import type { CommunityPost, CommunityReportCategory, CommunityReportResponse } from '../community.types';
import {
  countUnicodeCodePoints,
  validateReportInput,
  type ReportValidationErrors,
} from '../community-validation';
import styles from './CommunityReportDialog.module.css';

export interface CommunityReportApiPort {
  reportPost: (
    postId: string,
    input: { category: CommunityReportCategory; details?: string },
  ) => Promise<CommunityReportResponse>;
}

interface CommunityReportDialogProps {
  open: boolean;
  post: CommunityPost | null;
  api: CommunityReportApiPort;
  onClose: () => void;
  onAuthRequired: () => void;
  authenticated: boolean;
}

export function CommunityReportDialog({
  open,
  post,
  api,
  onClose,
  onAuthRequired,
  authenticated,
}: CommunityReportDialogProps) {
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<ReportValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory('');
    setDetails('');
    setErrors({});
    setSubmitError('');
    setSubmitted(false);
  }, [open, post?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    if (!post) return;

    const nextErrors = validateReportInput({ category, details });
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.reportPost(post.id, {
        category: category as CommunityReportCategory,
        ...(details.trim() ? { details } : {}),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError && error.status === 429
          ? 'Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau ít phút.'
          : 'Không thể gửi báo cáo lúc này. Vui lòng thử lại sau ít phút.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} title='Báo cáo bài viết' onClose={isSubmitting ? () => undefined : onClose}>
      {submitted ? (
        <div className={styles.submitted} role='status'>
          <span className={styles.submittedIcon} aria-hidden='true'><Icon name='check' size={20} /></span>
          <h3>Đã gửi báo cáo</h3>
          <p>Cảm ơn bạn đã giúp cộng đồng an toàn hơn. Báo cáo của bạn đã được ghi nhận.</p>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <p className={styles.intro}>
            Chọn lý do phù hợp. Báo cáo sẽ được xem xét theo quy định cộng đồng.
          </p>
          <SelectControl
            id='community-report-category'
            label='Lý do báo cáo'
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setErrors((current) => ({ ...current, category: undefined }));
            }}
            error={errors.category}
            required
          >
            <option value=''>Chọn lý do</option>
            {COMMUNITY_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>{COMMUNITY_REPORT_CATEGORY_LABELS[value]}</option>
            ))}
          </SelectControl>
          <Textarea
            id='community-report-details'
            label='Chi tiết bổ sung'
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              setErrors((current) => ({ ...current, details: undefined }));
            }}
            error={errors.details}
            hint='Không bắt buộc'
            rows={5}
          />
          <p className={styles.charCount} aria-live='polite'>
            {countUnicodeCodePoints(details).toLocaleString('vi-VN')} / 1.000 ký tự
          </p>
          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <div className={styles.actions}>
            <Button variant='quiet' type='button' onClick={onClose} disabled={isSubmitting}>Hủy</Button>
            <Button type='submit' loading={isSubmitting}>Gửi báo cáo</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
