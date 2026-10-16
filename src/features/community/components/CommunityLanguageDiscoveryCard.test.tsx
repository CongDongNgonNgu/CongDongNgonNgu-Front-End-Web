import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { CommunityLanguageDiscoveryCard } from './CommunityLanguageDiscoveryCard';
afterEach(()=>{cleanup(); localStorage.removeItem('congdongngonngu.ui-locale.v1');});
it.each(['vi','en'])('explains the language journey and links to the real catalogue in %s', locale=>{
 localStorage.setItem('congdongngonngu.ui-locale.v1',locale);
 render(<MemoryRouter><UiLocaleProvider><CommunityLanguageDiscoveryCard/></UiLocaleProvider></MemoryRouter>);
 expect(screen.getByRole('link')).toHaveAttribute('href','/languages');
 expect(screen.getByRole('heading',{level:2})).toHaveTextContent(locale==='en'?'Find your language':'Tìm ngôn ngữ của bạn');
 expect(screen.getByText(locale==='en'?'Choose a language to discover learning resources, questions and study partners.':'Chọn ngôn ngữ để khám phá tài nguyên, câu hỏi và bạn học phù hợp.')).toBeVisible();
 expect(screen.queryByText(/trending|thịnh hành|\d+ questions/i)).toBeNull();
});
