import { CommunityDisclosure } from './CommunityDisclosure';
﻿import type { ReactNode } from 'react';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import styles from './GeneralDiscussion.module.css';

export function GeneralDiscussion({ secondary, count, children }: { secondary: boolean; count: number; children: ReactNode }) {
  const { t, formatNumber } = useUiLocale();
  if (!secondary) return children;
  return <CommunityDisclosure className={styles.disclosure} title={t('community.detail.general.discussion') + ' · ' + formatNumber(count)}>
    <p className={styles.hint}>{t('community.detail.comments.and.one.level.replies.are.separate.from.answers.and')}</p>
    {children}
  </CommunityDisclosure>;
}
