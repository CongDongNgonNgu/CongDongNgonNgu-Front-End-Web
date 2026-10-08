import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { languageApi } from '../../languages/api/language-api';
import { CEFR_LEVELS, type LanguageCatalogItem } from '../../languages/languages.types';
import { LIBRARY_RELATION_TYPES, LIBRARY_RESOURCE_TYPES, type LibraryRelatedApiPort, type LibraryRelatedQuery } from '../library.types';
import { resourceTypeLabelKeys } from '../library.presentation';
import { useLibraryRelatedResources } from '../hooks/useLibraryRelatedResources';
import { LibraryRelatedResourceCard, relationLabelKeys } from './LibraryRelatedResourceCard';
import styles from './LibraryRelatedResources.module.css';

interface Props { enabled?: boolean; onRefreshAnchor?: () => Promise<void>; resourceId: string; api: LibraryRelatedApiPort; catalogApi?: { listLanguages: () => Promise<Array<Pick<LanguageCatalogItem, 'code' | 'nativeName'>>> } }
export function LibraryRelatedResources({ resourceId, api, catalogApi = languageApi, onRefreshAnchor, enabled = true }: Props) {
  const { t } = useUiLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const [filters, setFilters] = useState<Omit<LibraryRelatedQuery, 'cursor' | 'limit'>>({});
  const [languages, setLanguages] = useState<Array<Pick<LanguageCatalogItem, 'code' | 'nativeName'>>>([]);
  const [languageUnavailable, setLanguageUnavailable] = useState(false);
  const state = useLibraryRelatedResources({ api, resourceId, filters, revalidateOnReturn: !onRefreshAnchor, enabled });
  useEffect(() => {
    let active = true;
    void catalogApi.listLanguages().then(value => { if (active) { setLanguages(value); setLanguageUnavailable(false); } }, () => { if (active) setLanguageUnavailable(true); });
    return () => { active = false; };
  }, [catalogApi]);
  const change = (key: keyof typeof filters, value: string) => setFilters(current => {
    const next = { ...current }; if (value) Object.assign(next, { [key]: value }); else delete next[key]; return next;
  });
  // Keep filters for this anchor while the parent revalidates, but expose no stale cards or controls.
  if (!enabled) return null;
  return <section className={styles.section} aria-labelledby='related-resources-heading'>
    <div className={styles.header}><div><h2 id='related-resources-heading' ref={heading} tabIndex={-1}>{t('library.relatedTitle')}</h2><p>{t('library.relatedDescription')}</p></div><Button variant='secondary' size='sm' onClick={() => void (onRefreshAnchor ? onRefreshAnchor() : state.refresh())}>{t('library.relatedRefresh')}</Button></div>
    <div className={styles.filters}>
      <label>{t('library.language')}<select value={filters.language ?? ''} onChange={e => change('language', e.target.value)}><option value=''>{t('library.allLanguages')}</option>{languages.map(l => <option value={l.code} key={l.code}>{l.nativeName} · {l.code.toUpperCase()}</option>)}</select></label>
      <label>{t('library.resourceType')}<select value={filters.type ?? ''} onChange={e => change('type', e.target.value)}><option value=''>{t('library.allTypes')}</option>{LIBRARY_RESOURCE_TYPES.map(type => <option key={type} value={type}>{t(resourceTypeLabelKeys[type])}</option>)}</select></label>
      <label>{t('library.level')}<select value={filters.level ?? ''} onChange={e => change('level', e.target.value)}><option value=''>{t('library.allLevels')}</option>{CEFR_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</select></label>
      <label>{t('library.relatedRelation')}<select value={filters.relation ?? ''} onChange={e => change('relation', e.target.value)}><option value=''>{t('library.relatedAllRelations')}</option>{LIBRARY_RELATION_TYPES.map(type => <option key={type} value={type}>{t(relationLabelKeys[type])}</option>)}</select></label>
    </div>
    {languageUnavailable ? <p role='status'>{t('library.relatedLanguageUnavailable')}</p> : null}
    {Object.keys(filters).length ? <Button size='sm' variant='quiet' onClick={() => setFilters({})}>{t('library.clearFilters')}</Button> : null}
    <div aria-busy={state.isLoading}>
      {state.isLoading ? <Skeleton lines={4} label={t('library.relatedLoading')} /> : state.error ? <ErrorState title={t('library.relatedError')} description={t('library.relatedErrorDescription')} onRetry={() => void state.refresh()} /> : state.items.length === 0 ? <EmptyState title={t('library.relatedEmpty')} description={t('library.relatedEmptyDescription')} icon='library' /> : <ul className={styles.list}>{state.items.map(item => <li key={item.resource.id}><LibraryRelatedResourceCard item={item} /></li>)}</ul>}
    </div>
    <div className={styles.actions}>{!state.isLoading && state.nextCursor ? <Button variant='secondary' onClick={() => { void state.nextPage().then(() => heading.current?.focus()); }}>{t('library.relatedNext')}</Button> : null}<Link to='/library'>{t('library.relatedSearch')}</Link></div>
  </section>;
}
