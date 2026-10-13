import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLocaleProvider, useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { CommunitySearchForm } from './CommunitySearchForm';
import type { CommunitySearchQuery } from '../community-search';
afterEach(()=>{cleanup();localStorage.removeItem('congdongngonngu.ui-locale.v1');});
function SwitchLocale(){const {setLocale}=useUiLocale();return <button onClick={()=>setLocale('vi')}>Switch locale</button>;}
function setup(query:CommunitySearchQuery={}) {
  localStorage.setItem('congdongngonngu.ui-locale.v1','en');
  const onApply=vi.fn();
  render(<UiLocaleProvider><SwitchLocale/><CommunitySearchForm query={query} languages={[]} languagesLoading={false} authenticated onApply={onApply} onReset={vi.fn()} onAuthRequired={vi.fn()}/></UiLocaleProvider>);
  return onApply;
}
it('labels all eight post types and the bounded question-state and ranking controls in English', async()=>{
  const user=userEvent.setup();setup();
  await user.click(screen.getByText('More filters'));
  expect(screen.getByLabelText('Post type').querySelectorAll('option')).toHaveLength(9);
  expect(screen.getByRole('option',{name:'Question'})).toHaveValue('QUESTION');
  await user.selectOptions(screen.getByLabelText('Question status'),'ANSWERED');
  expect(screen.getByLabelText('Post type')).toHaveValue('QUESTION');
  await user.selectOptions(screen.getByLabelText('Post type'),'CULTURE');
  expect(screen.getByLabelText('Question status')).toBeDisabled();
  expect(screen.getByLabelText('Question status')).toHaveValue('');
});
it.each(['x'.repeat(121),'bad\u0000query'])('shows a field-linked error for invalid search text',async(value)=>{
  const apply=setup();
  const query=screen.getByRole('searchbox');
  fireEvent.change(query,{target:{value}});fireEvent.submit(query.closest('form')!);
  expect(apply).not.toHaveBeenCalled();expect(query).toHaveAttribute('aria-invalid','true');
  expect(document.getElementById(query.getAttribute('aria-describedby')!)).toHaveAttribute('role','alert');
});
it('reveals an invalid topic within More filters and preserves query drafts through locale change',async()=>{
  const user=userEvent.setup(),apply=setup({topic:'invalid//topic'});
  const query=screen.getByRole('searchbox');
  await user.type(query,'Verbatim 😀 text');
  fireEvent.submit(query.closest('form')!);
  const topic=screen.getByLabelText('Exact topic');
  expect(topic.closest('details')).toHaveAttribute('open');
  expect(topic).toHaveAttribute('aria-invalid','true');
  expect(apply).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:'Switch locale'}));
  expect(screen.getByRole('searchbox',{name:'Tìm bài viết cộng đồng'})).toHaveValue('Verbatim 😀 text');
  expect(screen.getByLabelText('Chủ đề chính xác')).toHaveValue('invalid//topic');
  expect(screen.getByRole('alert')).toHaveTextContent('Chủ đề');
});

it('clears unapplied drafts and validation when resetting an already empty URL', async () => {
 const user=userEvent.setup();setup();const input=screen.getByRole('searchbox');
 await user.type(input,'x'.repeat(121));fireEvent.submit(input.closest('form')!);
 expect(input).toHaveAttribute('aria-invalid','true');
 await user.click(screen.getByRole('button',{name:'Reset'}));
 expect(input).toHaveValue('');expect(input).not.toHaveAttribute('aria-invalid','true');
 expect(screen.queryByRole('alert')).toBeNull();
});
