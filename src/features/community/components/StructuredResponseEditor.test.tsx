import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StructuredResponseEditor } from './StructuredResponseEditor';
afterEach(cleanup);
function setup() { const onSubmit=vi.fn().mockResolvedValue(undefined); render(<StructuredResponseEditor kind="QA_ANSWER" authenticated busy={false} error={null} onAuthRequired={vi.fn()} onSubmit={onSubmit}/>); return onSubmit; }
describe('compact structured editor', () => {
 it('starts at three rows and preserves an optional explanation when collapsed', async () => { const user=userEvent.setup(); setup(); const answer=screen.getByRole('textbox', {name:'Câu trả lời'}); expect(answer).toHaveAttribute('rows','3'); expect(answer).not.toHaveAttribute('maxlength'); expect(screen.queryByRole('textbox', {name:'Giải thích (tuỳ chọn)'})).toBeNull(); await user.click(screen.getByRole('button',{name:'Thêm giải thích'})); await user.type(screen.getByRole('textbox',{name:'Giải thích (tuỳ chọn)'}),'A reason'); await user.click(screen.getByRole('button',{name:'Ẩn giải thích'})); await user.click(screen.getByRole('button',{name:'Thêm giải thích'})); expect(screen.getByRole('textbox',{name:'Giải thích (tuỳ chọn)'})).toHaveValue('A reason'); });
 it('accepts 20000 astral code points and rejects 20001 without truncating the draft', () => { const submit=setup(); const answer=screen.getByRole('textbox',{name:'Câu trả lời'}); fireEvent.change(answer,{target:{value:'😀'.repeat(20000)}}); fireEvent.submit(answer.closest('form')!); expect(submit).toHaveBeenCalledWith({responseKind:'QA_ANSWER',answerText:'😀'.repeat(20000)}); submit.mockClear(); fireEvent.change(answer,{target:{value:'😀'.repeat(20001)}}); fireEvent.submit(answer.closest('form')!); expect(submit).not.toHaveBeenCalled(); expect(answer).toHaveValue('😀'.repeat(20001)); expect(screen.getByRole('alert')).toBeInTheDocument(); });
});

it('validates the explanation in code points without discarding a collapsed draft', async () => {
  const user = userEvent.setup();
  const submit = setup();
  fireEvent.change(screen.getByRole('textbox',{name:'Câu trả lời'}),{target:{value:'Answer'}});
  await user.click(screen.getByRole('button',{name:'Thêm giải thích'}));
  const explanation = screen.getByRole('textbox',{name:'Giải thích (tuỳ chọn)'});
  expect(explanation).not.toHaveAttribute('maxlength');
  fireEvent.change(explanation,{target:{value:'😀'.repeat(5000)}});
  await user.click(screen.getByRole('button',{name:'Ẩn giải thích'}));
  fireEvent.submit(screen.getByRole('textbox',{name:'Câu trả lời'}).closest('form')!);
  expect(submit).toHaveBeenCalledWith({responseKind:'QA_ANSWER',answerText:'Answer',explanation:'😀'.repeat(5000)});
  submit.mockClear();
  await user.click(screen.getByRole('button',{name:'Thêm giải thích'}));
  fireEvent.change(screen.getByRole('textbox',{name:'Giải thích (tuỳ chọn)'}),{target:{value:'😀'.repeat(5001)}});
  fireEvent.submit(screen.getByRole('textbox',{name:'Câu trả lời'}).closest('form')!);
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('5.000');
});
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';

it.each([
  {kind:'QA_ANSWER' as const,value:'',message:'Please enter'},
  {kind:'QA_ANSWER' as const,value:'x'.repeat(20001),message:'20,000'},
  {kind:'CORRECTION_PROPOSAL' as const,value:'Original',message:'must differ'},
])('associates $message validation with the primary field', ({kind,value,message}) => {
  window.localStorage.setItem('congdongngonngu.ui-locale.v1','en');
  render(<UiLocaleProvider><StructuredResponseEditor kind={kind} originalText="Original" authenticated busy={false} error={null} onAuthRequired={vi.fn()} onSubmit={vi.fn()}/></UiLocaleProvider>);
  const field=screen.getByRole('textbox');
  fireEvent.change(field,{target:{value}});
  fireEvent.submit(field.closest('form')!);
  expect(field).toHaveAttribute('aria-invalid','true');
  const error=document.getElementById(field.getAttribute('aria-describedby')!);
  expect(error).toHaveTextContent(message);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  window.localStorage.removeItem('congdongngonngu.ui-locale.v1');
});

it('reveals an invalid collapsed explanation and associates its error without losing the draft', async () => {
  window.localStorage.setItem('congdongngonngu.ui-locale.v1','en');
  const user=userEvent.setup();
  render(<UiLocaleProvider><StructuredResponseEditor kind="QA_ANSWER" authenticated busy={false} error={null} onAuthRequired={vi.fn()} onSubmit={vi.fn()}/></UiLocaleProvider>);
  const answer=screen.getByRole('textbox',{name:'Answer'});
  fireEvent.change(answer,{target:{value:'Answer draft'}});
  await user.click(screen.getByRole('button',{name:'Add explanation'}));
  fireEvent.change(screen.getByRole('textbox',{name:'Explanation (optional)'}),{target:{value:'x'.repeat(5001)}});
  await user.click(screen.getByRole('button',{name:'Hide explanation'}));
  fireEvent.submit(answer.closest('form')!);
  const explanation=screen.getByRole('textbox',{name:'Explanation (optional)'});
  expect(explanation).toHaveAttribute('aria-invalid','true');
  expect(document.getElementById(explanation.getAttribute('aria-describedby')!)).toHaveTextContent('5,000');
  expect(explanation).toHaveValue('x'.repeat(5001));
  expect(answer).toHaveValue('Answer draft');
  expect(answer).toHaveAttribute('aria-invalid','false');
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  window.localStorage.removeItem('congdongngonngu.ui-locale.v1');
});
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';

function ValidationLocaleSwitch() {
  const {setLocale}=useUiLocale();
  return <button onClick={()=>setLocale('vi')}>Switch validation locale</button>;
}

it('updates a linked validation error when locale changes and clears it only after editing its field', async () => {
  window.localStorage.setItem('congdongngonngu.ui-locale.v1','en');
  const user=userEvent.setup();
  render(<UiLocaleProvider><ValidationLocaleSwitch/><StructuredResponseEditor kind="QA_ANSWER" authenticated busy={false} error={null} onAuthRequired={vi.fn()} onSubmit={vi.fn()}/></UiLocaleProvider>);
  const field=screen.getByRole('textbox');
  fireEvent.change(field,{target:{value:'x'.repeat(20001)}});
  fireEvent.submit(field.closest('form')!);
  expect(screen.getByRole('alert')).toHaveTextContent('20,000');
  await user.click(screen.getByRole('button',{name:'Switch validation locale'}));
  expect(screen.getByRole('alert')).toHaveTextContent('20.000');
  expect(field).toHaveValue('x'.repeat(20001));
  expect(field).toHaveAttribute('aria-invalid','true');
  fireEvent.change(field,{target:{value:'A revised answer'}});
  expect(field).toHaveAttribute('aria-invalid','false');
  expect(screen.queryByRole('alert')).toBeNull();
  window.localStorage.removeItem('congdongngonngu.ui-locale.v1');
});

it('keeps server failures global without falsely identifying an invalid field', () => {
  render(<StructuredResponseEditor kind="QA_ANSWER" authenticated busy={false} error="Could not send. Draft preserved." onAuthRequired={vi.fn()} onSubmit={vi.fn()}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Draft preserved.');
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid','false');
});
