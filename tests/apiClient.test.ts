import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError, apiClient, buildUrl, endSession, setUnauthorizedHandler, tokenStore,
} from '../src/services/apiClient';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function failure(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('Expected the request to fail');
}

afterEach(() => {
  vi.unstubAllGlobals();
  tokenStore.clear();
});

describe('apiClient', () => {
  it('targets the backend URL and skips empty query values', () => {
    const url = new URL(buildUrl('/api/alerts', { status: 'OPEN', networkId: undefined }));
    expect(url.pathname).toBe('/api/alerts');
    expect(url.searchParams.get('status')).toBe('OPEN');
    expect(url.searchParams.has('networkId')).toBe(false);
  });

  it('sends the bearer token when the user is logged in', async () => {
    tokenStore.set('abc');
    const fetchMock = mockFetch(200, []);

    await apiClient.get('/api/networks');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('turns problem details into ApiError with field errors', async () => {
    mockFetch(400, { detail: 'Validation failed', errors: { bssid: 'must be a MAC address' } });

    const error = await failure(apiClient.post('/api/networks', {}));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.fieldErrors.bssid).toBe('must be a MAC address');
  });

  it('logs out when an authenticated request gets 401', async () => {
    tokenStore.set('expired');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, {});

    await apiClient.get('/api/networks').catch(() => undefined);

    expect(handler).toHaveBeenCalled();
  });

  it('reports a clear message when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await failure(apiClient.get('/api/networks'));

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/backend/);
  });

  it('renews an expired token with the refresh token and repeats the call', async () => {
    tokenStore.set('old-access', 'refresh-1');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/auth/refresh')) {
        expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'refresh-1' });
        return new Response(JSON.stringify({ token: 'new-access', refreshToken: 'refresh-2' }), { status: 200 });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer new-access' ? new Response('[1]', { status: 200 }) : new Response('{}', { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    // two calls at once: one renewal, never the same refresh token twice
    const [a, b] = await Promise.all([apiClient.get('/api/networks'), apiClient.get('/api/alerts')]);

    expect(a).toEqual([1]);
    expect(b).toEqual([1]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/auth/refresh'))).toHaveLength(1);
    expect(tokenStore.get()).toBe('new-access');
    expect(tokenStore.refresh()).toBe('refresh-2');
    expect(handler).not.toHaveBeenCalled();
  });

  it('signs out when the session cannot be renewed', async () => {
    tokenStore.set('old-access', 'used-refresh');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    const error = await failure(apiClient.get('/api/networks'));

    expect(error.status).toBe(401);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('closes the session in the backend when the user signs out', async () => {
    tokenStore.set('access', 'refresh-9');
    const fetchMock = mockFetch(204, null);

    await endSession();

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/auth\/logout$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken: 'refresh-9' });
    expect(tokenStore.get()).toBeNull();
    expect(tokenStore.refresh()).toBeNull();
  });
});
