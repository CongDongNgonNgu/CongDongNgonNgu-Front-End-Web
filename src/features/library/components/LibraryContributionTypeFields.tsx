import { SelectControl, TextInput, Textarea } from '../../../components/ui/FormControls';
import { CEFR_LEVELS, type LanguageCatalogItem } from '../../languages/languages.types';
import {
  LIBRARY_CONTRIBUTION_RESOURCE_TYPES,
  type ContributionFormDetails,
  type LibraryContributionFormState,
  type LibraryContributionResourceType,
} from '../library.contribution.types';
import styles from './LibraryContributionTypeFields.module.css';

const TYPE_LABELS: Record<LibraryContributionResourceType, { title: string; description: string }> = {
  VOCABULARY: { title: 'Từ vựng', description: 'Một từ hoặc cụm từ kèm giải thích rõ ràng.' },
  SENTENCE: { title: 'Câu ví dụ', description: 'Một câu hoàn chỉnh để người học đặt từ vào ngữ cảnh.' },
  TRANSLATION: { title: 'Bản dịch', description: 'Nội dung và bản dịch tương ứng giữa hai ngôn ngữ.' },
};

interface LibraryContributionTypeFieldsProps {
  mode: 'type' | 'content';
  form: LibraryContributionFormState;
  approvedTypes: LibraryContributionResourceType[];
  languages: LanguageCatalogItem[];
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (patch: Partial<LibraryContributionFormState>) => void;
}

