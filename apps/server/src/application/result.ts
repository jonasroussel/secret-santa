import type { ApiError } from '@secret-santa/shared';

export type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError['error'] };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: ApiError['error']): Result<never> => ({ ok: false, error });
