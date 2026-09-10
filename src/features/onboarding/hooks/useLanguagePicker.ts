import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { filterLanguages } from '../onboarding-state';
import type { LanguageCatalogItem, LanguageRole } from '../onboarding.types';

interface UseLanguagePickerOptions {
  catalog: LanguageCatalogItem[];
  step: number;
  onToggleRole: (code: string, role: LanguageRole) => void;
}

export function useLanguagePicker({ catalog, step, onToggleRole }: UseLanguagePickerOptions) {
  const searchId = useId();
  const listId = `${searchId}-language-options`;
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const filteredSearchResults = useMemo(
    () => filterLanguages(catalog, searchValue).slice(0, 8),
    [catalog, searchValue],
  );

  const resetSearch = useCallback((): void => {
    setSearchValue('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
  }, []);

  const chooseSearchLanguage = useCallback((code: string): void => {
    onToggleRole(code, step === 1 ? 'learning' : 'known');
    resetSearch();
  }, [onToggleRole, resetSearch, step]);

  const handleSearchChange = useCallback((value: string): void => {
    setSearchValue(value);
    setSearchOpen(Boolean(value.trim()));
    setActiveSearchIndex(0);
  }, []);

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      resetSearch();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((index) => Math.min(index + 1, Math.max(filteredSearchResults.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && searchOpen && filteredSearchResults[activeSearchIndex]) {
      event.preventDefault();
      chooseSearchLanguage(filteredSearchResults[activeSearchIndex].code);
    }
  }, [activeSearchIndex, chooseSearchLanguage, filteredSearchResults, resetSearch, searchOpen]);

  const handleSearchFocus = useCallback(() => {
    setSearchOpen(Boolean(searchValue.trim()));
  }, [searchValue]);

  return {
    activeSearchIndex,
    chooseSearchLanguage,
    filteredSearchResults,
    handleSearchChange,
    handleSearchFocus,
    handleSearchKeyDown,
    listId,
    resetSearch,
    searchId,
    searchOpen,
    searchRef,
    searchValue,
  };
}
