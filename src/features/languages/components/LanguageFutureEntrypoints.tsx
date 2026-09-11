import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import type { HubSectionAvailability, HubSectionKey } from '../languages.types';
import styles from './LanguageFutureEntrypoints.module.css';

interface LanguageFutureEntrypointsProps {
  languageName: string;
  sections: readonly HubSectionAvailability[];
}

type FutureSectionKey = Extract<HubSectionKey, 'community' | 'questions' | 'practice' | 'exchange'>;

interface FutureEntrypointDefinition {
  key: FutureSectionKey;
  label: string;
  description: string;
  icon: IconName;
}

const futureEntrypointDefinitions: readonly FutureEntrypointDefinition[] = [
  {
    key: 'community',
    label: 'Cộng đồng',
    description: 'Gặp gỡ người học và người đóng góp khi không gian trao đổi đã sẵn sàng.',
    icon: 'users',
  },
  {
    key: 'questions',
    label: 'Hỏi đáp và sửa lỗi',
    description: 'Đặt câu hỏi, chia sẻ cách dùng và cùng làm rõ những điểm còn chưa chắc chắn.',
    icon: 'circle-help',
  },
  {
    key: 'practice',
    label: 'Luyện tập',
    description: 'Ôn lại điều đã học bằng những hoạt động dựa trên tài nguyên đã được kiểm duyệt.',
    icon: 'check-circle',
  },
  {
    key: 'exchange',
    label: 'Trao đổi',
    description: 'Chia sẻ ngữ cảnh, kinh nghiệm và góc nhìn giữa các thành viên của cộng đồng.',
    icon: 'arrow-left-right',
  },
];

const disabledCapability: HubSectionAvailability = {
  key: 'overview',
  status: 'DISABLED',
  isNavigable: false,
  href: null,
};

export function LanguageFutureEntrypoints({ languageName, sections }: LanguageFutureEntrypointsProps) {
  return (
    <section className={styles.surface} aria-labelledby='future-entrypoints-heading'>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CÁC KHÔNG GIAN TIẾP THEO</p>
          <h2 id='future-entrypoints-heading'>Không gian tương lai cho {languageName}</h2>
          <p className={styles.lead}>Các không gian này chỉ mở khi capability từ hệ thống và đường dẫn tương ứng đã sẵn sàng.</p>
        </div>
        <span className={styles.truthNote}>Không mở trước dữ liệu</span>
      </div>

      <div className={styles.grid}>
        {futureEntrypointDefinitions.map((definition) => {
          const capability = getCapability(sections, definition.key);
          const href = getSafeNavigableHref(capability);
          const contents = (
            <>
              <span className={styles.icon} aria-hidden='true'><Icon name={definition.icon} size={20} /></span>
              <span className={styles.copy}>
                <span className={styles.label}>{definition.label}</span>
                <span className={styles.description}>{definition.description}</span>
              </span>
              <span className={styles.status}>{getStatusLabel(capability, href !== null)}</span>
            </>
          );

          return (
            <div className={styles.item} key={definition.key}>
              {href ? <Link className={styles.entryLink} to={href}>{contents}</Link> : <div className={styles.entryDisabled} aria-disabled='true'>{contents}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getCapability(sections: readonly HubSectionAvailability[], key: FutureSectionKey): HubSectionAvailability {
  return sections.find((section) => section.key === key) ?? { ...disabledCapability, key };
}

function getSafeNavigableHref(capability: HubSectionAvailability): string | null {
  if (capability.status !== 'AVAILABLE' || !capability.isNavigable) return null;
  const href = capability.href;
  return href && href.startsWith('/') && !href.startsWith('//') ? href : null;
}

function getStatusLabel(capability: HubSectionAvailability, isNavigable: boolean): string {
  if (isNavigable) return 'Đang mở';
  if (capability.status === 'AVAILABLE' || capability.status === 'EMPTY') return 'Chưa có đường dẫn';
  if (capability.status === 'NOT_IMPLEMENTED') return 'Chưa sẵn sàng';
  return 'Tạm tắt';
}
