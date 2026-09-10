import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

const recoveryStatuses = new Set(['error', 'provider-disabled', 'session-expired', 'expired', 'collision', 'oauth-collision', 'linking']);

const recoveryCopy: Record<string, { eyebrow: string; title: string; description: string; message: string }> = {
  error: {
    eyebrow: 'Đăng nhập không hoàn tất',
    title: 'Chưa thể hoàn tất.',
    description: 'Bạn có thể quay lại và thử đăng nhập bằng email hoặc một phương thức khác.',
    message: 'Phương thức đăng nhập này chưa hoàn tất. Vui lòng quay lại đăng nhập để tiếp tục.',
  },
  'provider-disabled': {
    eyebrow: 'Nhà cung cấp chưa sẵn sàng',
    title: 'Phương thức chưa khả dụng',
    description: 'Đăng nhập bằng nhà cung cấp này hiện chưa sẵn sàng. Tài khoản và dữ liệu của bạn vẫn được bảo vệ.',
    message: 'Vui lòng chọn đăng nhập bằng email và mật khẩu hoặc thử lại sau.',
  },
  'session-expired': {
    eyebrow: 'Session timeout re-auth',
    title: 'Phiên làm việc đã hết hạn',
    description: 'Vì lý do an toàn cho dữ liệu học tập và bảo mật tài khoản, phiên làm việc của bạn đã tự động kết thúc sau một khoảng thời gian không tương tác.',
    message: 'Bài làm và văn bản đang dịch được giữ nguyên. Hãy đăng nhập lại để tiếp tục.',
  },
  expired: {
    eyebrow: 'Session timeout re-auth',
    title: 'Phiên làm việc đã hết hạn',
    description: 'Vì lý do an toàn cho dữ liệu học tập và bảo mật tài khoản, phiên làm việc của bạn đã tự động kết thúc sau một khoảng thời gian không tương tác.',
    message: 'Bài làm và văn bản đang dịch được giữ nguyên. Hãy đăng nhập lại để tiếp tục.',
  },
  collision: {
    eyebrow: 'OAuth collision recovery',
    title: 'Không thể liên kết tài khoản',
    description: 'Để bảo vệ quyền riêng tư, chúng tôi không thể hoàn tất liên kết tự động giữa hai phương thức đăng nhập.',
    message: 'Hãy đăng nhập bằng email và mật khẩu đã thiết lập trước đó, sau đó thử liên kết lại từ trang tài khoản.',
  },
  'oauth-collision': {
    eyebrow: 'OAuth collision recovery',
    title: 'Không thể liên kết tài khoản',
    description: 'Để bảo vệ quyền riêng tư, chúng tôi không thể hoàn tất liên kết tự động giữa hai phương thức đăng nhập.',
    message: 'Hãy đăng nhập bằng email và mật khẩu đã thiết lập trước đó, sau đó thử liên kết lại từ trang tài khoản.',
  },
  linking: {
    eyebrow: 'Account linking recovery',
    title: 'Không thể liên kết tài khoản',
    description: 'Để bảo vệ quyền riêng tư, chúng tôi không thể hoàn tất liên kết tự động giữa hai phương thức đăng nhập.',
    message: 'Hãy đăng nhập bằng email và mật khẩu đã thiết lập trước đó, sau đó thử liên kết lại từ trang tài khoản.',
  },
};

export function AuthCallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const [error, setError] = useState('');
  const attempted = useRef(false);
  const isRecoveryError = recoveryStatuses.has(status ?? '');
  const copy = recoveryCopy[status ?? ''] ?? recoveryCopy.error;

  useEffect(() => {
    if (attempted.current || isRecoveryError) return;
    attempted.current = true;
    void refresh()
      .then(() => navigate('/', { replace: true }))
      .catch((reason) => setError(authErrorMessage(reason)));
  }, [isRecoveryError, navigate, refresh]);

  const hasError = isRecoveryError || Boolean(error);

  return (
    <AuthBody
      eyebrow={hasError ? copy.eyebrow : 'Đăng nhập / 06'}
      title={hasError ? copy.title : 'Đang mở không gian của bạn.'}
      description={hasError ? copy.description : 'Chúng tôi đang kiểm tra phiên đăng nhập an toàn.'}
      editorialEyebrow={hasError ? copy.eyebrow : 'Không gian học tập an toàn'}
      editorialTitle={hasError ? 'Lấy lại quyền kiểm soát tài khoản' : 'Đang mở không gian của bạn'}
      editorialDescription='Mỗi bước xác thực đều được xử lý minh bạch để bảo vệ dữ liệu học tập và những đóng góp ngôn ngữ của cộng đồng.'
      editorialItems={[
        { icon: 'lock', title: 'Bảo vệ dữ liệu cá nhân', description: 'Không tiết lộ thông tin nhạy cảm trong thông báo lỗi.' },
        { icon: 'check-circle', title: 'Tiếp tục an toàn', description: 'Bạn luôn có thể quay lại đăng nhập bằng một phương thức khác.' },
        { icon: 'circle-help', title: 'Cần hỗ trợ?', description: 'Đội ngũ cộng đồng sẵn sàng hướng dẫn bạn khôi phục quyền truy cập.' },
      ]}
      editorialPrompt={<p><Link className={formStyles.textLink} to='/login'>Quay lại đăng nhập →</Link></p>}
      mobileReassuranceTitle='An toàn phiên đăng nhập'
      mobileReassuranceText='Chúng tôi không hiển thị chi tiết nhạy cảm trong thông báo xác thực để bảo vệ quyền riêng tư của bạn.'
    >
      {hasError ? (
        <div className={flowStyles.authState}>
          <div className={flowStyles.flowErrorCard} role='alert'>
            <strong>{copy.title}</strong>
            <span>{error || copy.message}</span>
          </div>
          <Link className={flowStyles.flowButton} to='/login'>Quay lại đăng nhập →</Link>
        </div>
      ) : (
        <p className={feedbackStyles.statusMessage} role='status'>Đang xác nhận…</p>
      )}
    </AuthBody>
  );
}
