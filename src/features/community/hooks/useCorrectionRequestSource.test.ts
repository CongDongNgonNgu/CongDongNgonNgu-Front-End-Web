import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useCorrectionRequestSource } from './useCorrectionRequestSource';
import type { CommunityPost } from '../community.types';
import type { CorrectionRequestResponse } from '../corrections.types';
const post=(id:string)=>({id,postType:'CORRECTION_REQUEST'}) as CommunityPost;
const data=(id:string)=>({post:{id},correction:{postId:id,originalText:id,context:null}}) as CorrectionRequestResponse;
it('ignores a late canonical response after navigation and actor changes', async () => {
 let finishA!:(value:CorrectionRequestResponse)=>void,finishB!:(value:CorrectionRequestResponse)=>void;
 const api={getCorrectionRequest:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finishA=resolve;})).mockImplementationOnce(()=>new Promise(resolve=>{finishB=resolve;}))};
 const {result,rerender}=renderHook(({id,actor})=>useCorrectionRequestSource(post(id),api,true,actor),{initialProps:{id:'a',actor:'first'}});
 rerender({id:'b',actor:'second'});
 await act(async()=>{finishA(data('a'));});
 expect(result.current.data).toBeNull();
 expect(result.current.loading).toBe(true);
 await act(async()=>{finishB(data('b'));});
 expect(result.current.data?.correction.originalText).toBe('b');
});
it('retries a failed canonical read without substituting mutable content', async () => {
 const api={getCorrectionRequest:vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(data('a'))};
 const {result}=renderHook(()=>useCorrectionRequestSource(post('a'),api,true,'actor'));
 await waitFor(()=>expect(result.current.error).toBeInstanceOf(Error));
 expect(result.current.data).toBeNull();
 act(()=>result.current.retry());
 await waitFor(()=>expect(result.current.data?.correction.originalText).toBe('a'));
 expect(api.getCorrectionRequest).toHaveBeenCalledTimes(2);
});
it('does not fetch a canonical correction for other post types', () => {
 const api={getCorrectionRequest:vi.fn()};
 renderHook(()=>useCorrectionRequestSource({...post('a'),postType:'QUESTION'},api,false));
 expect(api.getCorrectionRequest).not.toHaveBeenCalled();
});
