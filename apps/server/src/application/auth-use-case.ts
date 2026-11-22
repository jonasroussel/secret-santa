import type { AuthRepository } from '../infrastructure/database/auth-repository.ts';
import type { Clock, Mailer } from './ports.ts';
import type { RateLimiter } from './rate-limiter.ts';
import { Tokens } from './tokens.ts';

export type AuthDeps = {
  repository: AuthRepository;
  clock: Clock;
  mailer: Mailer;
  limiter: RateLimiter;
  appUrl: string;
  adminEmails: ReadonlySet<string>;
};

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthUseCase {
  /**
   * Emails a login link to admins only, but answers the same way for everyone so nobody learns who is an admin. The
   * mail is not awaited for the same reason (an SMTP round trip would show in the response time).
   */
  static requestLink(deps: AuthDeps, email: string): 'sent' | 'too_many_requests' {
    if (!deps.limiter.allow(email)) return 'too_many_requests';
    if (!deps.adminEmails.has(email)) return 'sent';

    const now = deps.clock.now();
    const token = Tokens.random();
    deps.repository.addLoginToken(Tokens.hash(token), email, now + LOGIN_TOKEN_TTL_MS, now);
    const link = `${deps.appUrl}/connexion?token=${token}`;
    deps.mailer
      .send({
        to: email,
        subject: 'Ton lien de connexion — Secret Santa',
        text: [
          'Bonjour,',
          '',
          'Voici ton lien pour te connecter à l’organisation du Secret Santa :',
          '',
          link,
          '',
          'Ce lien est valable 15 minutes et ne fonctionne qu’une seule fois.',
          'Si tu n’as pas demandé à te connecter, ignore simplement ce message.',
        ].join('\n'),
      })
      .catch((error: unknown) => console.error(`Login email to ${email} failed:`, error));
    return 'sent';
  }

  /** Consumes the login token and returns a new session token, or `null` when the link is not valid. */
  static verify(deps: AuthDeps, token: string): string | null {
    const now = deps.clock.now();
    const email = deps.repository.useLoginToken(Tokens.hash(token), now);
    if (!email || !deps.adminEmails.has(email)) return null;

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
