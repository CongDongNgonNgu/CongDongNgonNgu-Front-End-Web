import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CorrectionRequestOriginal } from './CorrectionRequestOriginal';
import type { CorrectionRequestResponse } from '../corrections.types';
afterEach(cleanup);
it('shows canonical original/context once and keeps an independent edited note secondary', () => {
 const data={correction:{originalText:'I go to class yesterday.',context:'A message to my teacher.'}} as CorrectionRequestResponse;
 render(<CorrectionRequestOriginal source={{data,loading:false,error:null,retry:vi.fn()}} content='Could you explain the tense?' direction='ltr'/>);
 expect(screen.getByText('I go to class yesterday.')).toBeVisible();
 expect(screen.getByText('A message to my teacher.')).toBeVisible();
 expect(screen.getByText('Could you explain the tense?').closest('details')).not.toHaveAttribute('open');
});
it('does not invent an original from mutable post text when source is unavailable', () => {
 render(<CorrectionRequestOriginal source={{data:null,loading:false,error:new Error('offline'),retry:vi.fn()}} content='Edited content' direction='ltr'/>);
 expect(screen.getByRole('alert')).toBeVisible();
 expect(screen.queryByText('Edited content')).toBeNull();
});

it('does not repeat context that is identical to the canonical original', () => {
 const data={correction:{originalText:'A single original sentence.',context:'A single original sentence.'}} as CorrectionRequestResponse;
 render(<CorrectionRequestOriginal source={{data,loading:false,error:null,retry:vi.fn()}} content='A single original sentence.' direction='ltr'/>);
 expect(screen.getAllByText('A single original sentence.')).toHaveLength(1);
});
