import type { ApiError } from '@secret-santa/shared';

export type ApiErrorCode = ApiError['error'] | 'network';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorCode };

/** JSON calls to our API. Errors come back as a code, never thrown, so each screen picks its French message. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (response.status === 204) return { ok: true, data: undefined as T };
    const body: unknown = await response.json();
    if (response.ok) return { ok: true, data: body as T };
    const { error } = body as ApiError;
    if (error === 'unauthorized') location.assign('/connexion');
    return { ok: false, error };
  } catch {
    return { ok: false, error: 'network' };
  }
}
