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

export function RegisterPage() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focusInput(index: number): void {
    formRef.current?.querySelectorAll<HTMLInputElement>('input')[index]?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (displayName.trim().length < 2) {
      setError('Tên hiển thị cần có ít nhất 2 ký tự.');
      focusInput(0);
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Vui lòng nhập email hợp lệ.');
      focusInput(1);
      return;
    }
    if (password.length < 12) {
      setError('Mật khẩu cần có ít nhất 12 ký tự.');
      focusInput(2);
      return;
    }
    if (password !== confirmation) {
      setError('Hai mật khẩu chưa khớp.');
      focusInput(3);
      return;
    }
    setLoading(true);
    try {
      await api.register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate('/verify-email?email=' + encodeURIComponent(email.trim().toLowerCase()), { replace: true });
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow='Tạo tài khoản / 02'
      title='Bắt đầu từ một lời chào.'
      description='Một không gian nhẹ nhàng để học cùng nhau, chia sẻ cách nói và tìm người đồng hành.'
      asideTitle='Ngôn ngữ lớn lên qua gặp gỡ'
      asideText='Mỗi tài khoản mới là một giọng nói thêm vào bản đồ cộng đồng.'
    >
      <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'register-error' : undefined}>
        {error ? <p className={styles.errorMessage} id='register-error' role='alert'>{error}</p> : null}
        <TextInput
          label='Tên hiển thị'
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete='name'
          required
        />
        <TextInput
          label='Email'
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete='email'
          inputMode='email'
          required
        />
        <PasswordField
          label='Mật khẩu'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='new-password'
          required
        />
        <PasswordField
          label='Nhập lại mật khẩu'
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete='new-password'
          required
        />
        <div className={styles.formActions}>
          <Button type='submit' fullWidth loading={loading}>Tạo tài khoản</Button>
          <ProviderButtons />
        </div>
        <div className={styles.authLinks}>
          <span>Đã có tài khoản?</span>
          <Link className={styles.textLink} to='/login'>Đăng nhập</Link>
        </div>
      </form>
    </AuthBody>
  );
}
