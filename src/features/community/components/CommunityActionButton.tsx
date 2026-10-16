import type { ComponentProps } from 'react';
import { Button } from '../../../components/ui/Button';
import styles from './CommunityActionButton.module.css';

export function CommunityActionButton({ className = '', ...props }: ComponentProps<typeof Button>) {
  return <Button data-community-action variant='quiet' size='sm' {...props} className={styles.action + ' ' + className} />;
}
