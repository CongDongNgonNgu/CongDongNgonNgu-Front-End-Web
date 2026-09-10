import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon/Icon";
import { TextInput } from "../../../components/ui/FormControls/TextInput";
import { authErrorMessage } from "../auth-errors";
import { AuthBody } from "../AuthBody";
import { PasswordField } from "../PasswordField";
import { ProviderButtons } from "../ProviderButtons";
import { useAuth } from "../AuthProvider";
import styles from "../AuthBody.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focusInput(index: number): void {
    formRef.current
      ?.querySelectorAll<HTMLInputElement>("input")
      [index]?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (displayName.trim().length < 2) {
      setError("Tên hiển thị cần có ít nhất 2 ký tự.");
      focusInput(0);
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Vui lòng nhập email hợp lệ.");
      focusInput(1);
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần có ít nhất 8 ký tự.");
      focusInput(2);
      return;
    }
    if (password !== confirmation) {
      setError("Hai mật khẩu chưa khớp.");
      focusInput(3);
      return;
    }
    if (!consent) {
      setError(
        "Vui lòng đọc và đồng ý với Quy tắc cộng đồng và Chính sách bảo mật trước khi tiếp tục.",
      );
      formRef.current
        ?.querySelector<HTMLInputElement>("input[type=checkbox]")
        ?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(
        "/verify-email?email=" + encodeURIComponent(email.trim().toLowerCase()),
        { replace: true },
      );
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      variant="register"
      eyebrow="Tham gia cùng chúng tôi"
      title="Đăng ký tài khoản"
      description="Gia nhập cộng đồng người học và chia sẻ ngôn ngữ mở hoàn toàn miễn phí."
      editorialEyebrow="Tham gia cùng chúng tôi"
      editorialTitle="Cùng nhau học hỏi, lưu giữ và lan tỏa ngôn ngữ"
      editorialDescription="Tạo tài khoản miễn phí để tham gia trao đổi kiến thức, luyện tập giao tiếp thực tế và chung tay xây dựng thư viện ngôn ngữ mở cùng cộng đồng người học khắp thế giới."
      editorialItems={[
        {
          icon: "users",
          title: "Học tập nhân văn & thực chất",
          description:
            "Không gian cởi mở kết nối người học và người chia sẻ kinh nghiệm ngôn ngữ từ nhiều nền văn hóa.",
        },
        {
          icon: "book-open",
          title: "Đóng góp tri thức chung",
          description:
            "Mọi từ vựng, ngữ cảnh ví dụ và ghi chú sửa lỗi đều được xây dựng minh bạch vì lợi ích cộng đồng.",
        },
        {
          icon: "check-circle",
          title: "Tôn trọng & bình đẳng",
          description:
            "Cam kết bảo vệ một môi trường giao tiếp an toàn, thấu hiểu và tôn trọng sự đa dạng ngôn ngữ.",
        },
      ]}
      editorialPrompt={
        <p>
          Đã có tài khoản?{" "}
          <Link className={styles.textLink} to="/login">
            Đăng nhập ngay →
          </Link>
        </p>
      }
      mobileReassuranceTitle="Tôn trọng & bảo mật quyền riêng tư"
      mobileReassuranceText="Chúng tôi không bao giờ bán dữ liệu hay gửi thư rác. Mọi đóng góp tri thức ngôn ngữ của bạn đều vì mục đích chung của cộng đồng."
    >
      <form
        ref={formRef}
        className={styles.authForm}
        onSubmit={submit}
        noValidate
        aria-describedby={error ? "register-error" : undefined}
      >
        {error ? (
          <p className={styles.errorMessage} id="register-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.authInfo} role="status" aria-live="polite">
          <Icon name="info" size={20} aria-hidden="true" />
          <span className={styles.authInfoCopy}>
            <strong>Lưu ý xác thực hòm thư</strong>
            <span>
              Sau khi hoàn tất, hệ thống sẽ gửi liên kết xác nhận kích hoạt tài
              khoản về hộp thư của bạn.
            </span>
          </span>
        </div>
        <TextInput
          label="Tên hiển thị công khai"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="name"
          placeholder="Ví dụ: Minh Tuấn hoặc Lan Anh"
          hint="Tên này sẽ xuất hiện khi bạn thảo luận, đặt câu hỏi và đóng góp vào thư viện."
          required
        />
        <TextInput
          label="Địa chỉ email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="nguoidung@vidu.vn"
          hint="Dùng để đăng nhập, bảo mật tài khoản và nhận xác nhận kích hoạt."
          required
        />
        <PasswordField
          label="Mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự an toàn"
          hint={
            <span className={styles.passwordHintCard}>
              <strong>Quy chuẩn mật khẩu dễ nhớ &amp; an toàn:</strong>
              <span>Tối thiểu 8 ký tự bất kỳ.</span>
              <span>
                Nên kết hợp chữ cái và số để bảo vệ quyền riêng tư tốt hơn.
              </span>
            </span>
          }
          required
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          placeholder="Nhập lại chính xác mật khẩu trên"
          required
        />
        <label className={styles.authConsent}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          <span>
            Tôi đã đọc và đồng ý với{" "}
            <a className={styles.textLink} href="#rules">
              Quy tắc cộng đồng
            </a>{" "}
            và{" "}
            <a className={styles.textLink} href="#privacy">
              Chính sách bảo mật
            </a>{" "}
            của CongDongNgonNgu.vn.
          </span>
        </label>
        <div className={styles.formActions}>
          <Button type="submit" variant="secondary" fullWidth loading={loading}>
            Tạo tài khoản thành viên →
          </Button>
          <ProviderButtons mode="register" />
        </div>
        <div className={styles.authLinks}>
          <span>Đã là thành viên?</span>
          <Link className={styles.textLink} to="/login">
            Đăng nhập ngay
          </Link>
        </div>
      </form>
    </AuthBody>
  );
}
