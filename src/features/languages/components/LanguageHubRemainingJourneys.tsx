import { Link } from 'react-router-dom';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { buildHubSocialJourneys, HUB_DEFERRED_KEYS } from '../domain/hub-journeys';
import styles from './LanguageHubCoreJourneys.module.css';

export function LanguageHubRemainingJourneys({ language }: { language: { code: string } }) {
  const { t } = useUiLocale();
  const descriptions = { community: 'hub.communityDescription', questions: 'hub.questionsDescription', exchange: 'hub.exchangeDescription' } as const;
  const blockers = { grammar: 'hub.grammarBlocker', pronunciation: 'hub.pronunciationBlocker', practice: 'hub.practiceBlocker' } as const;
  const gates = { grammar: 'hub.grammarGate', pronunciation: 'hub.pronunciationGate', practice: 'hub.practiceGate' } as const;
  return <>
    <section className={styles.surface} aria-labelledby='hub-social-heading'>
      <h2 id='hub-social-heading'>{t('hub.socialTitle')}</h2>
      <p>{t('hub.socialLead')}</p>
      <p>{t('hub.targetLocaleLimit')}</p>
      <div className={styles.grid}>{buildHubSocialJourneys(language).map(({ key, href }) => <article className={styles.item} key={key}>
        <h3>{t(`hub.${key}`)}</h3><p>{t(descriptions[key])}</p>
        <Link to={href}>{t('hub.openSocial', { category: t(`hub.${key}`) })}<span aria-hidden='true'> →</span></Link>
      </article>)}</div>
    </section>
    <section className={styles.surface} aria-labelledby='hub-deferred-heading'>
      <h2 id='hub-deferred-heading'>{t('hub.deferredTitle')}</h2>
      <div className={styles.grid}>{HUB_DEFERRED_KEYS.map((key) => <article className={styles.item} key={key}>
        <h3 id={`hub-${key}`} tabIndex={-1}>{t(`hub.${key}`)}</h3>
        <p><strong>{t('hub.deferred')}</strong> — {t(blockers[key])}</p>
        <p><strong>{t('hub.gateLabel')}:</strong> {t(gates[key])}</p>
      </article>)}</div>
      <p><Link to={'/library?' + new URLSearchParams({ language: language.code })}>{t('hub.adjacent')}</Link></p>
    </section>
  </>;
}
