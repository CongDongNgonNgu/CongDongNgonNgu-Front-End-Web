import type { HTMLAttributes, ReactNode } from 'react';
import type { InstallSurface } from './pwa.utils';
import { usePwaExperience } from './usePwaExperience';
import styles from './PwaExperience.module.css';

interface PwaExperienceProps {
  online?: boolean;
  installSurface?: InstallSurface;
  updateReady?: boolean;
  onInstall?: () => Promise<void> | void;
  onUpdate?: () => void;
}

function Surface({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`${styles.surface} ${className}`} {...props}>
      {children}
    </section>
  );
}

export function PwaExperience({ online, installSurface, updateReady, onInstall, onUpdate }: PwaExperienceProps) {
  const pwa = usePwaExperience();
  const isOnline = online ?? pwa.online;
  const surface = installSurface ?? pwa.installSurface;
  const hasUpdate = updateReady ?? pwa.updateReady;
  const showInstall = isOnline && surface !== 'none' && surface !== 'installed';

  return (
    <div className={styles.stack} aria-label='Trạng thái ứng dụng'>
      {!isOnline && (
        <Surface role='status' aria-live='polite' className={styles.statusSurface}>
          <div>
            <strong>Đang ngoại tuyến</strong>
            <p>Đăng nhập, cộng đồng, AI và thanh toán cần kết nối mạng.</p>
          </div>
          <span className={styles.statusDot} aria-hidden='true' />
        </Surface>
      )}

      {hasUpdate && (
        <Surface role='status' aria-live='polite' className={styles.statusSurface}>
          <div>
            <strong>Phiên bản mới đã sẵn sàng</strong>
            <p>Cập nhật để tiếp tục với trải nghiệm mới nhất.</p>
          </div>
          <button className={styles.primaryAction} type='button' onClick={onUpdate ?? pwa.update}>
            Cập nhật ứng dụng
          </button>
        </Surface>
      )}

      {showInstall && (
        <Surface aria-label='Hướng dẫn cài đặt ứng dụng' className={styles.installSurface}>
          <div className={styles.installCopy}>
            <span className={styles.eyebrow}>Cộng đồng ngôn ngữ</span>
            {surface === 'ios-guide' ? (
              <>
                <strong>Thêm ứng dụng vào Màn hình chính</strong>
                <p>Trong Safari, chọn Chia sẻ rồi chọn Thêm vào Màn hình chính.</p>
              </>
            ) : (
              <>
                <strong>Cài ứng dụng để truy cập nhanh hơn</strong>
                <p>Gọn nhẹ, dễ mở lại và vẫn tôn trọng các vùng dữ liệu riêng tư.</p>
              </>
            )}
          </div>
          <div className={styles.actions}>
            {surface === 'browser-prompt' && (
              <button className={styles.primaryAction} type='button' onClick={onInstall ?? pwa.install}>
                Cài ứng dụng
              </button>
            )}
            <button className={styles.secondaryAction} type='button' onClick={pwa.dismissInstall}>
              Đóng hướng dẫn cài đặt
            </button>
          </div>
        </Surface>
      )}
    </div>
  );
}
