import { Link } from 'react-router-dom';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { LibraryRelatedPage } from '../library.types';
import { contentLanguage, resourceTypeLabelKeys } from '../library.presentation';
import { LibraryAttributionList } from './LibraryAttributionList';
import { ShareContextButton } from '../../exchange/components/ShareContextButton';
import styles from './LibraryRelatedResourceCard.module.css';

export const relationLabelKeys = {
  SAME_CONCEPT: 'library.relationSame', PREREQUISITE: 'library.relationPrerequisite', FOLLOW_UP: 'library.relationFollowUp',
  DIRECT_TRANSLATION: 'library.relationTranslation', COLLECTION_MEMBER: 'library.relationMember',
} as const;

export function LibraryRelatedResourceCard({ item }: { item: LibraryRelatedPage['items'][number] }) {
  const { t } = useUiLocale();
  const { resource, relation } = item;
  const d = resource.details;
  let title: string, excerpt: string;
  switch (d.resourceType) {
    case 'VOCABULARY': title = d.term; excerpt = d.definition; break;
    case 'SENTENCE': title = d.text; excerpt = d.context ?? ''; break;
    case 'TRANSLATION': title = d.sourceText; excerpt = d.translatedText; break;
    case 'GRAMMAR_ITEM': title = d.title; excerpt = d.explanation; break;
    case 'DIALOGUE': title = d.title; excerpt = d.turns[0]?.text ?? ''; break;
    case 'IDIOM': case 'SLANG': title = d.expression; excerpt = d.meaning; break;
    case 'CULTURAL_NOTE': title = d.title; excerpt = d.body; break;
    case 'PRONUNCIATION': title = d.term; excerpt = d.phonetic; break;
    case 'LEARNING_COLLECTION': title = d.title; excerpt = d.description; break;
  }
  return <article className={styles.card}>
    <p className={styles.relation}>{t('library.relatedRelation')}: <strong>{t(relationLabelKeys[relation.type])}</strong></p>
    <h3><Link to={`/library/${encodeURIComponent(resource.id)}`} lang={contentLanguage(resource.primaryLanguageCode)} dir='auto'>{title}</Link></h3>
    {excerpt ? <p className={styles.excerpt} dir='auto' lang={d.resourceType === 'TRANSLATION' ? contentLanguage(resource.secondaryLanguageCode) : undefined}>{excerpt}</p> : null}
    <p className={styles.meta}><span>{t(resourceTypeLabelKeys[resource.resourceType])}</span><span>{t('library.verified')}</span><span>{resource.primaryLanguageCode.toUpperCase()}{resource.secondaryLanguageCode ? ` · ${resource.secondaryLanguageCode.toUpperCase()}` : ''}</span>{resource.cefrLevel ? <span>CEFR {resource.cefrLevel}</span> : null}</p>
    <LibraryAttributionList entries={resource.provenance} compact />
    <ShareContextButton reference={{ type: 'LIBRARY_RESOURCE', id: resource.id }}/>
  </article>;
}
