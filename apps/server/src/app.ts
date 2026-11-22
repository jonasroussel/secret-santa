import type { HealthResponse } from '@secret-santa/shared';

export function createApp(version: string) {
  return {
    '/api/health': {
      GET: () => Response.json({ status: 'ok', version } satisfies HealthResponse),
    },
  };
}
