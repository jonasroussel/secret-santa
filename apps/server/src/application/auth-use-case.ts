import type { AuthRepository } from '../infrastructure/database/auth-repository.ts';
import { LoginCodeMail } from './login-code-mail.ts';
import type { Clock, Mailer } from './ports.ts';
import type { RateLimiter } from './rate-limiter.ts';
import { Tokens } from './tokens.ts';

export type AuthDeps = {
  repository: AuthRepository;
  clock: Clock;
  mailer: Mailer;
  limiter: RateLimiter;
  generateCode: () => string;
  adminEmails: ReadonlySet<string>;
};

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthUseCase {
  /**
   * Emails a sign-in code to admins only, but answers the same way for everyone so nobody learns who is an admin. The
   * mail is not awaited for the same reason (an SMTP round trip would show in the response time).
   */
  static requestCode(deps: AuthDeps, email: string): 'sent' | 'too_many_requests' {
    if (!deps.limiter.allow(email)) return 'too_many_requests';
    if (!deps.adminEmails.has(email)) return 'sent';

    const code = deps.generateCode();
    deps.repository.saveCode(email, Tokens.hash(code), deps.clock.now() + CODE_TTL_MS);
    deps.mailer
      .send(LoginCodeMail.build(email, code))
      .catch((error: unknown) => console.error(`Sign-in code email to ${email} failed:`, error));
    return 'sent';
  }

  /**
   * Consumes the code and returns a new session token, or `null` when the code is wrong, expired or used. After
   * too many wrong tries the code is deleted, so it cannot be guessed.
   */
  static verify(deps: AuthDeps, email: string, code: string): string | null {
    const now = deps.clock.now();
    const saved = deps.repository.findCode(email);
    if (!saved) return null;
    if (saved.expiresAt <= now) {
      deps.repository.deleteCode(email);
      return null;
    }
    if (saved.codeHash !== Tokens.hash(code)) {
      if (saved.failedAttempts + 1 >= MAX_FAILED_ATTEMPTS) deps.repository.deleteCode(email);
      else deps.repository.countFailedAttempt(email);
      return null;
    }

    deps.repository.deleteCode(email);
    if (!deps.adminEmails.has(email)) return null;
    const sessionToken = Tokens.random();
    deps.repository.addSession(Tokens.hash(sessionToken), email, now + SESSION_TTL_MS, now);
    return sessionToken;
  }

  /** The admin behind the session; an email removed from the admins loses its sessions. */
  static sessionEmail(deps: AuthDeps, sessionToken: string | null): string | null {
    if (!sessionToken) return null;
    const email = deps.repository.sessionEmail(Tokens.hash(sessionToken), deps.clock.now());
    return email && deps.adminEmails.has(email) ? email : null;
  }

  static logout(deps: AuthDeps, sessionToken: string | null): void {
    if (sessionToken) deps.repository.deleteSession(Tokens.hash(sessionToken));
  }
}
