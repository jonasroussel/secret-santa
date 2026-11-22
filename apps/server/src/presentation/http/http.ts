import type { ApiError } from '@secret-santa/shared';

const STATUS: Record<ApiError['error'], number> = {
  invalid_input: 400,
  unauthorized: 401,
  invalid_code: 401,
  not_drawn: 409,
  draw_locked: 409,
  draw_impossible: 409,
  draw_tested: 409,
  not_enough_participants: 400,
  not_found: 404,
  duplicate_name: 409,
  duplicate_exclusion: 409,
  too_many_requests: 429,
};

export function errorResponse(status: number, error: ApiError['error']): Response {
  return Response.json({ error } satisfies ApiError, { status });
}

export function resultResponse<T>(
  result: { ok: true; value: T } | { ok: false; error: ApiError['error'] },
  status = 200,
): Response {
  if (!result.ok) return errorResponse(STATUS[result.error], result.error);
  return result.value === undefined ? noContent() : Response.json(result.value, { status });
}

export const noContent = () => new Response(null, { status: 204 });

/**
 * The JSON body, or `undefined` when it is missing or not sent as JSON. Requiring the JSON content type blocks plain
 * HTML form posts from other sites, which cannot set it.
 */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined;
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function field(body: unknown, name: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined;
}

export function idParam(value: string): number | null {
  return /^[1-9]\d{0,15}$/.test(value) ? Number(value) : null;
}
