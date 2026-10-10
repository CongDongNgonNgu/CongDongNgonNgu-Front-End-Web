import { describe, expect, it, vi } from 'vitest';
import { MessageStreamClient } from './message-stream.client';

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(controller) {
    chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk))); controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
describe('authenticated message fetch SSE', () => {
  it('sends header-only credentials and scoped Last-Event-ID, parses chunked CRLF version hints', async () => {
    const fetcher = vi.fn().mockResolvedValue(streamResponse([
      ': heartbeat\r\n\r\n', 'id: 9007199254740993\r', '\nevent: hint\r\ndata: {"version":"9007199254740993"}\r\n\r', '\n',
    ]));
    const onHint = vi.fn();
    const signal = new AbortController().signal;
    await expect(new MessageStreamClient(fetcher, '/api/v1').connect({ conversationId: 'room/1',
      accessToken: 'synthetic-token', lastEventId: '0', onHint, signal })).rejects.toThrow('closed');
    expect(fetcher).toHaveBeenCalledWith('/api/v1/exchange/conversations/room%2F1/stream', expect.objectContaining({
      signal, credentials: 'include', headers: { Accept: 'text/event-stream', Authorization: 'Bearer synthetic-token', 'Last-Event-ID': '0' },
    }));
    expect(onHint).toHaveBeenCalledExactlyOnceWith('9007199254740993');
  });
  it('ignores malformed, mismatching, noncanonical and foreign event payloads', async () => {
    const fetcher = vi.fn().mockResolvedValue(streamResponse([
      'id: 1\nevent: hint\ndata: {"version":"2"}\n\n',
      'id: 01\nevent: hint\ndata: {"version":"01"}\n\n',
      'id: 3\nevent: hint\ndata: {"version":"3","text":"private"}\n\n',
      'id: 4\nevent: message\ndata: {"version":"4"}\n\n',
      'id: 5\nevent: hint\ndata: invalid\n\n',
    ]));
    const onHint = vi.fn();
    await expect(new MessageStreamClient(fetcher, '/api/v1').connect({ conversationId: 'id',
      accessToken: 'synthetic', onHint, signal: new AbortController().signal })).rejects.toThrow('closed');
    expect(onHint).not.toHaveBeenCalled();
  });
  it('exposes pre-stream rate limits without accepting token query parameters', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '17' } }));
    await expect(new MessageStreamClient(fetcher, '/api/v1').connect({ conversationId: 'id',
      accessToken: 'synthetic', onHint: vi.fn(), signal: new AbortController().signal }))
      .rejects.toMatchObject({ status: 429, retryAfter: 17 });
    await expect(new MessageStreamClient(fetcher, '/api/v1').connect({ conversationId: 'id',
      accessToken: 'synthetic', lastEventId: '01', onHint: vi.fn(), signal: new AbortController().signal })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('cancels an idle reader immediately on abort and never emits after teardown', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'Content-Type': 'text/event-stream' } });
    const controller = new AbortController();
    const onConnected = vi.fn(() => controller.abort());
    const onHint = vi.fn();
    await new MessageStreamClient(vi.fn().mockResolvedValue(response), '/api/v1').connect({
      conversationId: 'id', accessToken: 'synthetic', onHint, onConnected, signal: controller.signal,
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(onHint).not.toHaveBeenCalled();
  });
  it('bounds an unterminated event instead of accumulating an unlimited response', async () => {
    const response = streamResponse(['data: ' + 'x'.repeat(65_537)]);
    await expect(new MessageStreamClient(vi.fn().mockResolvedValue(response), '/api/v1').connect({
      conversationId: 'id', accessToken: 'synthetic', onHint: vi.fn(), signal: new AbortController().signal,
    })).rejects.toThrow('too large');
  });
});
