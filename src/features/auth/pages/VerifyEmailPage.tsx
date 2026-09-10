import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function VerifyEmailPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [state, setState] = useState<'checking' | 'verified' | 'invalid' | 'idle'>(token ? 'checking' : 'idle');
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
      eyebrow='Email verification flow'
      title={state === 'verified' ? 'Email đã được xác minh' : 'Xác thực địa chỉ email để tiếp tục'}
      description='Một liên kết xác nhận bảo mật đã được gửi tới hòm thư của bạn. Vui lòng kiểm tra hộp thư đến và thư mục Spam nếu cần để kích hoạt toàn bộ tính năng trao đổi ngôn ngữ.'
      editorialEyebrow='Bảo vệ tài khoản'
      editorialTitle='Tin cậy bắt đầu từ điều rõ ràng'
      editorialDescription='Xác minh email giúp bảo vệ tài khoản và mở khóa những cuộc gặp gỡ đầu tiên trong cộng đồng.'
      editorialItems={[
        { icon: 'lock', title: 'Liên kết chỉ dùng một lần', description: 'Liên kết xác minh có thời hạn để bảo vệ dữ liệu trao đổi của bạn.' },
        { icon: 'check-circle', title: 'Minh bạch và an toàn', description: 'Email hiển thị trong giao diện luôn được che chắn khi cần thiết.' },
        { icon: 'circle-help', title: 'Luôn có hỗ trợ', description: 'Bạn có thể gửi lại email hoặc quay lại đăng nhập bất cứ lúc nào.' },
      ]}
      editorialPrompt={<p>Đã xác minh? <Link className={formStyles.textLink} to='/login'>Đi tới đăng nhập →</Link></p>}
      mobileReassuranceTitle='Bảo vệ quyền riêng tư'
      mobileReassuranceText='Liên kết xác thực chỉ có hiệu lực trong 24 giờ và chỉ được sử dụng một lần.'
    >
      <div className={flowStyles.authState}>
        {state === 'checking' ? <p className={feedbackStyles.statusMessage} role='status'>Đang kiểm tra liên kết xác minh…</p> : null}
        {state !== 'checking' && state !== 'verified' && email ? (
          <div className={flowStyles.maskedEmail}>
            <span>Địa chỉ nhận liên kết</span>
            <strong>{maskEmail(email)}</strong>
          </div>
        ) : null}
        {message && state !== 'checking' ? (
          <p className={state === 'verified' ? feedbackStyles.statusMessage : feedbackStyles.errorMessage} role={state === 'verified' ? 'status' : 'alert'}>{message}</p>
        ) : null}
        {state === 'verified' ? (
          <Link className={formStyles.textLink} to='/login'>Đi tới đăng nhập</Link>
        ) : (
          <form ref={formRef} className={formStyles.authForm} onSubmit={resend} noValidate>
            <TextInput
              label='Địa chỉ email nhận liên kết'
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              placeholder='nguoidung@vidu.vn'
              hint='Liên kết xác minh có hiệu lực trong 24 giờ và chỉ dùng một lần.'
              required
            />
            <Button type='submit' variant='secondary' fullWidth loading={loading}>Gửi lại email xác minh →</Button>
            <Link className={formStyles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
