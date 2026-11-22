import type { Participant, SecretSantaEvent } from '@secret-santa/shared';

import { Draw } from '../domain/draw.ts';
import type { EventRepository, MailToSend } from '../infrastructure/database/event-repository.ts';
import { ParticipantMail } from './participant-mail.ts';
import type { Clock, Mailer } from './ports.ts';
import { fail, ok, type Result } from './result.ts';
import { Tokens } from './tokens.ts';

export type DrawDeps = {
  repository: EventRepository;
  mailer: Mailer;
  clock: Clock;
  appUrl: string;
  /** Mail test mode: the admins receive the participant mails. */
  testRecipients: string[] | null;
};

const MIN_PARTICIPANTS = 3;

/** Who gives to whom stays on the server: no response or log of this use case contains it. */
export class DrawUseCase {
  static draw({ repository, clock }: DrawDeps): Result<SecretSantaEvent> {
    const event = repository.find();
    if (!event) return fail('not_found');
    if (event.drawnAt) return fail('draw_locked');
    if (event.participants.length < MIN_PARTICIPANTS) return fail('not_enough_participants');

    const assignments = Draw.assign(
      event.participants.map((participant) => participant.id),
      event.exclusions.map((exclusion) => exclusion.participantIds),
    );
    if (!assignments) return fail('draw_impossible');
    repository.saveDraw(assignments, clock.now());
    return ok(repository.find()!);
  }

  static cancel({ repository }: DrawDeps): Result<SecretSantaEvent> {
    if (!repository.exists()) return fail('not_found');
    if (!repository.isDrawn()) return fail('not_drawn');
    repository.cancelDraw();
    return ok(repository.find()!);
  }

  static async sendOne(deps: DrawDeps, participantId: number): Promise<Result<Participant>> {
    const event = deps.repository.find();
    if (!event) return fail('not_found');
    if (!event.drawnAt) return fail('not_drawn');
    // The admins have read this draw's assignments: it must be redone before going live.
    if (event.drawTested && deps.testRecipients === null) return fail('draw_tested');
    const mail = deps.repository.mailToSend(participantId);
    if (!mail) return fail('not_found');
    await DrawUseCase.#send(deps, event, mail);
    return ok(deps.repository.findParticipant(participantId)!);
  }

  static recordOpen({ repository, clock }: DrawDeps, token: string): void {
    repository.recordMailOpened(Tokens.hash(token), clock.now());
  }

  /**
   * A new pixel token for every send, so only the latest mail counts as opened. When the draw is cancelled while the
   * mail is out, the result is not recorded; a participant who got it will see the « tirage refait » notice next time.
   */
  static async #send(deps: DrawDeps, event: SecretSantaEvent, mail: MailToSend) {
    const { repository, mailer, clock, appUrl, testRecipients } = deps;
    const token = Tokens.random();
    try {
      const pixelUrl = `${appUrl}/api/mail/open/${token}`;
      await mailer.send(ParticipantMail.build({ ...mail, event, pixelUrl, testRecipients }));
      const inTestMode = testRecipients !== null;
      const recorded = repository.recordMailSent(mail, Tokens.hash(token), clock.now(), inTestMode);
      if (!recorded && !inTestMode) repository.flagReceivedCancelledDraw(mail.giverId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      repository.recordMailFailed(mail, message);
      console.error(`Mail to participant ${mail.giverId} failed: ${message}`);
    }
  }
}
