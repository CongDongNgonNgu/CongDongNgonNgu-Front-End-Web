import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { useAuth } from '../AuthProvider';
import styles from '../AuthBody.module.css';

export function ResetPasswordPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(token ? '' : 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError('');
    if (password.length < 12) {
      setError('Mật khẩu cần có ít nhất 12 ký tự.');
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    if (password !== confirmation) {
      setError('Hai mật khẩu chưa khớp.');
      formRef.current?.querySelectorAll<HTMLInputElement>('input')[1]?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setComplete(true);
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow='Mật khẩu mới / 05'
      title={complete ? 'Đã đổi mật khẩu.' : 'Chọn một mật khẩu mới.'}
      description={complete ? 'Các phiên đăng nhập cũ đã được đóng để bảo vệ tài khoản của bạn.' : 'Hãy chọn một mật khẩu dài, dễ nhớ với bạn và khó đoán với người khác.'}
      asideTitle='Bảo vệ những điều bạn đã học'
      asideText='Sau khi đổi mật khẩu, mọi phiên đăng nhập cũ sẽ cần xác thực lại.'
    >
      <div className={styles.authState}>
        {complete ? (
          <>
            <p className={styles.statusMessage} role='status'>Mật khẩu đã được cập nhật thành công.</p>
            <Link className={styles.textLink} to='/login'>Đăng nhập bằng mật khẩu mới</Link>
          </>
        ) : (
          <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'reset-error' : undefined}>
            {error ? <p className={styles.errorMessage} id='reset-error' role='alert'>{error}</p> : null}
            <PasswordField
              label='Mật khẩu mới'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='new-password'
              required
            />
            <PasswordField
              label='Nhập lại mật khẩu mới'
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete='new-password'
              required
            />
            <Button type='submit' fullWidth loading={loading} disabled={!token}>Cập nhật mật khẩu</Button>
            <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
