import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Overlays';
import { SelectControl, TextInput, Textarea } from '../../../components/ui/FormControls';
import { COMMUNITY_CEFR_LEVELS, COMMUNITY_POST_TYPES } from '../community.types';
import type {
  CommunityComposerInput,
  CommunityCreatePostInput,
  CommunityPost,
} from '../community.types';
import { COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
import {
  buildCreatePostPayload,
  countUnicodeCodePoints,
  validateComposerInput,
  type ComposerValidationErrors,
} from '../community-validation';
import styles from './CommunityComposer.module.css';

export interface CommunityComposerApiPort {
  createPost: (input: CommunityCreatePostInput) => Promise<CommunityPost>;
}

interface CommunityComposerProps {
  open: boolean;
  authenticated: boolean;
  languages: Array<{
    code: string;
    nativeName: string;
    englishName: string;
  }>;
  initialLanguageCode?: string;
  api: CommunityComposerApiPort;
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
  onAuthRequired: () => void;
}

function blankInput(languageCode = ''): CommunityComposerInput {
  return {
    postType: '',
    languageCode,
    content: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  };
}

export function CommunityComposer({
  open,
  authenticated,
  languages,
  initialLanguageCode = '',
  api,
  onClose,
  onCreated,
  onAuthRequired,
}: CommunityComposerProps) {
  const { t, locale, formatNumber } = useUiLocale();
  const [input, setInput] = useState(() => blankInput(initialLanguageCode));
  const [errors, setErrors] = useState<ComposerValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const metadataRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;
    setInput(blankInput(initialLanguageCode));
    setErrors({});
    setSubmitError('');
    if (metadataRef.current) {
      metadataRef.current.open = typeof window === 'undefined' || window.innerWidth > 560;
    }
  }, [initialLanguageCode, open]);

  const update = (field: keyof CommunityComposerInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      onAuthRequired();
      return;
    }

    const nextErrors = validateComposerInput(input, locale);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const post = await api.createPost(buildCreatePostPayload(input));
      onCreated(post);
      setInput(blankInput(initialLanguageCode));
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError && error.status === 429
          ? t("community.posts.you.have.posted.too.often.please.try.again")
          : t("community.posts.unable.to.publish.your.post.please.try.again"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={t("community.posts.share.a.post")}
      description={(
        <>
          <span className={styles.desktopDescription}>
            {t("community.posts.a.space.for.language.learners.to.share.knowledge")}</span>
          <span className={styles.mobileDescription}>{t("community.posts.learning.texts.native.conversation")}</span>
        </>
      )}
      variant='composer'
      onClose={isSubmitting ? () => undefined : onClose}
      footer={(
        <div className={styles.actions}>
          <Button variant='quiet' type='button' onClick={onClose} disabled={isSubmitting}>{t("community.posts.cancel")}</Button>
          <Button className={styles.publishAction} type='submit' form='community-composer-form' loading={isSubmitting}>{t("community.posts.publish.post")}</Button>
        </div>
      )}
    >
      <form id='community-composer-form' className={styles.form} onSubmit={handleSubmit} noValidate>

        <div className={styles.fieldGrid}>
          <SelectControl
            id='community-post-type'
            label={t("community.posts.post.type")}
            value={input.postType}
            onChange={(event) => update('postType', event.target.value)}
            error={errors.postType}
            required
          >
            <option value=''>{t("community.posts.choose.a.post.type")}</option>
            {COMMUNITY_POST_TYPES.map((type) => (
              <option key={type} value={type}>{t(COMMUNITY_POST_TYPE_LABELS_KEYS[type])}</option>
            ))}
          </SelectControl>

          <SelectControl
            id='community-language'
            label={t("community.posts.target.language")}
            value={input.languageCode}
            onChange={(event) => update('languageCode', event.target.value)}
            error={errors.languageCode}
            required
          >
            <option value=''>{t("community.posts.choose.a.language")}</option>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName} · {language.englishName}
              </option>
            ))}
          </SelectControl>
        </div>

        <Textarea
          id='community-content'
          label={t("community.posts.content")}
          value={input.content}
          onChange={(event) => update('content', event.target.value)}
          error={errors.content}
          hint={t("community.posts.plain.text.only.without.embedded.links.or.attachments")}
          required
          rows={7}
        />
        <p className={styles.charCount} aria-live='polite'>
          {t('community.posts.characterCount', { count: countUnicodeCodePoints(input.content), max: formatNumber(20000) })}</p>

        <details
          ref={metadataRef}
          className={styles.optionalMetadata}
        >
          <summary>
            <span>{t("community.posts.learning.details.optional")}</span>
            <span className={styles.metadataSummaryHint}>{t("community.posts.additional.context")}</span>
          </summary>
          <div className={styles.metadataFields}>
            <div className={styles.fieldGrid}>
              <SelectControl
                id='community-cefr'
                label={t("community.posts.language.proficiency.cefr")}
                value={input.cefrLevel}
                onChange={(event) => update('cefrLevel', event.target.value)}
                error={errors.cefrLevel}
                hint={t("community.posts.optional")}
              >
                <option value=''>{t("community.posts.not.specified")}</option>
                {COMMUNITY_CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </SelectControl>

              <TextInput
                id='community-topic'
                label={t("community.posts.topic.discussion.context")}
                value={input.topic}
                onChange={(event) => update('topic', event.target.value)}
                error={errors.topic}
                hint={t('community.posts.optionalTopicCount', { count: countUnicodeCodePoints(input.topic) })}
              />
            </div>
          </div>
        </details>

        <fieldset className={styles.visibilityGroup} aria-invalid={Boolean(errors.visibility)} aria-describedby={errors.visibility ? 'community-visibility-error' : undefined}>
          <legend>{t("community.posts.visibility")}</legend>
          <div className={styles.visibilityOptions}>
            <label className={[styles.visibilityOption, input.visibility === 'PUBLIC' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
              <input
                type='radio'
                name='community-visibility'
                value='PUBLIC'
                checked={input.visibility === 'PUBLIC'}
                onChange={(event) => update('visibility', event.target.value)}
              />
              <span className={styles.visibilityCopy}>
                <strong>{t("community.posts.public.to.the.community.public")}</strong>
                <span>{t("community.posts.appears.in.the.public.feed.for.feedback.from")}</span>
              </span>
            </label>
            <label className={[styles.visibilityOption, input.visibility === 'PRIVATE' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
              <input
                type='radio'
                name='community-visibility'
                value='PRIVATE'
                checked={input.visibility === 'PRIVATE'}
                onChange={(event) => update('visibility', event.target.value)}
              />
              <span className={styles.visibilityCopy}>
                <strong>{t("community.posts.save.to.your.personal.journal.private")}</strong>
                <span>{t("community.posts.only.you.can.view.this.entry")}</span>
              </span>
            </label>
          </div>
          {errors.visibility ? <p id='community-visibility-error' className={styles.visibilityError} role='alert'>{errors.visibility}</p> : null}
        </fieldset>

        {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
      </form>
    </Dialog>
  );
}
