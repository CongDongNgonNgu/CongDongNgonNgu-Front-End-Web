import { SelectControl } from '../../../components/ui/FormControls';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import styles from '../pages/CommunityRequestPage.module.css';

interface TargetLanguageSelectProps {
  id: string;
  value: string;
  languages: LanguageCatalogItem[];
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
}

export function TargetLanguageSelect({
  id,
  value,
  languages,
  loading,
  error,
  onChange,
}: TargetLanguageSelectProps) {
  return (
    <SelectControl
      id={id}
      label='Ngôn ngữ mục tiêu'
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      hint='Chỉ chọn ngôn ngữ đang hoạt động trong cộng đồng.'
      disabled={loading || languages.length === 0}
      required
    >
      <option value=''>
        {loading ? 'Đang tải ngôn ngữ…' : languages.length === 0 ? 'Chưa có ngôn ngữ khả dụng' : 'Chọn ngôn ngữ'}
      </option>
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.nativeName} · {language.englishName}
        </option>
      ))}
    </SelectControl>
  );
}

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.catalogError} role='alert'>
      <span>Không thể tải danh sách ngôn ngữ. Vui lòng thử lại.</span>
      <button type='button' onClick={onRetry}>Thử lại</button>
    </div>
  );
}
