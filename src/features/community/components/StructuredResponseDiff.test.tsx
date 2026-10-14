import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { StructuredResponseDiff } from './StructuredResponseDiff';

afterEach(() => { cleanup(); localStorage.clear(); });

it('exposes comparison columns one heading level below the response section', () => {
  localStorage.setItem('congdongngonngu.ui-locale.v1', 'en');
  render(<UiLocaleProvider>
    <section aria-labelledby='responses-heading'>
      <h2 id='responses-heading'>Correction proposals</h2>
      <StructuredResponseDiff original='I go yesterday.' corrected='I went yesterday.' />
    </section>
  </UiLocaleProvider>);

  const comparison = screen.getByRole('region', { name: 'Original and corrected text comparison' });
  expect(within(comparison).getByRole('heading', { name: 'Original', level: 3 })).toBeVisible();
  expect(within(comparison).getByRole('heading', { name: 'Suggested correction', level: 3 })).toBeVisible();
  expect(within(comparison).queryByRole('heading', { level: 4 })).toBeNull();
  expect(within(comparison).getByText('go')).toHaveProperty('tagName', 'DEL');
  expect(within(comparison).getByText('went')).toHaveProperty('tagName', 'INS');
});
