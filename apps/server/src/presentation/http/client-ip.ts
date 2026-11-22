/**
 * The client's address. Behind our reverse proxy (`trustProxy`), it is the rightmost `X-Forwarded-For` entry, the one
 * the proxy added (entries on its left come from the client). That header is believed only when the connection comes
 * from the proxy, i.e. a loopback or private address: anyone reaching the port directly could write it.
 */
export function resolveClientIp(request: Request, peer: string | undefined, trustProxy: boolean): string {
  if (!peer) return 'unknown';
  if (!trustProxy || !isPrivate(peer)) return peer;
  return request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || peer;
}

/** Loopback or private ranges: 127.0.0.0/8, 10/8, 172.16/12, 192.168/16, ::1, fc00::/7 (IPv4-mapped forms too). */
function isPrivate(address: string): boolean {
  const ip = address.toLowerCase().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  const ipv4 = ip.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (ipv4) {
    const [first, second] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      first === 127 ||
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
  return ip === '::1' || /^f[cd][0-9a-f]{0,2}:/.test(ip);
}
