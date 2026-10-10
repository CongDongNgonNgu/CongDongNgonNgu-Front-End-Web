import { ApiClientError, resolveApiBaseUrl } from '../../services/api-client';
import { parseMessageSequence } from './messaging-state';

export interface MessageStreamOptions {
  conversationId: string;
  accessToken: string;
  lastEventId?: string;
  signal: AbortSignal;
  onConnected?: () => void;
  onHint: (version: string) => void;
}
export class MessageStreamError extends ApiClientError {
  constructor(status: number, public readonly retryAfter?: number) {
    super('Message stream unavailable', status, 'HTTP_' + status);
  }
}
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class MessageStreamClient {
  private readonly baseUrl: string;
  constructor(private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis),
    baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)) {
    this.baseUrl = resolveApiBaseUrl(baseUrl);
  }
  async connect(options: MessageStreamOptions): Promise<void> {
    if (!options.accessToken) throw new Error('Authenticated message session required');
    if (options.lastEventId !== undefined) parseMessageSequence(options.lastEventId);
    if (options.signal.aborted) return;
    const response = await this.fetcher(this.baseUrl.replace(/\/+$/, '') + '/exchange/conversations/'
      + encodeURIComponent(options.conversationId) + '/stream', {
      method: 'GET', credentials: 'include', signal: options.signal,
      headers: { Accept: 'text/event-stream', Authorization: 'Bearer ' + options.accessToken,
        ...(options.lastEventId === undefined ? {} : { 'Last-Event-ID': options.lastEventId }) },
    });
    if (!response.ok || !response.body || !response.headers.get('Content-Type')?.toLowerCase().includes('text/event-stream')) {
      await response.body?.cancel().catch(() => undefined);
      const rawRetry = response.headers.get('Retry-After');
      const retryAfter = rawRetry && /^[1-9][0-9]{0,5}$/.test(rawRetry) ? Number(rawRetry) : undefined;
      throw new MessageStreamError(response.status, retryAfter);
    }
    const reader = response.body.getReader();
    const abort = () => { void reader.cancel().catch(() => undefined); };
    options.signal.addEventListener('abort', abort, { once: true });
    const decoder = new TextDecoder();
    let buffer = '', event = '';
    try {
      if (options.signal.aborted) abort();
      else options.onConnected?.();
      while (!options.signal.aborted) {
        const { value, done } = await reader.read();
        if (done || options.signal.aborted) break;
        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const end = buffer.search(/[\r\n]/);
          if (end < 0 || (buffer[end] === '\r' && end === buffer.length - 1)) break;
          const line = buffer.slice(0, end);
          const delimiter = buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1;
          buffer = buffer.slice(end + delimiter);
          if (!line) { emitHint(event, options); event = ''; }
          else { event += line + '\n'; }
          if (event.length > 65_536) throw new Error('Message stream event too large');
        }
        if (buffer.length + event.length > 65_536) throw new Error('Message stream event too large');
      }
      // Incomplete final events are not dispatched. Reconnect always reconciles REST.
      if (!options.signal.aborted) throw new Error('Message stream closed');
    } finally {
      options.signal.removeEventListener('abort', abort);
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}

function emitHint(block: string, options: MessageStreamOptions) {
  if (options.signal.aborted) return;
  const fields: Record<string, string[]> = {};
  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon), value = line.slice(colon + 1).replace(/^ /, '');
    (fields[name] ??= []).push(value);
  }
  if (fields.event?.length !== 1 || fields.event[0] !== 'hint' || fields.id?.length !== 1 || !fields.data) return;
  try {
    const value: unknown = JSON.parse(fields.data.join('\n'));
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1
      || !('version' in value) || typeof value.version !== 'string' || value.version !== fields.id[0]) return;
    parseMessageSequence(value.version);
    options.onHint(value.version);
  } catch { /* Malformed hints cannot change the scoped cursor or reveal message data. */ }
}
