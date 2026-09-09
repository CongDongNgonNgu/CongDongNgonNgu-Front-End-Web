import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { useAuth } from '../AuthProvider';
import { RecoveryStatusRail } from '../RecoveryStatusRail';
import styles from '../AuthBody.module.css';

export function ResetPasswordPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [complete, setComplete] = useState(searchParams.get('complete') === '1');
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
      eyebrow={complete ? 'Hoàn tất khôi phục' : token ? 'Tạo mật khẩu mới' : 'Liên kết khôi phục'}
      title={complete ? 'Đặt lại mật khẩu thành công!' : token ? 'Tạo mật khẩu mới' : 'Liên kết đã hết hạn hoặc không hợp lệ'}
      description={complete ? 'Mật khẩu mới của bạn đã được lưu an toàn. Bạn có thể đăng nhập ngay bây giờ.' : token ? 'Mật khẩu mới của bạn cần đáp ứng các tiêu chuẩn bảo mật để bảo vệ tài khoản trao đổi ngôn ngữ.' : 'Vì lý do an ninh, liên kết khôi phục chỉ có giá trị sử dụng một lần trong vòng 15 phút.'}
      editorialEyebrow='Bảo mật tài khoản'
      editorialTitle='Bảo vệ những điều bạn đã học'
      editorialDescription='Mọi bước khôi phục đều được thiết kế để bảo vệ hồ sơ học tập và dữ liệu trao đổi ngôn ngữ của bạn.'
      editorialItems={[
        { icon: 'lock', title: 'Liên kết dùng một lần', description: 'Liên kết khôi phục có thời hạn và không thể dùng lại sau khi hoàn tất.' },
        { icon: 'check-circle', title: 'Mật khẩu mạnh, dễ nhớ', description: 'Chọn một cụm từ riêng tư, dài và khó đoán với người khác.' },
        { icon: 'circle-help', title: 'Luôn có hỗ trợ', description: 'Bạn có thể quay lại đăng nhập hoặc gửi yêu cầu khôi phục mới bất cứ lúc nào.' },
      ]}
      editorialPrompt={<p>Đã nhớ mật khẩu? <Link className={styles.textLink} to='/login'>Quay lại đăng nhập →</Link></p>}
      recoveryRail={<RecoveryStatusRail activeStep={complete ? 5 : token ? 3 : 4} />}
      mobileReassuranceTitle='Bảo vệ quyền riêng tư'
      mobileReassuranceText='CongDongNgonNgu.vn không bao giờ yêu cầu bạn cung cấp mật khẩu qua điện thoại, tin nhắn SMS hoặc biểu mẫu ngoài hệ thống.'
    >
      <div className={styles.authState}>
        {complete ? (
          <>
            <span className={styles.flowIcon} aria-hidden='true'>✓</span>
            <h3 className={styles.flowStateTitle}>Mật khẩu đã được cập nhật thành công.</h3>
            <p className={styles.statusMessage} role='status'>Tất cả phiên đăng nhập trên thiết bị lạ đã được đăng xuất tự động.</p>
            <Link className={styles.textLink} to='/login'>Đăng nhập bằng mật khẩu mới</Link>
          </>
        ) : !token ? (
          <>
            <div className={styles.flowErrorCard} role='alert'>
              <strong>Liên kết đã hết hạn hoặc không hợp lệ</strong>
              <span>Vui lòng gửi lại yêu cầu khôi phục mới để tiếp tục.</span>
            </div>
            <Link className={styles.flowButton} to='/forgot-password'>Yêu cầu liên kết mới →</Link>
            <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </>
        ) : (
          <form ref={formRef} className={styles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'reset-error' : undefined}>
            {error ? <p className={styles.errorMessage} id='reset-error' role='alert'>{error}</p> : null}
            <PasswordField
              label='Mật khẩu mới'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='new-password'
              placeholder='Nhập mật khẩu mới'
              hint={(
                <span className={styles.passwordHintCard}>
                  <strong>Tiêu chuẩn mật khẩu dễ nhớ &amp; an toàn:</strong>
                  <span>Tối thiểu 8 ký tự bất kỳ.</span>
                  <span>Nên kết hợp chữ cái và số để bảo vệ quyền riêng tư tốt hơn.</span>
                </span>
              )}
              required
            />
            <PasswordField
              label='Xác nhận mật khẩu mới'
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete='new-password'
              placeholder='Nhập lại mật khẩu mới'
              required
            />
            <Button type='submit' variant='secondary' fullWidth loading={loading}>Lưu mật khẩu mới và tiếp tục →</Button>
            <Link className={styles.textLink} to='/login'>Quay lại đăng nhập</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
