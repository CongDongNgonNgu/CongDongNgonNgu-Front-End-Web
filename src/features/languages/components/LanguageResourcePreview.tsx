import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import type {
  HubSectionAvailability,
  HubSectionKey,
  LanguageResourcePreviewItem,
  LanguageResourceType,
} from '../languages.types';
import styles from './LanguageResourcePreview.module.css';

interface LanguageResourcePreviewProps {
  languageName: string;
  sections: readonly HubSectionAvailability[];
  items?: readonly LanguageResourcePreviewItem[];
}

interface ResourceDefinition {
  key: LanguageResourceType;
  label: string;
  englishLabel: string;
  description: string;
  icon: IconName;
}

const resourceDefinitions: readonly ResourceDefinition[] = [
  {
    key: 'vocabulary',
    label: 'Từ vựng',
    englishLabel: 'Vocabulary',
    description: 'Từ và cụm từ theo chủ đề, chỉ xuất hiện khi đã có dữ liệu được kiểm duyệt.',
    icon: 'book-open',
  },
  {
    key: 'grammar',
    label: 'Ngữ pháp',
    englishLabel: 'Grammar',
    description: 'Cấu trúc và cách dùng thực tế cho từng ngữ cảnh học tập.',
    icon: 'library',
  },
  {
    key: 'sentences',
    label: 'Mẫu câu',
    englishLabel: 'Sentences',
    description: 'Cách diễn đạt đời thường với bối cảnh và nguồn rõ ràng.',
    icon: 'message-circle',
  },
  {
    key: 'pronunciation',
    label: 'Phát âm',
    englishLabel: 'Pronunciation',
    description: 'Hướng dẫn âm và ngữ điệu khi có tài liệu âm thanh phù hợp.',
    icon: 'share',
  },
  {
    key: 'resources',
    label: 'Tài nguyên',
    englishLabel: 'Resources',
    description: 'Tài liệu tham khảo được cộng đồng đóng góp và kiểm duyệt.',
    icon: 'inbox',
  },
];

const disabledCapability: HubSectionAvailability = {
  key: 'overview',
  status: 'DISABLED',
  isNavigable: false,
  href: null,
};

export function LanguageResourcePreview({ languageName, sections, items = [] }: LanguageResourcePreviewProps) {
  const availableItems = items.filter((item) => {
    const capability = getCapability(sections, item.type);
    return isNavigableCapability(capability)
      && Boolean(item.title.trim())
      && Boolean(item.shortDescription.trim());
  });
  const availableTypes = new Set(availableItems.map((item) => item.type));

  return (
    <section className={styles.preview} aria-labelledby='resource-preview-heading'>
      <div className={styles.previewHeader}>
        <div>
          <h2 id='resource-preview-heading'>Tài nguyên học tập cho {languageName}</h2>
          <p className={styles.previewLead}>Nội dung được thêm dần từ dữ liệu ngôn ngữ và đóng góp thực tế của cộng đồng.</p>
        </div>
        <span className={styles.truthNote}>Trạng thái theo capability</span>
      </div>

      <div className={styles.previewGrid}>
        {availableItems.length > 0 ? (
          <ResourcePreviewList items={availableItems} sections={sections} />
        ) : (
          <ResourceEmptyState />
        )}
        <ResourceCategoryIndex sections={sections} availableTypes={availableTypes} />
      </div>
    </section>
  );
}

function ResourceEmptyState() {
  return (
    <div className={styles.emptyState} role='status'>
      <span className={styles.emptyIcon} aria-hidden='true'><Icon name='library' size={24} /></span>
      <p className={styles.emptyStatus}>Nội dung chưa khả dụng</p>
      <h3>Chưa có tài nguyên học tập</h3>
      <p>Nội dung sẽ xuất hiện khi dữ liệu cộng đồng được kiểm duyệt và sẵn sàng.</p>
      <span className={styles.emptyDetail}>Hiện chưa có bản ghi phát hành cho các danh mục này.</span>
    </div>
  );
}

function ResourcePreviewList({ items, sections }: { items: readonly LanguageResourcePreviewItem[]; sections: readonly HubSectionAvailability[] }) {
  return (
    <div className={styles.resourceListFrame}>
      <h3 className={styles.listHeading}>Nội dung đã sẵn sàng</h3>
      <ul className={styles.resourceList}>
        {items.map((item) => {
          const definition = resourceDefinitions.find((candidate) => candidate.key === item.type);
          const contents = (
            <>
              <div className={styles.resourceMeta}>
                <span>{definition?.label ?? item.type}</span>
                {item.level ? <span>{item.level}</span> : null}
              </div>
              <h4>{item.title}</h4>
              <p>{item.shortDescription}</p>
              {item.topic ? <span className={styles.resourceTopic}>{item.topic}</span> : null}
            </>
          );
          const capability = getCapability(sections, item.type);
          const canNavigate = isNavigableCapability(capability) && isSafeInternalHref(item.href);

          return (
            <li key={item.id} className={styles.resourceItem}>
              {canNavigate ? <Link className={styles.resourceLink} to={item.href}>{contents}</Link> : <article className={styles.resourceArticle}>{contents}</article>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResourceCategoryIndex({ sections, availableTypes }: { sections: readonly HubSectionAvailability[]; availableTypes: ReadonlySet<LanguageResourceType> }) {
  return (
    <aside className={styles.categoryIndex} aria-labelledby='resource-category-heading'>
      <h3 id='resource-category-heading'>Danh mục học tập</h3>
      <p>Những khu vực này sẽ mở theo dữ liệu thực tế, không theo nội dung mẫu.</p>
      <ul className={styles.categoryList}>
        {resourceDefinitions.map((definition) => {
          const capability = getCapability(sections, definition.key);
          return (
            <li key={definition.key} className={styles.categoryItem}>
              <div className={styles.categoryName}>
                <span className={styles.categoryIcon} aria-hidden='true'><Icon name={definition.icon} size={18} /></span>
                <span><strong>{definition.label}</strong><small>{definition.englishLabel}</small></span>
              </div>
              <span className={styles.categoryStatus}>{getResourceStatusLabel(capability, availableTypes.has(definition.key))}</span>
              <p>{definition.description}</p>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function getCapability(sections: readonly HubSectionAvailability[], key: HubSectionKey): HubSectionAvailability {
  return sections.find((section) => section.key === key) ?? { ...disabledCapability, key };
}

function isNavigableCapability(capability: HubSectionAvailability): boolean {
  return capability.status === 'AVAILABLE' && capability.isNavigable && Boolean(capability.href);
}

function getResourceStatusLabel(capability: HubSectionAvailability, hasItems: boolean): string {
  if (hasItems) return 'Đang mở';
  if (capability.status === 'AVAILABLE' || capability.status === 'EMPTY') return 'Chưa có nội dung';
  if (capability.status === 'NOT_IMPLEMENTED') return 'Chưa sẵn sàng';
  return 'Tạm tắt';
}

function isSafeInternalHref(href: string | null | undefined): href is string {
  return Boolean(href && href.startsWith('/') && !href.startsWith('//'));
}
