import { afterEach, expect, test } from 'bun:test';

import type { Participant, SecretSantaEvent } from '@secret-santa/shared';

import { createApp } from './app.ts';
import type { Mail } from './application/ports.ts';
import { createDatabase, migrate } from './infrastructure/database/connection.ts';

const ADMIN = 'papa@example.com';
const EVENT = { name: 'Noël 2026', date: '2026-12-24', budget: 30, message: null };
let stopServer = () => {};

afterEach(() => stopServer());

function startApp() {
  const database = createDatabase(':memory:');
  migrate(database);
  const clock = { time: Date.UTC(2026, 10, 22), now: () => clock.time };
  const mails: Mail[] = [];
  const failingEmails = new Set<string>();
  let codes = 0;
  const server = Bun.serve({
    port: 0,
    routes: createApp({
      version: 'test',
      database,
      clock,
      mailer: {
        send: async (mail) => {
          if (failingEmails.has(mail.to)) throw new Error('Mailbox unavailable');
          mails.push(mail);
        },
      },
      appUrl: 'https://secret-santa.test',
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

  /** Signed in, with an event; `as` calls the API as the organizer. */
  const organizer = async () => {
    const signedIn = await verify(await requestCode());
    const cookie = signedIn.headers.get('set-cookie')!.split(';')[0]!;
    const as = (method: string, path: string, body?: unknown) => call(method, path, body, cookie);
    await as('PUT', '/api/event', EVENT);
    const add = async (name: string) => {
      const response = await as('POST', '/api/event/participants', {
        name,
        email: `${name.toLowerCase()}@example.com`,
      });
      return (await response.json()) as Participant;
    };
    const event = async () => (await (await as('GET', '/api/event')).json()) as SecretSantaEvent;
    /** Like the page: one participant after the other, in display order. */
    const sendMails = async () => {
      for (const { id } of (await event()).participants) await as('POST', `/api/event/participants/${id}/mail`);
    };
    mails.length = 0;
    return { as, add, event, sendMails };
  };

  return { call, clock, mails, failingEmails, requestCode, verify, organizer };
}

const giverIn = (mail: Mail) => mail.text.match(/^Bonjour (.+),$/m)?.[1];
const receiverIn = (mail: Mail) => mail.text.match(/^ {4}(.+)$/m)?.[1];
const pixelIn = (mail: Mail) => mail.html?.match(/\/api\/mail\/open\/([\w-]+)/)?.[1];

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
  const { organizer } = startApp();
  const { as, add } = await organizer();
  await add('Hélène');

  const response = await as('POST', '/api/event/participants', { name: ' helene ', email: 'a@example.com' });

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: 'duplicate_name' });
});

test('deleting a participant removes its exclusions', async () => {
  const { organizer } = startApp();
  const { as, add, event } = await organizer();
  const [anne, paul, marie] = [await add('Anne'), await add('Paul'), await add('Marie')];
  await as('POST', '/api/event/exclusions', { participantIds: [paul.id, anne.id] });
  await as('POST', '/api/event/exclusions', { participantIds: [paul.id, marie.id] });
  await as('POST', '/api/event/exclusions', { participantIds: [anne.id, marie.id] });

  await as('DELETE', `/api/event/participants/${paul.id}`);

  const { participants, exclusions } = await event();
  expect(participants.map((participant) => participant.name)).toEqual(['Anne', 'Marie']);
  expect(exclusions.map((exclusion) => exclusion.participantIds)).toEqual([[anne.id, marie.id]]);
});

test('every draw respects self-giving and the exclusions, both ways', async () => {
  const { organizer, mails } = startApp();
  const { as, add, sendMails } = await organizer();
  const [anne, paul, marie, luc] = [await add('Anne'), await add('Paul'), await add('Marie'), await add('Luc')];
  await as('POST', '/api/event/exclusions', { participantIds: [anne.id, paul.id] });
  await as('POST', '/api/event/exclusions', { participantIds: [marie.id, luc.id] });
  const forbidden = ['Anne→Paul', 'Paul→Anne', 'Marie→Luc', 'Luc→Marie'];
  const seen = new Set<string>();

  for (let run = 0; run < 40; run++) {
    mails.length = 0;
    expect((await as('POST', '/api/event/draw')).status).toBe(200);
    await sendMails();
    const pairs = mails.map((mail) => `${giverIn(mail)}→${receiverIn(mail)}`);
    expect(new Set(mails.map(receiverIn)).size).toBe(4);
    for (const pair of pairs) {
      expect(forbidden).not.toContain(pair);
      expect(pair.split('→')[0]).not.toBe(pair.split('→')[1]);
      seen.add(pair);
    }
    await as('DELETE', '/api/event/draw');
  }
  // Each of the 8 allowed pairs comes up: the draw is not stuck on one assignment.
  expect(seen.size).toBe(8);
});

