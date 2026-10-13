import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { SelectControl, TextInput } from '../../../components/ui/FormControls';
import {
  COMMUNITY_CEFR_LEVELS,
  COMMUNITY_VISIBILITIES,
  type CommunityVisibility,
} from '../community.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from '../pages/CommunityRequestPage.module.css';

interface RequestMetadataFieldsProps {
  idPrefix: string;
  context?: {
    value: string;
    error?: string;
    onChange: (value: string) => void;
  };
  cefrLevel: string;
  topic: string;
  visibility: CommunityVisibility;
  errors: Partial<Record<'cefrLevel' | 'topic' | 'visibility', string>>;
  onChange: (field: 'cefrLevel' | 'topic' | 'visibility', value: string) => void;
}

export function RequestMetadataFields({
  idPrefix,
  context,
  cefrLevel,
  topic,
  visibility,
  errors,
  onChange,
}: RequestMetadataFieldsProps) {
  const { t } = useUiLocale();
  return (
    <section className={styles.metadataSection} aria-labelledby={idPrefix + '-metadata-heading'}>
      <div>
        <h2 id={idPrefix + '-metadata-heading'}>{t("community.posts.additional.information")}</h2>
        <p>{t("community.posts.optional.details.help.the.community.respond.to.your")}</p>
      </div>

      <div className={styles.metadataGrid}>
        {context ? (
          <div className={styles.metadataContext}>
            <TextInput
              id={idPrefix + '-context'}
              label={t("community.posts.context.optional")}
              value={context.value}
              onChange={(event) => context.onChange(event.target.value)}
              error={context.error}
              hint={t("community.posts.optional.alternative")}
            />
          </div>
        ) : null}
        <SelectControl
          id={idPrefix + '-cefr'}
          label={t("community.posts.cefr.level")}
          value={cefrLevel}
          onChange={(event) => onChange('cefrLevel', event.target.value)}
          error={errors.cefrLevel}
          hint={t("community.posts.optional")}
        >
          <option value=''>{t("community.posts.not.yet.specified")}</option>
          {COMMUNITY_CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </SelectControl>

        <TextInput
          id={idPrefix + '-topic'}
          label={t("community.posts.topic")}
          value={topic}
          onChange={(event) => onChange('topic', event.target.value)}
          error={errors.topic}
          hint={t('community.posts.optionalTopicCount', { count: countUnicodeCodePoints(topic) })}
        />
      </div>

      <fieldset
        className={styles.visibilityGroup}
        aria-invalid={Boolean(errors.visibility)}
        aria-describedby={errors.visibility ? idPrefix + '-visibility-error' : undefined}
      >
        <legend>{t("community.posts.visibility")}</legend>
        <div className={styles.visibilityOptions}>
          <label className={[styles.visibilityOption, visibility === 'PUBLIC' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
            <input
              type='radio'
              name={idPrefix + '-visibility'}
              value='PUBLIC'
              checked={visibility === 'PUBLIC'}
              onChange={(event) => onChange('visibility', event.target.value)}
            />
            <span>
              <strong>{t("community.posts.public.to.the.community")}</strong>
              <small>{t("community.posts.receive.feedback.from.other.members")}</small>
            </span>
          </label>
          <label className={[styles.visibilityOption, visibility === 'PRIVATE' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
            <input
              type='radio'
              name={idPrefix + '-visibility'}
              value='PRIVATE'
              checked={visibility === 'PRIVATE'}
              onChange={(event) => onChange('visibility', event.target.value)}
            />
            <span>
              <strong>{t("community.posts.only.me")}</strong>
              <small>{t("community.posts.save.to.your.personal.journal.without.appearing.in")}</small>
            </span>
          </label>
        </div>
        {errors.visibility ? <p id={idPrefix + '-visibility-error'} className={styles.fieldError} role='alert'>{errors.visibility}</p> : null}
      </fieldset>
    </section>
  );
}
