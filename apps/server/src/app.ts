import type { Database } from 'bun:sqlite';

import type { HealthResponse, SecretSantaEvent, Session } from '@secret-santa/shared';
import type { BunRequest } from 'bun';

import { type AuthDeps, AuthUseCase, SESSION_TTL_MS } from './application/auth-use-case.ts';
import { type DrawDeps, DrawUseCase } from './application/draw-use-case.ts';
import { EventUseCase } from './application/event-use-case.ts';
import type { Clock, Mailer } from './application/ports.ts';
import { RateLimiter } from './application/rate-limiter.ts';
import { Validation } from './domain/validation.ts';
import { AuthRepository } from './infrastructure/database/auth-repository.ts';
import { EventRepository } from './infrastructure/database/event-repository.ts';
import { errorResponse, field, idParam, noContent, readJson, resultResponse } from './presentation/http/http.ts';

export type AppDeps = {
  version: string;
  database: Database;
  clock: Clock;
  mailer: Mailer;
  /** Public address of the app, for the absolute URLs in mails. */
  appUrl: string;
  generateCode: () => string;
  /** Production only: the dev server runs on plain http. */
  secureCookie: boolean;
  adminEmails: ReadonlySet<string>;
  /** Participant mails go to the admins instead of the participants. */
  mailTestMode: boolean;
  /** The client's address, for the per-address sign-in limits (behind a proxy, the address it reports). */
  clientIp: (request: Request) => string;
};

const SESSION_COOKIE = 'session';
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const MINUTE = 60 * 1000;

export function createApp({
  version,
  database,
  clock,
  mailer,
  appUrl,
  generateCode,
  secureCookie,
  adminEmails,
  mailTestMode,
  clientIp,
}: AppDeps) {
  const isAdmin = (email: string) => adminEmails.has(email);
  const auth: AuthDeps = {
    repository: new AuthRepository(database),
    clock,
    mailer,
    limits: {
      requestsPerIp: new RateLimiter(clock, 5, 15 * MINUTE),
      requestsPerEmail: new RateLimiter(clock, 20, 60 * MINUTE, isAdmin),
      failuresPerIp: new RateLimiter(clock, 20, 24 * 60 * MINUTE),
      failuresPerEmail: new RateLimiter(clock, 100, 24 * 60 * MINUTE, isAdmin),
    },
    generateCode,
    adminEmails,
  };
  const events = new EventRepository(database);
  const draws: DrawDeps = {
    repository: events,
    mailer,
    clock,
    appUrl,
    testRecipients: mailTestMode ? [...adminEmails] : null,
  };
  const sessionCookie = (value: string, maxAgeMs: number) =>
    new Bun.Cookie(SESSION_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: secureCookie,
      maxAge: maxAgeMs / 1000,
    }).serialize();

  const withSession =
    <R extends BunRequest>(handler: (request: R, session: Session) => Response | Promise<Response>) =>
    (request: R) => {
      const email = AuthUseCase.sessionEmail(auth, request.cookies.get(SESSION_COOKIE));
      return email ? handler(request, { email, mailTestMode }) : errorResponse(401, 'unauthorized');
    };

  return {
    '/api/health': {
      GET: () => Response.json({ status: 'ok', version } satisfies HealthResponse),
    },

    '/api/auth/request-code': {
      POST: async (request: BunRequest) => {
        const email = Validation.email(field(await readJson(request), 'email'));
        if (!email) return errorResponse(400, 'invalid_input');
        const sent = AuthUseCase.requestCode(auth, email, clientIp(request)) === 'sent';
        return sent ? noContent() : errorResponse(429, 'too_many_requests');
      },
    },
    '/api/auth/verify': {
      POST: async (request: BunRequest) => {
        const body = await readJson(request);
        const email = Validation.email(field(body, 'email'));
        const code = field(body, 'code');
        if (!email || typeof code !== 'string') return errorResponse(401, 'invalid_code');
        const result = AuthUseCase.verify(auth, email, clientIp(request), code);
        if (!result.ok) return resultResponse(result);
        return new Response(null, {
          status: 204,
          headers: { 'set-cookie': sessionCookie(result.value, SESSION_TTL_MS) },
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

    '/api/event': {
      GET: withSession(() => resultResponse(EventUseCase.get(events))),
      PUT: withSession(async (request) => {
        const details = Validation.eventDetails(await readJson(request));
        if (!details) return errorResponse(400, 'invalid_input');
        return Response.json(EventUseCase.save(events, details) satisfies SecretSantaEvent);
      }),
    },
    '/api/event/participants': {
      POST: withSession(async (request) => {
        const input = Validation.participant(await readJson(request));
        if (!input) return errorResponse(400, 'invalid_input');
        return resultResponse(EventUseCase.addParticipant(events, input), 201);
      }),
    },
    '/api/event/participants/:id': {
      PUT: withSession(async (request: BunRequest<'/api/event/participants/:id'>) => {
        const id = idParam(request.params.id);
        if (id === null) return errorResponse(404, 'not_found');
        const input = Validation.participant(await readJson(request));
        if (!input) return errorResponse(400, 'invalid_input');
        return resultResponse(EventUseCase.updateParticipant(events, id, input));
      }),
      DELETE: withSession((request: BunRequest<'/api/event/participants/:id'>) => {
        const id = idParam(request.params.id);
        return id === null ? noContent() : resultResponse(EventUseCase.removeParticipant(events, id));
      }),
    },
    '/api/event/participants/:id/mail': {
      POST: withSession(async (request: BunRequest<'/api/event/participants/:id/mail'>) => {
        const id = idParam(request.params.id);
        if (id === null) return errorResponse(404, 'not_found');
        return resultResponse(await DrawUseCase.sendOne(draws, id));
      }),
    },
    '/api/event/exclusions': {
      POST: withSession(async (request) => {
        const input = Validation.exclusion(await readJson(request));
        if (!input) return errorResponse(400, 'invalid_input');
        return resultResponse(EventUseCase.addExclusion(events, input), 201);
      }),
    },
    '/api/event/exclusions/:id': {
      DELETE: withSession((request: BunRequest<'/api/event/exclusions/:id'>) => {
        const id = idParam(request.params.id);
        return id === null ? noContent() : resultResponse(EventUseCase.removeExclusion(events, id));
      }),
    },
    '/api/event/draw': {
      POST: withSession(() => resultResponse(DrawUseCase.draw(draws))),
      DELETE: withSession(() => resultResponse(DrawUseCase.cancel(draws))),
    },

    '/api/mail/open/:token': {
      GET: (request: BunRequest<'/api/mail/open/:token'>) => {
        DrawUseCase.recordOpen(draws, request.params.token);
        return new Response(PIXEL, { headers: { 'content-type': 'image/gif', 'cache-control': 'no-store' } });
      },
    },
  };
}