test('a draw the exclusions make impossible is refused, and so is one with fewer than 3 people', async () => {
  const { organizer } = startApp();
  const { as, add } = await organizer();
  const [anne, paul] = [await add('Anne'), await add('Paul')];

  expect(await (await as('POST', '/api/event/draw')).json()).toEqual({ error: 'not_enough_participants' });

  const marie = await add('Marie');
  await as('POST', '/api/event/exclusions', { participantIds: [anne.id, paul.id] });
  await as('POST', '/api/event/exclusions', { participantIds: [anne.id, marie.id] });
  const response = await as('POST', '/api/event/draw');

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: 'draw_impossible' });
});

test('after the draw the list is locked, except for emails', async () => {
  const { organizer } = startApp();
  const { as, add } = await organizer();
  const [anne, paul] = [await add('Anne'), await add('Paul'), await add('Marie')];
  await as('POST', '/api/event/draw');

  const attempts = [
    await as('POST', '/api/event/participants', { name: 'Luc', email: 'luc@example.com' }),
    await as('DELETE', `/api/event/participants/${anne.id}`),
    await as('PUT', `/api/event/participants/${anne.id}`, { name: 'Annie', email: anne.email }),
    await as('POST', '/api/event/exclusions', { participantIds: [anne.id, paul.id] }),
    await as('POST', '/api/event/draw'),
  ];
  for (const response of attempts) expect(await response.json()).toEqual({ error: 'draw_locked' });

  const emailChange = await as('PUT', `/api/event/participants/${anne.id}`, { name: 'Anne', email: 'anne@new.fr' });
  expect(emailChange.status).toBe(200);
});

test('after a cancelled draw whose mails went out, the new mails say the draw was redone', async () => {
  const { organizer, mails } = startApp();
  const { as, add, sendMails } = await organizer();
  for (const name of ['Anne', 'Paul', 'Marie']) await add(name);
  await as('POST', '/api/event/draw');
  await sendMails();
  expect(mails.some((mail) => mail.text.includes('tirage a été refait'))).toBe(false);

  const cancel = await as('DELETE', '/api/event/draw');
  expect(((await cancel.json()) as SecretSantaEvent).drawnAt).toBeNull();
  expect((await as('POST', '/api/event/participants', { name: 'Luc', email: 'luc@example.com' })).status).toBe(201);
  mails.length = 0;
  await as('POST', '/api/event/draw');
  await sendMails();

  const redone = mails.filter((mail) => mail.text.includes('Le tirage a été refait'));
  expect(redone.map((mail) => mail.to).toSorted()).toEqual([
    'anne@example.com',
    'marie@example.com',
    'paul@example.com',
  ]);
});

test('the organizer never sees who gives to whom', async () => {
  const { organizer } = startApp();
  const { as, add, event, sendMails } = await organizer();
  for (const name of ['Anne', 'Paul', 'Marie']) await add(name);
  await as('POST', '/api/event/draw');
  await sendMails();

  const { participants, ...details } = await event();

  expect(Object.keys(details).toSorted()).toEqual(['budget', 'date', 'drawnAt', 'exclusions', 'message', 'name']);
  for (const participant of participants) {
    expect(Object.keys(participant).toSorted()).toEqual([
      'email',
      'id',
      'mailOpenedAt',
      'mailSentAt',
      'mailStatus',
      'name',
    ]);
  }
});

test('only the latest mail of a participant counts as opened', async () => {
  const { organizer, mails, call } = startApp();
  const { as, add, event, sendMails } = await organizer();
  const [anne] = [await add('Anne'), await add('Paul'), await add('Marie')];
  await as('POST', '/api/event/draw');
  await sendMails();
  const firstPixel = pixelIn(mails.find((mail) => mail.to === anne.email)!);
  await as('POST', `/api/event/participants/${anne.id}/mail`);
  const latestPixel = pixelIn(mails.at(-1)!);

  const unknown = await call('GET', '/api/mail/open/unknown-token');
  expect([unknown.status, unknown.headers.get('content-type')]).toEqual([200, 'image/gif']);
  await call('GET', `/api/mail/open/${firstPixel}`);
  expect((await event()).participants[0]!.mailStatus).toBe('sent');

  await call('GET', `/api/mail/open/${latestPixel}`);
  const opened = (await event()).participants[0]!;
  expect([opened.mailStatus, opened.mailOpenedAt]).toEqual(['opened', new Date(Date.UTC(2026, 10, 22)).toISOString()]);
});

test('a mail the server could not send is marked failed until it is sent again', async () => {
  const { organizer, failingEmails, mails } = startApp();
  const { as, add, event } = await organizer();
  const [, paul] = [await add('Anne'), await add('Paul'), await add('Marie')];
  await as('POST', '/api/event/draw');
  failingEmails.add(paul.email);

  const failed = (await (await as('POST', `/api/event/participants/${paul.id}/mail`)).json()) as Participant;
  expect([failed.mailStatus, failed.mailSentAt, mails]).toEqual(['failed', null, []]);

  failingEmails.clear();
  await as('POST', `/api/event/participants/${paul.id}/mail`);
  expect(mails.map((mail) => mail.to)).toEqual([paul.email]);
  expect((await event()).participants.map((participant) => participant.mailStatus)).toEqual([
    'not_sent',
    'sent',
    'not_sent',
  ]);
});
