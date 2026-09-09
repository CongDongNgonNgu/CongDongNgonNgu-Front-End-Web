import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import styles from '../AuthBody.module.css';

export function VerifyEmailPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [state, setState] = useState<'checking' | 'verified' | 'invalid' | 'idle'>(
    token ? 'checking' : 'idle',
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const attemptedToken = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;
    void api.verifyEmail(token)
      .then(() => {
        setState('verified');
        setMessage('Email đã được xác minh. Bạn có thể đăng nhập ngay bây giờ.');
      })
      .catch((reason) => {
        setState('invalid');
        setMessage(authErrorMessage(reason));
      });
  }, [api, token]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!email.includes('@') || !email.includes('.')) {
      setMessage('Vui lòng nhập email hợp lệ.');
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.resendVerification(email.trim().toLowerCase());
      setMessage('Nếu tài khoản phù hợp, email xác minh mới sẽ được gửi tới bạn.');
    } catch (reason) {
      setMessage(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow='Xác minh email / 04'
      title={state === 'verified' ? 'Bạn đã sẵn sàng.' : 'Thêm một bước nhỏ.'}
      description='Xác minh email giúp bảo vệ tài khoản và mở khóa những cuộc gặp gỡ đầu tiên trong cộng đồng.'
      asideTitle='Tin cậy bắt đầu từ điều rõ ràng'
      asideText='Liên kết xác minh chỉ dùng một lần, hết hạn sau một khoảng thời gian ngắn.'
    >
      <div className={styles.authState}>
        {state === 'checking' ? <p className={styles.statusMessage} role='status'>Đang kiểm tra liên kết xác minh…</p> : null}
        {message && state !== 'checking' ? (
          <p className={state === 'verified' ? styles.statusMessage : styles.errorMessage} role={state === 'verified' ? 'status' : 'alert'}>
            {message}
          </p>
        ) : null}
        {state === 'verified' ? (
          <Link className={styles.textLink} to='/login'>Đi tới đăng nhập</Link>
        ) : (
          <form ref={formRef} className={styles.authForm} onSubmit={resend} noValidate>
            <TextInput
              label='Email đăng ký'
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              required
            />
            <Button type='submit' fullWidth loading={loading}>Gửi lại email xác minh</Button>
            <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
