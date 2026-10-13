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
