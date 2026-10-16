import { useState, type FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button';
import { SelectControl, TextInput } from '../../../components/ui/FormControls';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { COMMUNITY_POST_TYPES, COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
import type { CommunitySearchQuery } from '../community-search';
import { parseCommunitySearch, serializeCommunitySearch } from '../community-search';
import styles from './CommunitySearchForm.module.css';

interface CommunitySearchFormProps {
  query: CommunitySearchQuery;
  languages: LanguageCatalogItem[];
  languagesLoading: boolean;
  authenticated: boolean;
  onApply: (query: CommunitySearchQuery) => void;
  onReset: () => void;
  onAuthRequired: () => void;
}
export function CommunitySearchForm({ query, languages, languagesLoading, authenticated, onApply, onReset, onAuthRequired }: CommunitySearchFormProps) {
  const { t } = useUiLocale();
  const [draft, setDraft] = useState<CommunitySearchQuery>(query);
  const [moreOpen, setMoreOpen] = useState(false);
  const [invalidSubmission, setInvalidSubmission] = useState(false);
  const [errors, setErrors] = useState<{ q?: boolean; topic?: boolean; language?: boolean }>({});
  const update = <K extends keyof CommunitySearchQuery>(key: K, value: CommunitySearchQuery[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors({});
    setInvalidSubmission(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = parseCommunitySearch(serializeCommunitySearch(draft));
    const nextErrors = {
      q: Array.from((draft.q ?? '').normalize('NFKC').trim()).length > 120 || /[\u0000-\u001f\u007f]/u.test(draft.q ?? ''),
      topic: Boolean(draft.topic?.trim()) && !normalized.query.topic,
      language: Boolean(draft.languageCode) && !languages.some((language) => language.code === draft.languageCode && language.active),
    };
    setErrors(nextErrors);
    if (nextErrors.topic) setMoreOpen(true);
    const hasFieldError = Object.values(nextErrors).some(Boolean);
    setInvalidSubmission(normalized.invalid && !hasFieldError);
    if (normalized.invalid || hasFieldError) return;
    onApply(normalized.query);
  };
  const unavailableLanguage = draft.languageCode && !languages.some((language) => language.code === draft.languageCode);
  return <form className={styles.form} onSubmit={submit} noValidate aria-label={t('community.search.label')}>
    <div className={styles.primary}>
      <TextInput type='search' label={t('community.search.label')} value={draft.q ?? ''} onChange={(event) => update('q', event.target.value)} hint={t('community.search.queryHint')} error={errors.q ? t('community.search.invalidQuery') : undefined}/>
      <SelectControl label={t('community.posts.by.language')} value={draft.languageCode ?? ''} disabled={languagesLoading} onChange={(event) => update('languageCode', event.target.value || undefined)} error={errors.language ? t('community.search.invalidLanguage') : undefined}>
        <option value=''>{t('community.posts.all.languages')}</option>
        {unavailableLanguage ? <option value={draft.languageCode}>{t('community.search.invalidLanguage')}</option> : null}
        {languages.filter((language) => language.active).map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}
      </SelectControl>
    </div>
    <details className={styles.more} open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
      <summary aria-expanded={moreOpen}><Icon name='search' size={18}/><span>{t('community.search.more')}</span><Icon name='chevron-down' size={18}/></summary>
      <div className={styles.fields}>
        <SelectControl label={t('community.search.type')} value={draft.postType ?? ''} onChange={(event) => {
          const type = event.target.value as CommunitySearchQuery['postType'];
          setDraft((current) => ({...current, postType: type || undefined, responseState: type && type !== 'QUESTION' ? undefined : current.responseState}));
        }}>
          <option value=''>{t('community.search.allTypes')}</option>
          {COMMUNITY_POST_TYPES.map((type) => <option key={type} value={type}>{t(COMMUNITY_POST_TYPE_LABELS_KEYS[type])}</option>)}
        </SelectControl>
        <TextInput label={t('community.search.topic')} value={draft.topic ?? ''} onChange={(event) => update('topic',event.target.value)} hint={t('community.search.topicHint')} error={errors.topic ? t('community.search.invalidTopic') : undefined}/>
        <SelectControl label={t('community.search.state')} value={draft.responseState ?? ''} disabled={Boolean(draft.postType && draft.postType !== 'QUESTION')} hint={t('community.search.questionOnly')} onChange={(event) => {
          const state = event.target.value as CommunitySearchQuery['responseState'];
          setDraft((current) => ({...current, responseState: state || undefined, postType: state ? 'QUESTION' : current.postType}));
        }}>
          <option value=''>{t('community.search.allStates')}</option>
          <option value='UNANSWERED'>{t('community.search.unanswered')}</option>
          <option value='ANSWERED'>{t('community.search.answered')}</option>
          <option value='ACCEPTED'>{t('community.search.accepted')}</option>
        </SelectControl>
        <SelectControl label={t('community.search.sort')} value={draft.sort ?? 'NEWEST'} onChange={(event) => update('sort',event.target.value as CommunitySearchQuery['sort'])}>
          <option value='NEWEST'>{t('community.posts.newest')}</option>
          <option value='USEFUL'>{t('community.search.useful')}</option>
        </SelectControl>
        <div className={styles.saved}>
          <label><input type='checkbox' checked={draft.savedByMe ?? false} disabled={!authenticated} onChange={(event) => update('savedByMe',event.target.checked)}/>{t('community.search.saved')}</label>
          <p>{t('community.search.savedHelp')}</p>
          {!authenticated && !query.savedByMe ? <Button type='button' variant='quiet' onClick={onAuthRequired}>{t('community.search.signIn')}</Button> : null}
        </div>
      </div>
    </details>
    {invalidSubmission ? <p role='alert'>{t('community.search.invalidFilters')}</p> : null}
    <div className={styles.actions}>
      <Button type='button' variant='quiet' onClick={() => { setDraft({}); setErrors({}); setInvalidSubmission(false); onReset(); }}>{t('community.search.reset')}</Button>
      <Button type='submit'>{t('community.search.apply')}</Button>
    </div>
  </form>;
}
