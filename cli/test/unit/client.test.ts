import { describe, it, expect, vi, afterEach } from 'vitest';
import { PecsClient } from '../../src/client';

const config = { port: 39457, token: 'test-token', baseUrl: 'http://127.0.0.1:39457' };

afterEach(() => vi.restoreAllMocks());

describe('PecsClient', () => {
  it('GET includes Authorization header', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', spy);

    const client = new PecsClient(config);
    await client.get('/memories');

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:39457/api/v1/memories');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('POST sends JSON body with correct Content-Type', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '1', title: 'T' }) });
    vi.stubGlobal('fetch', spy);

    const client = new PecsClient(config);
    await client.post('/memories', { title: 'Test', content: 'c', type: 'note' });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toMatchObject({ title: 'Test' });
  });

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }));

    const client = new PecsClient(config);
    await expect(client.get('/memories')).rejects.toThrow('401');
  });

  it('status() calls without auth header (public endpoint)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: '0.7.0' }) });
    vi.stubGlobal('fetch', spy);

    const client = new PecsClient(config);
    const s = await client.status() as { version: string };

    expect(s.version).toBe('0.7.0');
    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe('http://127.0.0.1:39457/api/v1/status');
    // No Authorization header on status
    const init = spy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.headers).toBeUndefined();
  });

  it('DELETE uses correct method', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', spy);

    const client = new PecsClient(config);
    await client.del('/memories/abc');

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
  });
});
