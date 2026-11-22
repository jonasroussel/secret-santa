import type { EventDetails, ExclusionInput, ParticipantInput } from '@secret-santa/shared';

export class Validation {
  /** Trimmed and lowercased, or `null` when it does not look like an email. */
  static email(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }

  static eventDetails(value: unknown): EventDetails | null {
    const { name, date, budget } = Validation.#record(value);
    const trimmedName = Validation.#text(name, 80);
    if (trimmedName === null || !Validation.#isDate(date) || !Validation.#isBudget(budget)) return null;
    return { name: trimmedName, date, budget };
  }

  static participant(value: unknown): ParticipantInput | null {
    const { name, email } = Validation.#record(value);
    const trimmedName = Validation.#text(name, 50);
    const validEmail = Validation.email(email);
    return trimmedName !== null && validEmail !== null ? { name: trimmedName, email: validEmail } : null;
  }

  static exclusion(value: unknown): ExclusionInput | null {
    const { participantIds: ids } = Validation.#record(value);
    if (!Array.isArray(ids) || ids.length !== 2 || !ids.every(Number.isInteger)) return null;
    const [first, second] = ids as [number, number];
    return first === second ? null : { participantIds: [first, second] };
  }

  /** What makes two names the same person: case, accents and spaces do not count. */
  static nameKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  static #record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  }

  static #text(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text.length >= 1 && text.length <= maxLength ? text : null;
  }

  static #isDate(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().startsWith(value)
    );
  }

  static #isBudget(value: unknown): value is number | null {
    return value === null || (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10000);
  }
}
