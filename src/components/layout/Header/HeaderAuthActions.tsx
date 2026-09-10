import { Link } from 'react-router-dom';
import { runLogout } from './header.utils';
import styles from './HeaderAuthActions.module.css';

export function HeaderAuthActions({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout?: () => Promise<void> | void }) {
  if (isAuthenticated) {
    return <button className={styles.headerAuthLink} type='button' onClick={() => runLogout(onLogout)}>Đăng xuất</button>;
  }
  return (
    <div className={styles.headerAuthLinks}>
      <Link className={styles.headerAuthLink} to='/login'>Đăng nhập</Link>
      <Link className={styles.headerAuthLinkPrimary} to='/register'>Đăng ký</Link>
    </div>
  );
}
