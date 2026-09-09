import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthProvider';
import styles from './AuthBody.module.css';

export function ProviderButtons() {
  const { api, providers } = useAuth();
  const google = providers.find((provider) => provider.name === 'google');
  const available = google?.enabled === true;
  return (
    <div className={styles.providerGroup}>
      <p className={styles.providerLabel}>Hoặc tiếp tục với</p>
      <Button
        className={styles.providerButton}
        variant='quiet'
        fullWidth
        disabled={!available}
        onClick={() => {
          if (available) window.location.assign(api.getOAuthStartUrl('google'));
        }}
      >
        <span>Google</span>
        {!available ? <small>Chưa khả dụng</small> : null}
      </Button>
    </div>
  );
}
