import { Link } from 'react-router-dom';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { buildHubJourneys } from '../domain/hub-journeys';
import type { LanguageHubFilters } from '../languages.types';
import styles from './LanguageHubCoreJourneys.module.css';

export function LanguageHubCoreJourneys({ language, filters }: { language: { code: string; nativeName: string }; filters: LanguageHubFilters }) {
  const { t } = useUiLocale();
  const descriptions = { vocabulary: 'hub.vocabularyDescription', sentences: 'hub.sentencesDescription', resources: 'hub.resourcesDescription' } as const;
  return (
    <section className={styles.surface} aria-labelledby='resource-preview-heading'>
      <h2 id='resource-preview-heading'>{t('hub.learningTitle', { language: language.nativeName })}</h2>
      <p>{t('hub.learningLead')}</p>
      <div className={styles.grid}>
        {buildHubJourneys(language, filters).map(({ key, href }) => (
          <article className={styles.item} key={key}>
            <h3>{t(`hub.${key}`)}</h3>
            <p>{t(descriptions[key])}</p>
            <Link to={href}>{t('hub.openLibrary', { category: t(`hub.${key}`) })}<span aria-hidden='true'> →</span></Link>
          </article>
        ))}
      </div>
      <p>{t('hub.emptyExplanation')}</p>
      <p>{t('hub.contributionExplanation')} <Link to='/library/contribute'>{t('hub.contribute')}</Link></p>
    </section>
  );
}
