export class Tokens {
  static random(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  }

  static hash(token: string): string {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
  }
}
