// Single gateway to the backend. The frontend never talks to the database or the AI service.
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const TOKEN_KEY = 'wifisense.token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
    public readonly errors: string[] = [],
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined | null>;

export const tokenStore = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(BASE_URL + path);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el backend. Verifica que esté en ejecución.');
  }

  if (response.status === 401 && token) onUnauthorized();
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = await response.json().catch(() => ({}));
  const message = problem.detail ?? defaultMessage(response.status);
  const errors = problem.errors ?? {};
  return Array.isArray(errors)
    ? new ApiError(response.status, message, {}, errors)
    : new ApiError(response.status, message, errors, Object.values(errors));
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión de nuevo.';
  if (status === 403) return 'Tu rol no tiene permiso para esta acción.';
  if (status === 413) return 'La solicitud es demasiado grande.';
  if (status === 429) return 'Demasiados intentos. Espera unos minutos.';
  if (status >= 500) return 'Ocurrió un error en el servidor. Intenta de nuevo.';
  return 'No se pudo completar la solicitud.';
}

/**
 * Raw request for the connection test: the caller times it and reads the body as bytes. Same token and error
 * messages as every other call.
 */
async function raw(method: 'GET' | 'POST', path: string, query?: Query, body?: Blob): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/octet-stream';
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body, cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'Se perdió la conexión durante la prueba. Revisa tu Wi-Fi e inténtalo de nuevo.');
  }
  if (response.status === 401 && token) onUnauthorized();
  if (!response.ok) throw await toApiError(response);
  return response;
}

export const apiClient = {
  raw,
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: (path: string) => request<void>('DELETE', path),
};
