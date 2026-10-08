import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../components/ui/Icon/Icon';
import styles from './AuthBody.module.css';

export interface AuthEditorialItem {
  icon: IconName;
  title: string;
  description: string;
}

interface AuthBodyProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  variant?: 'login' | 'register' | 'flow';
  editorialEyebrow?: string;
  editorialTitle?: string;
  editorialDescription?: string;
  editorialItems?: AuthEditorialItem[];
  editorialPrompt?: ReactNode;
  recoveryRail?: ReactNode;
  mobileReassuranceTitle?: string;
  mobileReassuranceText?: string;
  asideTitle?: string;
  asideText?: string;
}

export function AuthBody({
  eyebrow,
  title,
  description,
  children,
  variant = 'flow',
  editorialEyebrow,
  editorialTitle,
  editorialDescription,
  editorialItems = [],
  editorialPrompt,
  recoveryRail,
  mobileReassuranceTitle,
  mobileReassuranceText,
  asideTitle,
  asideText,
}: AuthBodyProps) {
  const { t } = useUiLocale();
  mobileReassuranceTitle = mobileReassuranceTitle ?? t("auth.a.respectful.and.safe.learning.space");
  mobileReassuranceText = mobileReassuranceText ?? t("auth.every.language.contribution.serves.our.shared.purpose");
  asideTitle = asideTitle ?? t("auth.one.account.many.connections");
  asideText = asideText ?? t("auth.keep.your.learning.history.and.language.connections");
  const resolvedEditorialTitle = editorialTitle ?? asideTitle ?? title;
  const resolvedEditorialDescription = editorialDescription ?? asideText ?? description;
  return (
    <section className={`${styles.authBody} ${styles[`authBody${variant[0].toUpperCase()}${variant.slice(1)}`]}`} aria-labelledby='auth-title'>
      {recoveryRail}
      <div className={styles.authGrid}>
        <aside className={styles.editorial} aria-labelledby='auth-editorial-title'>
          <p className={styles.eyebrow}>{editorialEyebrow ?? eyebrow}</p>
          <h1 id='auth-editorial-title'>{resolvedEditorialTitle}</h1>
          <p className={styles.editorialDescription}>{resolvedEditorialDescription}</p>
          {editorialItems.length > 0 ? (
            <ul className={styles.editorialItems}>
              {editorialItems.map((item) => (
                <li className={styles.editorialItem} key={item.title}>
                  <span className={styles.editorialIcon} aria-hidden='true'><Icon name={item.icon} size={18} /></span>
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {editorialPrompt ? <div className={styles.editorialPrompt}>{editorialPrompt}</div> : null}
        </aside>
        <div className={styles.authMain}>
        <div className={styles.authCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id='auth-title'>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        {children}
        </div>
      </div>
      {mobileReassuranceTitle ? (
        <aside className={styles.mobileReassurance} aria-label={t("auth.community.commitment")}>
          <div className={styles.reassuranceCard}>
            <Icon name='lock' size={18} aria-hidden='true' />
            <span>
              <strong>{mobileReassuranceTitle}</strong>
              <span>{mobileReassuranceText}</span>
            </span>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
