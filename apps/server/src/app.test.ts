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
  let codes = 0;
  const server = Bun.serve({
    port: 0,
    routes: createApp({
      version: 'test',
      database,
      clock,
      mailer: { send: async (mail) => void mails.push(mail) },
      generateCode: () => String(++codes).padStart(6, '0'),
      secureCookie: false,
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

  const requestCode = async (email = ADMIN) => {
    await call('POST', '/api/auth/request-code', { email });
    return mails.at(-1)?.text.match(/^\d{6}$/m)?.[0];
  };
  const verify = (code: string | undefined) => call('POST', '/api/auth/verify', { email: ADMIN, code });

  const signIn = async () => {
    const response = await verify(await requestCode());
    return response.headers.get('set-cookie')!.split(';')[0]!;
  };

  return { call, clock, mails, requestCode, verify, signIn };
}

test('an admin signs in with the emailed code', async () => {
  const { call, mails, requestCode } = startApp();

  const code = await requestCode(' Papa@Example.com ');
  expect(mails.map((mail) => [mail.to, mail.subject])).toEqual([[ADMIN, `${code} — ton code Secret Santa`]]);

  const verify = await call('POST', '/api/auth/verify', { email: 'PAPA@example.com', code });
  expect(verify.status).toBe(204);
  const cookie = verify.headers.get('set-cookie')!;
  expect(cookie).toContain('HttpOnly');

  const session = await call('GET', '/api/session', undefined, cookie.split(';')[0]);
  expect(await session.json()).toEqual({ email: ADMIN });
});

test('a code works only once and only for 15 minutes', async () => {
  const { clock, requestCode, verify } = startApp();

  const code = await requestCode();
  expect((await verify(code)).status).toBe(204);
  expect(await (await verify(code)).json()).toEqual({ error: 'invalid_code' });

  const late = await requestCode();
  clock.time += 15 * 60 * 1000;
  expect((await verify(late)).status).toBe(401);
});

test('after 5 wrong codes even the right one is refused', async () => {
  const { requestCode, verify } = startApp();

  const code = await requestCode();
  for (let attempt = 0; attempt < 5; attempt++) expect((await verify('999999')).status).toBe(401);

  expect((await verify(code)).status).toBe(401);
});

test('an unknown email gets the same answer but no mail', async () => {
  const { call, mails } = startApp();

  const response = await call('POST', '/api/auth/request-code', { email: 'someone@example.com' });

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
