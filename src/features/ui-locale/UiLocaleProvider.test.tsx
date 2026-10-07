import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UiLocaleProvider, useUiLocale } from './UiLocaleProvider';
import { UI_LOCALE_STORAGE_KEY, resolveUiLocale, translate } from './ui-locale';

function Probe() {
  const { locale, setLocale, t, formatNumber } = useUiLocale();
  return <><p>{locale}:{t('common.loading')}</p><output>{formatNumber(1234.5)}</output><button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button></>;
}
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('browser UI locale', () => {
  it('defaults to Vietnamese independently of browser language', () => {
    render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    expect(screen.getByText('vi:Đang tải…')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('vi');
    expect(document.documentElement.dir).toBe('ltr');
  });
  it('switches in both directions, formats values and persists across remount', () => {
    const first = render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    expect(screen.getByText('en:Loading…')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toBe('1,234.5');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(UI_LOCALE_STORAGE_KEY)).toBe('en');
    first.unmount();
    render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    expect(screen.getByText('en:Loading…')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Switch'));
    expect(screen.getByText('vi:Đang tải…')).toBeInTheDocument();
  });
  it.each(['fr', '../en', '{"locale":"en"}', 'EN', ''])('rejects invalid stored locale %s', (value) => {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, value);
    render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    expect(document.documentElement.lang).toBe('vi');
    expect(resolveUiLocale(value)).toBe('vi');
  });
  it('still switches when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
    render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    expect(screen.getByText('en:Loading…')).toBeInTheDocument();
  });
  it('does not overwrite unrelated learning preferences', () => {
    localStorage.setItem('test.learning-language', 'fr');
    render(<UiLocaleProvider><Probe /></UiLocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    expect(localStorage.getItem('test.learning-language')).toBe('fr');
  });
  it('validates programmatic locale changes as well as stored preferences', () => {
    function InvalidSwitch() {
      const { setLocale } = useUiLocale();
      return <button onClick={() => setLocale('../../ar')}>Invalid</button>;
    }
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, 'en');
    render(<UiLocaleProvider><Probe /><InvalidSwitch /></UiLocaleProvider>);
    fireEvent.click(screen.getByText('Invalid'));
    expect(screen.getByText('vi:Đang tải…')).toBeInTheDocument();
    expect(localStorage.getItem(UI_LOCALE_STORAGE_KEY)).toBe('vi');
  });
  it('falls back to Vietnamese for a missing English key and to safe text for unknown keys', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('en', 'example', {}, { vi: { example: 'Xin chào {name}' }, en: {} })).toBe('Xin chào {name}');
    expect(translate('en', '__proto__')).toBe('Nội dung chưa khả dụng.');
  });
  it('interpolates user text as text rather than HTML', () => {
    const text = translate('en', 'example', { name: '<img src=x onerror=alert(1)>' }, { vi: {}, en: { example: 'Hello {name}' } });
    render(<p>{text}</p>);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Hello <img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
