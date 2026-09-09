import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { ProviderButtons } from '../ProviderButtons';
import { useAuth } from '../AuthProvider';
import styles from '../AuthBody.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!email.includes('@') || !email.includes('.')) {
      setFieldError('Vui lòng nhập email hợp lệ.');
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    if (!password) {
      setFieldError('Vui lòng nhập mật khẩu.');
      formRef.current?.querySelector<HTMLInputElement>('[autocomplete=current-password]')?.focus();
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate('/', { replace: true });
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow='Đăng nhập / 01'
      title='Mừng bạn trở lại.'
      description='Tiếp tục những cuộc trò chuyện, bài học và kết nối ngôn ngữ đang chờ bạn.'
    >
      <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        {error ? <p className={styles.errorMessage} id='login-error' role='alert'>{error}</p> : null}
        <TextInput
          label='Email'
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete='email'
          inputMode='email'
          required
          error={fieldError && !email.includes('@') ? fieldError : undefined}
        />
        <PasswordField
          label='Mật khẩu'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='current-password'
          required
          error={fieldError && email.includes('@') && !password ? fieldError : undefined}
        />
        <div className={styles.authLinks}>
          <span>Chưa có tài khoản?</span>
          <Link className={styles.textLink} to='/register'>Tạo tài khoản</Link>
          <Link className={styles.textLink} to='/forgot-password'>Quên mật khẩu?</Link>
        </div>
        <div className={styles.formActions}>
          <Button type='submit' fullWidth loading={loading}>Đăng nhập</Button>
          <ProviderButtons />
        </div>
      </form>
    </AuthBody>
  );
}
