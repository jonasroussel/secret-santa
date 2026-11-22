import { randomInt } from 'node:crypto';

export class Tokens {
  static random(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  }

  /** 6 digits, uniformly drawn, leading zeros included. */
  static code(): string {
    return randomInt(1_000_000).toString().padStart(6, '0');
  }

  static hash(token: string): string {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
  }
}
