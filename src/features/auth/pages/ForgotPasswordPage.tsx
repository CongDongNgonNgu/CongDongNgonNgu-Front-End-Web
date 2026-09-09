import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import styles from '../AuthBody.module.css';

export function ForgotPasswordPage() {
  const { api } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!email.includes('@') || !email.includes('.')) {
      setError('Vui lòng nhập email hợp lệ.');
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow='Khôi phục / 03'
      title='Mở lại cánh cửa.'
      description='Nhập email đã dùng để đăng ký. Nếu có tài khoản phù hợp, chúng tôi sẽ gửi hướng dẫn an toàn.'
      asideTitle='Không cần nhớ mọi thứ'
      asideText='Bạn luôn có thể bắt đầu lại, với một liên kết chỉ dùng một lần và có thời hạn.'
    >
      <div className={styles.authState}>
        {sent ? (
          <>
            <p className={styles.statusMessage} role='status'>
              Nếu email này có tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi. Hãy kiểm tra cả thư rác.
            </p>
            <div className={styles.authLinks}>
              <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
              <Link className={styles.textLink} to='/'>Về trang chủ</Link>
            </div>
          </>
        ) : (
          <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'forgot-error' : undefined}>
            {error ? <p className={styles.errorMessage} id='forgot-error' role='alert'>{error}</p> : null}
            <TextInput
              label='Email'
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              required
            />
            <div className={styles.formActions}>
              <Button type='submit' fullWidth loading={loading}>Gửi hướng dẫn</Button>
              <Link className={styles.textLink} to='/login'>Tôi nhớ mật khẩu rồi</Link>
            </div>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
