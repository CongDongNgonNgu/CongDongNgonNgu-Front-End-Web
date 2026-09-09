import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import styles from '../AuthBody.module.css';

export function AuthCallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const [error, setError] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || status === 'error') return;
    attempted.current = true;
    void refresh()
      .then(() => navigate('/', { replace: true }))
      .catch((reason) => setError(authErrorMessage(reason)));
  }, [navigate, refresh, status]);

  return (
    <AuthBody
      eyebrow='Đăng nhập / 06'
      title={error || status === 'error' ? 'Chưa thể hoàn tất.' : 'Đang mở không gian của bạn.'}
      description={error || status === 'error' ? 'Bạn có thể quay lại và thử đăng nhập bằng email hoặc một phương thức khác.' : 'Chúng tôi đang kiểm tra phiên đăng nhập an toàn.'}
    >
      {error || status === 'error' ? (
        <div className={styles.authState}>
          <p className={styles.errorMessage} role='alert'>{error || 'Phương thức đăng nhập này chưa hoàn tất.'}</p>
          <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
        </div>
      ) : (
        <p className={styles.statusMessage} role='status'>Đang xác nhận…</p>
      )}
    </AuthBody>
  );
}
