import type { Database } from 'bun:sqlite';

import type { HealthResponse, Session } from '@secret-santa/shared';
import type { BunRequest } from 'bun';

import { type AuthDeps, AuthUseCase, SESSION_TTL_MS } from './application/auth-use-case.ts';
import type { Clock, Mailer } from './application/ports.ts';
import { RateLimiter } from './application/rate-limiter.ts';
import { Validation } from './domain/validation.ts';
import { AuthRepository } from './infrastructure/database/auth-repository.ts';
import { errorResponse, field, noContent, readJson } from './presentation/http/http.ts';

export type AppDeps = {
  version: string;
  database: Database;
  clock: Clock;
  mailer: Mailer;
  appUrl: string;
  adminEmails: ReadonlySet<string>;
};

const SESSION_COOKIE = 'session';

export function createApp({ version, database, clock, mailer, appUrl, adminEmails }: AppDeps) {
  const auth: AuthDeps = {
    repository: new AuthRepository(database),
    clock,
    mailer,
    limiter: new RateLimiter(clock, 5, 15 * 60 * 1000),
    appUrl,
    adminEmails,
  };
  const secure = appUrl.startsWith('https:');
  const sessionCookie = (value: string, maxAgeMs: number) =>
    new Bun.Cookie(SESSION_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure,
      maxAge: maxAgeMs / 1000,
    }).serialize();

  const withSession =
    <R extends BunRequest>(handler: (request: R, session: Session) => Response | Promise<Response>) =>
    (request: R) => {
      const email = AuthUseCase.sessionEmail(auth, request.cookies.get(SESSION_COOKIE));
      return email ? handler(request, { email }) : errorResponse(401, 'unauthorized');
    };

  return {
    '/api/health': {
      GET: () => Response.json({ status: 'ok', version } satisfies HealthResponse),
    },

    '/api/auth/request-link': {
      POST: async (request: BunRequest) => {
        const email = Validation.email(field(await readJson(request), 'email'));
        if (!email) return errorResponse(400, 'invalid_input');
        return AuthUseCase.requestLink(auth, email) === 'sent' ? noContent() : errorResponse(429, 'too_many_requests');
      },
    },
    '/api/auth/verify': {
      POST: async (request: BunRequest) => {
        const token = field(await readJson(request), 'token');
        const sessionToken = typeof token === 'string' ? AuthUseCase.verify(auth, token) : null;
        if (!sessionToken) return errorResponse(401, 'invalid_link');
        return new Response(null, {
          status: 204,
          headers: { 'set-cookie': sessionCookie(sessionToken, SESSION_TTL_MS) },
        });
      },
    },
    '/api/auth/logout': {
      POST: (request: BunRequest) => {
        AuthUseCase.logout(auth, request.cookies.get(SESSION_COOKIE));
        return new Response(null, { status: 204, headers: { 'set-cookie': sessionCookie('', 0) } });
      },
    },
    '/api/session': {
      GET: withSession((_request, session) => Response.json(session satisfies Session)),
    },
  };
}
