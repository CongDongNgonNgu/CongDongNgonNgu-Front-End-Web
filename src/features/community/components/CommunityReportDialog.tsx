import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { SelectControl, Textarea } from '../../../components/ui/FormControls';
import { Dialog } from '../../../components/ui/Overlays';
import { Icon } from '../../../components/ui/Icon/Icon';
import { COMMUNITY_REPORT_CATEGORIES, COMMUNITY_REPORT_CATEGORY_LABELS_KEYS } from '../community.constants';
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
  const { t, locale, formatNumber } = useUiLocale();
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

    const nextErrors = validateReportInput({ category, details }, locale);
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
          ? t("community.posts.you.have.sent.too.many.reports.please.try")
          : t("community.posts.unable.to.send.your.report.please.try.again"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} title={t("community.posts.report.post")} onClose={isSubmitting ? () => undefined : onClose}>
      {submitted ? (
        <div className={styles.submitted} role='status'>
          <span className={styles.submittedIcon} aria-hidden='true'><Icon name='check' size={20} /></span>
          <h3>{t("community.posts.report.sent")}</h3>
          <p>{t("community.posts.thank.you.for.helping.keep.the.community.safe")}</p>
          <Button onClick={onClose}>{t("community.posts.close")}</Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <p className={styles.intro}>
            {t("community.posts.choose.the.appropriate.reason.your.report.will.be")}</p>
          <SelectControl
            id='community-report-category'
            label={t("community.posts.report.reason")}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setErrors((current) => ({ ...current, category: undefined }));
            }}
            error={errors.category}
            required
          >
            <option value=''>{t("community.posts.choose.a.reason")}</option>
            {COMMUNITY_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>{t(COMMUNITY_REPORT_CATEGORY_LABELS_KEYS[value])}</option>
            ))}
          </SelectControl>
          <Textarea
            id='community-report-details'
            label={t("community.posts.additional.details")}
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              setErrors((current) => ({ ...current, details: undefined }));
            }}
            error={errors.details}
            hint={t("community.posts.optional")}
            rows={5}
          />
          <p className={styles.charCount} aria-live='polite'>
            {t('community.posts.characterCount', { count: countUnicodeCodePoints(details), max: formatNumber(1000) })}</p>
          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <div className={styles.actions}>
            <Button variant='quiet' type='button' onClick={onClose} disabled={isSubmitting}>{t("community.posts.cancel")}</Button>
            <Button type='submit' loading={isSubmitting}>{t("community.posts.send.report")}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
