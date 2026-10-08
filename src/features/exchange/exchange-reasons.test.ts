import { describe, expect, it } from 'vitest';
import { matchingReasonDisplay } from './exchange-reasons';
import type { DiscoveryLanguage } from './exchange.types';
const languages: DiscoveryLanguage[] = [
  { code: 'en', slug: 'english', englishName: 'English', vietnameseName: 'Tiếng Anh', nativeName: 'English', direction: 'ltr', offered: true, wanted: false, declaredProficiency: 'C1', assessedProficiency: null },
  { code: 'vi', slug: 'vietnamese', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', nativeName: 'Tiếng Việt', direction: 'ltr', offered: false, wanted: true, declaredProficiency: 'A1', assessedProficiency: null },
];
describe('matching reason display', () => {
 it.each([
  ['Họ có thể hỗ trợ English; bạn đang muốn học English.', 'They can support English; you want to learn English.'],
  ['Bạn có thể hỗ trợ Vietnamese; họ đang muốn học Vietnamese.', 'You can support Vietnamese; they want to learn Vietnamese.'],
  ['Mức độ bạn chọn tương thích với hồ sơ ngôn ngữ của nhau.', 'Your selected proficiency is compatible with each other’s language profiles.'],
  ['Múi giờ tương thích.', 'Compatible timezones.'],
  ['Có khoảng thời gian học phù hợp.', 'Suitable learning times overlap.'],
  ['Mục tiêu chung: conversation, custom_goal.', 'Shared goals: Confident conversations, custom_goal.'],
  ['Sở thích chung: my_music_文字, travel.', 'Shared interests: my_music_文字, travel.'],
 ])('localizes the current backend template %s', (reason, english) => {
  expect(matchingReasonDisplay(reason, languages, 'en')).toBe(english);
 });
 it('uses Vietnamese metadata without changing language codes', () => {
  expect(matchingReasonDisplay('Họ có thể hỗ trợ English; bạn đang muốn học English.', languages, 'vi')).toBe('Họ có thể hỗ trợ Tiếng Anh; bạn đang muốn học Tiếng Anh.');
  expect(languages[0].code).toBe('en');
 });
 it.each(['unsafe internal provider text', 'Họ có thể hỗ trợ Arabic; bạn đang muốn học Arabic.'])('safely falls back for an unknown or unverifiable reason', (reason) => {
  expect(matchingReasonDisplay(reason, languages, 'en')).toBe('Matching details are unavailable.');
  expect(matchingReasonDisplay(reason, languages, 'vi')).toBe('Chi tiết ghép đôi chưa sẵn sàng.');
 });
});
