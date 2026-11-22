import type { ApiError } from '@secret-santa/shared';

export function errorResponse(status: number, error: ApiError['error']): Response {
  return Response.json({ error } satisfies ApiError, { status });
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
