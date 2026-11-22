import type { AuthRepository } from '../infrastructure/database/auth-repository.ts';
import { LoginCodeMail } from './login-code-mail.ts';
import type { Clock, Mailer } from './ports.ts';
import type { RateLimiter } from './rate-limiter.ts';
import { fail, ok, type Result } from './result.ts';
import { Tokens } from './tokens.ts';

export type AuthDeps = {
  repository: AuthRepository;
  clock: Clock;
  mailer: Mailer;
  limits: AuthLimits;
  generateCode: () => string;
  adminEmails: ReadonlySet<string>;
};

/** Checked per client address first, then per email: one address over its limit does not lock out an admin. */
export type AuthLimits = {
  requestsPerIp: RateLimiter;
  requestsPerEmail: RateLimiter;
  /** Failed sign-ins: each new code resets its own 5 tries, these cap guessing across codes. */
  failuresPerIp: RateLimiter;
  failuresPerEmail: RateLimiter;
};

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthUseCase {
  /**
   * Emails a sign-in code to admins only, but answers the same way for everyone so nobody learns who is an admin. The
   * mail is not awaited for the same reason (an SMTP round trip would show in the response time).
   */
  static requestCode(deps: AuthDeps, email: string, ip: string): 'sent' | 'too_many_requests' {
    if (!deps.limits.requestsPerIp.hit(ip) || !deps.limits.requestsPerEmail.hit(email)) return 'too_many_requests';
    if (!deps.adminEmails.has(email)) return 'sent';

    const code = deps.generateCode();
    deps.repository.saveCode(email, Tokens.hash(code), deps.clock.now() + CODE_TTL_MS);
    deps.mailer
      .send(LoginCodeMail.build(email, code))
      .catch((error: unknown) => console.error(`Sign-in code email to ${email} failed:`, error));
    return 'sent';
  }

  /**
   * Consumes the code and returns a new session token. After too many wrong tries the code is deleted, so it cannot
   * be guessed; past the daily caps of failures, sign-in waits for the window to end. Failures count for any email,
   * so an admin and a stranger get the same answers.
   */
  static verify(deps: AuthDeps, email: string, ip: string, code: string): Result<string> {
    const { failuresPerIp, failuresPerEmail } = deps.limits;
    if (failuresPerIp.blocked(ip) || failuresPerEmail.blocked(email)) return fail('too_many_requests');
    const now = deps.clock.now();
    const saved = deps.repository.findCode(email);
    if (!saved || saved.expiresAt <= now || saved.codeHash !== Tokens.hash(code)) {
      failuresPerIp.hit(ip);
      failuresPerEmail.hit(email);
      if (saved && (saved.expiresAt <= now || saved.failedAttempts + 1 >= MAX_FAILED_ATTEMPTS)) {
        deps.repository.deleteCode(email);
      } else if (saved) deps.repository.countFailedAttempt(email);
      return fail('invalid_code');
    }

    deps.repository.deleteCode(email);
    if (!deps.adminEmails.has(email)) return fail('invalid_code');
    const sessionToken = Tokens.random();
    deps.repository.addSession(Tokens.hash(sessionToken), email, now + SESSION_TTL_MS, now);
    return ok(sessionToken);
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
