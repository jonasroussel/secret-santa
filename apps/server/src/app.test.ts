import { afterEach, expect, test } from 'bun:test';

import type { Participant, SecretSantaEvent } from '@secret-santa/shared';

import { createApp } from './app.ts';
import type { Mail } from './application/ports.ts';
import { createDatabase, migrate } from './infrastructure/database/connection.ts';

const ADMIN = 'papa@example.com';
let stopServer = () => {};

afterEach(() => stopServer());

function startApp() {
  const database = createDatabase(':memory:');
  migrate(database);
  const clock = { time: Date.UTC(2026, 10, 22), now: () => clock.time };
  const mails: Mail[] = [];
  const server = Bun.serve({
    port: 0,
    routes: createApp({
      version: 'test',
      database,
      clock,
      mailer: { send: async (mail) => void mails.push(mail) },
      appUrl: 'http://localhost:5173',
      adminEmails: new Set([ADMIN]),
    }),
  });
  stopServer = () => server.stop(true);

  const call = (method: string, path: string, body?: unknown, cookie?: string) =>
    fetch(new URL(path, server.url), {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const requestToken = async (email = ADMIN) => {
    await call('POST', '/api/auth/request-link', { email });
    return mails.at(-1)?.text.match(/connexion\?token=([\w-]+)/)?.[1];
  };

  const signIn = async () => {
    const response = await call('POST', '/api/auth/verify', { token: await requestToken() });
    return response.headers.get('set-cookie')!.split(';')[0]!;
  };

  return { call, clock, mails, requestToken, signIn };
}

test('an admin signs in with the emailed link', async () => {
  const { call, mails, requestToken } = startApp();

  const token = await requestToken(' Papa@Example.com ');
  expect(mails.map((mail) => mail.to)).toEqual([ADMIN]);

  const verify = await call('POST', '/api/auth/verify', { token });
  expect(verify.status).toBe(204);
  const cookie = verify.headers.get('set-cookie')!;
  expect(cookie).toContain('HttpOnly');

  const session = await call('GET', '/api/session', undefined, cookie.split(';')[0]);
  expect(await session.json()).toEqual({ email: ADMIN });
});

test('a link works only once and only for 15 minutes', async () => {
  const { call, clock, requestToken } = startApp();

  const token = await requestToken();
  expect((await call('POST', '/api/auth/verify', { token })).status).toBe(204);
  expect(await (await call('POST', '/api/auth/verify', { token })).json()).toEqual({ error: 'invalid_link' });

  const late = await requestToken();
  clock.time += 15 * 60 * 1000;
  expect((await call('POST', '/api/auth/verify', { token: late })).status).toBe(401);
});

test('an unknown email gets the same answer but no mail', async () => {
  const { call, mails } = startApp();

  const response = await call('POST', '/api/auth/request-link', { email: 'someone@example.com' });

  expect(response.status).toBe(204);
  expect(mails).toEqual([]);
});

test('the admin pages need a session', async () => {
  const { call } = startApp();

  const response = await call('GET', '/api/event');

  expect(response.status).toBe(401);
});

test('two participants cannot have the same first name', async () => {
  const { call, signIn } = startApp();
  const cookie = await signIn();
  await call('PUT', '/api/event', { name: 'Noël 2026', date: '2026-12-24', budget: 30 }, cookie);
  await call('POST', '/api/event/participants', { name: 'Hélène', email: 'helene@example.com' }, cookie);

  const response = await call('POST', '/api/event/participants', { name: ' helene ', email: 'a@example.com' }, cookie);

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: 'duplicate_name' });
});

test('deleting a participant removes its exclusions', async () => {
  const { call, signIn } = startApp();
  const cookie = await signIn();
  await call('PUT', '/api/event', { name: 'Noël 2026', date: '2026-12-24', budget: null }, cookie);
  const add = async (name: string) => {
    const response = await call('POST', '/api/event/participants', { name, email: 'famille@example.com' }, cookie);
    return (await response.json()) as Participant;
  };
  const [anne, paul, marie] = [await add('Anne'), await add('Paul'), await add('Marie')];
  await call('POST', '/api/event/exclusions', { participantIds: [paul.id, anne.id] }, cookie);
  await call('POST', '/api/event/exclusions', { participantIds: [paul.id, marie.id] }, cookie);
  await call('POST', '/api/event/exclusions', { participantIds: [anne.id, marie.id] }, cookie);

  await call('DELETE', `/api/event/participants/${paul.id}`, undefined, cookie);

  const event = (await (await call('GET', '/api/event', undefined, cookie)).json()) as SecretSantaEvent;
  expect(event.participants.map((participant) => participant.name)).toEqual(['Anne', 'Marie']);
  expect(event.exclusions.map((exclusion) => exclusion.participantIds)).toEqual([[anne.id, marie.id]]);
});
