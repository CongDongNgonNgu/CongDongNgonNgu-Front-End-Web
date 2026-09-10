import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthProvider';
import styles from './ProviderButtons.module.css';

interface ProviderButtonsProps {
  mode?: 'login' | 'register';
}

export function ProviderButtons({ mode = 'login' }: ProviderButtonsProps) {
  const { api, providers } = useAuth();
  const google = providers.find((provider) => provider.name === 'google');
  const available = google?.enabled === true;
  return (
    <div className={styles.providerGroup}>
      <div className={styles.divider} role='presentation'>
        <span>{mode === 'register' ? 'Hoặc đăng ký bằng' : 'Hoặc đăng nhập bằng'}</span>
      </div>
      <Button
        className={styles.providerButton}
        variant='quiet'
        fullWidth
        disabled={!available}
        onClick={() => {
          if (available) window.location.assign(api.getOAuthStartUrl('google'));
        }}
      >
        <span className={styles.providerButtonContent}>
          <span className={styles.googleMark} aria-hidden='true'>G</span>
          <span>Tiếp tục với Google</span>
          {!available ? <small className={styles.srOnly}>Chưa khả dụng</small> : null}
        </span>
      </Button>
    </div>
  );
}
