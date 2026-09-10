import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { ProviderButtons } from '../ProviderButtons';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
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
      variant='login'
      eyebrow='Chào mừng trở lại'
      title='Đăng nhập'
      description='Nhập thông tin tài khoản của bạn để truy cập không gian học tập.'
      editorialEyebrow='Chào mừng trở lại'
      editorialTitle='Tiếp tục hành trình kết nối ngôn ngữ'
      editorialDescription='Đăng nhập để tham gia trao đổi kiến thức, luyện tập giao tiếp thực tế và đóng góp vào thư viện ngôn ngữ mở cùng các thành viên khắp nơi trên thế giới.'
      editorialItems={[
        { icon: 'users', title: 'Học tập cùng con người thực', description: 'Không gian an toàn để đặt câu hỏi, nhận sửa lỗi tỉ mỉ từ người bản xứ và người học giàu kinh nghiệm.' },
        { icon: 'book-open', title: 'Tài nguyên mở, vì cộng đồng', description: 'Mọi đóng góp về từ vựng, ngữ cảnh và câu thoại đều được lưu trữ minh bạch để hỗ trợ người đi sau.' },
        { icon: 'users', title: 'Tôn trọng và đồng cảm', description: 'Mỗi ngôn ngữ là một nhịp điệu riêng, kết nối dựa trên sự tò mò và thấu hiểu văn hóa.' },
      ]}
      editorialPrompt={<p>Chưa có tài khoản? <Link className={formStyles.textLink} to='/register'>Tham gia hoàn toàn miễn phí. Tạo tài khoản mới →</Link></p>}
    >
      <form ref={formRef} className={formStyles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        {error ? <p className={feedbackStyles.errorMessage} id='login-error' role='alert'>{error}</p> : null}
        <TextInput
          label='Địa chỉ email'
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete='email'
          inputMode='email'
          placeholder='ten@vidu.vn'
          hint='Email đã đăng ký tại CongDongNgonNgu.vn'
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
        <div className={formStyles.passwordLinks}>
          <Link className={formStyles.textLink} to='/forgot-password'>Quên mật khẩu?</Link>
        </div>
        <label className={formStyles.authConsent}>
          <input type='checkbox' checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span>Ghi nhớ đăng nhập trên thiết bị này</span>
        </label>
        <div className={formStyles.formActions}>
          <Button type='submit' variant='secondary' fullWidth loading={loading}>Đăng nhập vào tài khoản →</Button>
          <ProviderButtons mode='login' />
        </div>
        <div className={formStyles.authLinks}>
          <span>Bạn là thành viên mới?</span>
          <Link className={formStyles.textLink} to='/register'>Đăng ký tài khoản miễn phí</Link>
        </div>
        <p className={formStyles.legalNote}>Bằng việc đăng nhập, bạn đồng ý với <a className={formStyles.textLink} href='#rules'>Quy tắc cộng đồng</a> và <a className={formStyles.textLink} href='#privacy'>Chính sách bảo mật</a> của CongDongNgonNgu.vn.</p>
      </form>
    </AuthBody>
  );
}