export function LibraryContributionTypeFields({
  mode,
  form,
  approvedTypes,
  languages,
  errors,
  disabled = false,
  onChange,
}: LibraryContributionTypeFieldsProps) {
  const activeLanguages = languages.filter((language) => language.active);
  const updateDetails = (patch: Partial<ContributionFormDetails>) => {
    onChange({ details: { ...form.details, ...patch } as ContributionFormDetails });
  };

  return (
    <div className={styles.fields}>
      {mode === 'type' ? <>
        <fieldset className={styles.typeFieldset} aria-describedby={errors.resourceType ? 'contribution-resource-type-error' : undefined}>
        <legend>Loại tài nguyên</legend>
        <p className={styles.fieldHint}>Chọn đúng loại để chúng tôi áp dụng cách kiểm duyệt phù hợp.</p>
        <div className={styles.typeGrid} role='radiogroup' aria-label='Loại tài nguyên'>
          {LIBRARY_CONTRIBUTION_RESOURCE_TYPES.filter((type) => approvedTypes.includes(type)).map((type) => (
            <label key={type} className={`${styles.typeOption} ${form.resourceType === type ? styles.typeOptionSelected : ''}`}>
              <input
                id={`contribution-resource-type-${type.toLowerCase()}`}
                type='radio'
                name='resourceType'
                value={type}
                checked={form.resourceType === type}
                disabled={disabled}
                onChange={() => onChange({ resourceType: type, details: createDetails(type), secondaryLanguageCode: type === 'TRANSLATION' ? form.secondaryLanguageCode : '' })}
              />
              <span>
                <strong>{TYPE_LABELS[type].title}</strong>
                <small>{TYPE_LABELS[type].description}</small>
              </span>
            </label>
          ))}
        </div>
        {errors.resourceType ? <p id='contribution-resource-type-error' className={styles.error} role='alert'>{errors.resourceType}</p> : null}
        </fieldset>

        <div className={styles.metadataGrid}>
        <SelectControl
          id='contribution-primary-language'
          label={form.resourceType === 'TRANSLATION' ? 'Ngôn ngữ nguồn' : 'Ngôn ngữ chính'}
          required
          value={form.primaryLanguageCode}
          disabled={disabled || activeLanguages.length === 0}
          error={errors.primaryLanguageCode}
          onChange={(event) => onChange({ primaryLanguageCode: event.target.value })}
        >
          <option value=''>Chọn ngôn ngữ</option>
          {activeLanguages.map((language) => <option key={language.code} value={language.code}>{language.nativeName} · {language.englishName}</option>)}
        </SelectControl>

        {form.resourceType === 'TRANSLATION' ? (
          <SelectControl
            id='contribution-secondary-language'
            label='Ngôn ngữ đích'
            required
            value={form.secondaryLanguageCode}
            disabled={disabled || activeLanguages.length === 0}
            error={errors.secondaryLanguageCode}
            onChange={(event) => onChange({ secondaryLanguageCode: event.target.value })}
          >
            <option value=''>Chọn ngôn ngữ</option>
            {activeLanguages.map((language) => <option key={language.code} value={language.code}>{language.nativeName} · {language.englishName}</option>)}
          </SelectControl>
        ) : null}

        <SelectControl
          id='contribution-cefr'
          label='Trình độ CEFR'
          hint='Không bắt buộc'
          value={form.cefrLevel}
          disabled={disabled}
          onChange={(event) => onChange({ cefrLevel: event.target.value as LibraryContributionFormState['cefrLevel'] })}
        >
          <option value=''>Chưa xác định</option>
          {CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </SelectControl>

        <TextInput
          id='contribution-topics'
          label='Chủ đề'
          hint='Không bắt buộc · phân tách bằng dấu phẩy, tối đa 20 chủ đề'
          value={form.topicsText}
          disabled={disabled}
          error={errors.topics}
          onChange={(event) => onChange({ topicsText: event.target.value })}
          placeholder='du lịch, giao tiếp'
          autoComplete='off'
        />
        </div>
      </> : null}

      {mode === 'content' ? <section className={styles.contentSection} aria-labelledby='contribution-content-heading'>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>BƯỚC 2</p>
          <h2 id='contribution-content-heading'>Nội dung để người học sử dụng</h2>
          <p>Viết ngắn gọn, rõ nghĩa và giữ nguyên văn bản ở ngôn ngữ bạn đang đóng góp.</p>
        </div>
        {form.resourceType === 'VOCABULARY' ? (
          <div className={styles.contentGrid}>
            <TextInput
              id='contribution-term'
              label='Từ hoặc cụm từ'
              required
              maxLength={500}
              value={form.details.resourceType === 'VOCABULARY' ? form.details.term : ''}
              disabled={disabled}
              error={errors.term}
              onChange={(event) => updateDetails({ term: event.target.value })}
            />
            <TextInput
              id='contribution-part-of-speech'
              label='Từ loại'
              hint='Không bắt buộc'
              maxLength={80}
              value={form.details.resourceType === 'VOCABULARY' ? form.details.partOfSpeech : ''}
              disabled={disabled}
              error={errors.partOfSpeech}
              onChange={(event) => updateDetails({ partOfSpeech: event.target.value })}
            />
            <Textarea
              id='contribution-definition'
              label='Định nghĩa'
              required
              maxLength={5_000}
              value={form.details.resourceType === 'VOCABULARY' ? form.details.definition : ''}
              disabled={disabled}
              error={errors.definition}
              onChange={(event) => updateDetails({ definition: event.target.value })}
            />
            <Textarea
              id='contribution-example-sentence'
              label='Câu ví dụ'
              hint='Không bắt buộc'
              maxLength={20_000}
              value={form.details.resourceType === 'VOCABULARY' ? form.details.exampleSentence : ''}
              disabled={disabled}
              error={errors.exampleSentence}
              onChange={(event) => updateDetails({ exampleSentence: event.target.value })}
            />
          </div>
        ) : null}
        {form.resourceType === 'SENTENCE' ? (
          <div className={styles.contentGrid}>
            <Textarea
              id='contribution-sentence-text'
              label='Câu'
              required
              maxLength={20_000}
              value={form.details.resourceType === 'SENTENCE' ? form.details.text : ''}
              disabled={disabled}
              error={errors.text}
              onChange={(event) => updateDetails({ text: event.target.value })}
            />
            <Textarea
              id='contribution-sentence-context'
              label='Ngữ cảnh'
              hint='Không bắt buộc'
              maxLength={5_000}
              value={form.details.resourceType === 'SENTENCE' ? form.details.context : ''}
              disabled={disabled}
              error={errors.context}
              onChange={(event) => updateDetails({ context: event.target.value })}
            />
          </div>
        ) : null}
        {form.resourceType === 'TRANSLATION' ? (
          <div className={styles.contentGrid}>
            <Textarea
              id='contribution-source-text'
              label='Văn bản nguồn'
              required
              maxLength={20_000}
              value={form.details.resourceType === 'TRANSLATION' ? form.details.sourceText : ''}
              disabled={disabled}
              error={errors.sourceText}
              onChange={(event) => updateDetails({ sourceText: event.target.value })}
            />
            <Textarea
              id='contribution-translated-text'
              label='Bản dịch'
              required
              maxLength={20_000}
              value={form.details.resourceType === 'TRANSLATION' ? form.details.translatedText : ''}
              disabled={disabled}
              error={errors.translatedText}
              onChange={(event) => updateDetails({ translatedText: event.target.value })}
            />
          </div>
        ) : null}
        {!form.resourceType ? <p className={styles.emptyContent}>Chọn loại tài nguyên ở bước trước để nhập nội dung.</p> : null}
      </section> : null}
    </div>
  );
}

function createDetails(type: LibraryContributionResourceType): ContributionFormDetails {
  if (type === 'SENTENCE') return { resourceType: type, text: '', context: '' };
  if (type === 'TRANSLATION') return { resourceType: type, sourceText: '', translatedText: '' };
  return { resourceType: type, term: '', definition: '', partOfSpeech: '', exampleSentence: '' };
}
