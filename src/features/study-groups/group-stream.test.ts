import { expect,it,vi } from 'vitest';
import { MessageStreamClient } from '../communication/message-stream.client';
it('opens only the scoped first-party group stream with header auth and version hints',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('id: 2\nevent: hint\ndata: {"version":"2"}\n\n'));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}}));
 const onHint=vi.fn();
 await expect(new MessageStreamClient(fetcher,'/api/v1','/study-groups/').connect({conversationId:'g/other',accessToken:'synthetic',onHint,signal:new AbortController().signal})).rejects.toThrow('closed');
 expect(fetcher).toHaveBeenCalledWith('/api/v1/study-groups/g%2Fother/stream',expect.objectContaining({headers:{Accept:'text/event-stream',Authorization:'Bearer synthetic'}}));
 expect(onHint).toHaveBeenCalledExactlyOnceWith('2');
});
