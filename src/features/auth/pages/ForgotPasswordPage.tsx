import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import { RecoveryStatusRail } from '../RecoveryStatusRail';
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
      eyebrow='Bảo mật tài khoản'
      title='Khôi phục mật khẩu'
      description='Nhập địa chỉ email liên kết với tài khoản của bạn để nhận liên kết khôi phục.'
      editorialEyebrow='Bảo mật tài khoản'
      editorialTitle='Bảo vệ tài khoản và hành trình học tập của bạn'
      editorialDescription='Hệ thống khôi phục tài khoản được thiết kế theo chuẩn bảo mật đa tầng, bảo vệ hồ sơ học tập và dữ liệu trao đổi ngôn ngữ của bạn một cách tuyệt đối.'
      editorialItems={[
        { icon: 'lock', title: 'Bảo mật không tiết lộ danh tính', description: 'Chúng tôi luôn giữ email và thông tin học tập của bạn riêng tư.' },
        { icon: 'check-circle', title: 'Liên kết giới hạn thời gian', description: 'Liên kết khôi phục chỉ có hiệu lực trong thời gian ngắn và chỉ dùng một lần.' },
        { icon: 'circle-help', title: 'Hỗ trợ thân thiện', description: 'Nếu không nhận được thư, hãy kiểm tra hộp thư rác hoặc liên hệ đội ngũ cộng đồng.' },
      ]}
      editorialPrompt={<p>Nhớ mật khẩu? <Link className={styles.textLink} to='/login'>Quay lại đăng nhập →</Link></p>}
      recoveryRail={<RecoveryStatusRail activeStep={sent ? 2 : 1} />}
      mobileReassuranceTitle='Bảo vệ quyền riêng tư'
      mobileReassuranceText='CongDongNgonNgu.vn không bao giờ yêu cầu bạn cung cấp mật khẩu qua điện thoại, tin nhắn SMS hoặc biểu mẫu ngoài hệ thống.'
    >
      <div className={styles.authState}>
        {sent ? (
          <>
            <span className={styles.flowIcon} aria-hidden='true'>✓</span>
            <h3 className={styles.flowStateTitle}>Kiểm tra hòm thư của bạn</h3>
            <p className={styles.statusMessage} role='status'>Nếu địa chỉ email tồn tại trên hệ thống, một liên kết khôi phục an toàn đã được gửi đến hộp thư của bạn.</p>
            <div className={styles.flowNotice}>
              <strong>Chưa thấy email?</strong>
              <span>Vui lòng kiểm tra thư mục Spam/Quảng cáo hoặc hòm thư lọc tự động trước khi gửi lại.</span>
            </div>
            <Button type='button' variant='quiet' fullWidth disabled>Gửi lại liên kết ngay</Button>
            <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </>
        ) : (
          <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'forgot-error' : undefined}>
            {error ? <p className={styles.errorMessage} id='forgot-error' role='alert'>{error}</p> : null}
            <TextInput
              label='Địa chỉ email liên kết'
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              placeholder='nguoidung@vidu.vn'
              hint='Chúng tôi sẽ gửi một liên kết bảo mật có thời hạn 30 phút đến hòm thư này.'
              required
            />
            <div className={styles.formActions}>
              <Button type='submit' variant='secondary' fullWidth loading={loading}>Gửi liên kết khôi phục →</Button>
              <Link className={styles.textLink} to='/login'>Tôi nhớ mật khẩu rồi</Link>
            </div>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
