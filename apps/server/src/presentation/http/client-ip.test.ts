import { expect, test } from 'bun:test';

import { resolveClientIp } from './client-ip.ts';

const forwarded = new Request('http://localhost/', { headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.7 ' } });

test('from the proxy (a private or loopback peer) the rightmost X-Forwarded-For entry is the client', () => {
  for (const peer of ['127.0.0.1', '::1', '172.18.0.1', '10.1.2.3', '192.168.1.5', 'fd12::1', '::ffff:172.17.0.1']) {
    expect(resolveClientIp(forwarded, peer, true)).toBe('198.51.100.7');
  }
  expect(resolveClientIp(new Request('http://localhost/'), '172.18.0.1', true)).toBe('172.18.0.1');
});

test('X-Forwarded-For is ignored from a public peer, or when the proxy is not trusted', () => {
  expect(resolveClientIp(forwarded, '203.0.113.9', true)).toBe('203.0.113.9');
  expect(resolveClientIp(forwarded, '172.32.0.1', true)).toBe('172.32.0.1');
  expect(resolveClientIp(forwarded, '::ffff:8.8.8.8', true)).toBe('::ffff:8.8.8.8');
  expect(resolveClientIp(forwarded, '127.0.0.1', false)).toBe('127.0.0.1');
});
