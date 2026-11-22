import type { ApiErrorCode } from '@/lib/api.ts';

const messages: Record<ApiErrorCode, string> = {
  not_found: 'Cet élément n’existe plus. Recharge la page.',
  unauthorized: 'Ta session a expiré. Reconnecte-toi.',
  invalid_input: 'Vérifie les informations saisies.',
  invalid_code: 'Ce code n’est pas bon ou a expiré.',
  too_many_requests: 'Trop de demandes. Réessaie dans quelques minutes.',
  duplicate_name: 'Ce prénom est déjà dans la liste.',
  duplicate_exclusion: 'Ce couple est déjà dans la liste.',
  draw_locked: 'Le tirage est fait : la liste ne peut plus changer.',
  not_drawn: 'Le tirage n’a pas encore été fait.',
  not_enough_participants: 'Il faut au moins 3 participants pour faire le tirage.',
  draw_impossible: 'Le tirage est impossible avec ces exclusions. Retire un couple et réessaie.',
  draw_tested: 'Ce tirage a été envoyé en mode test. Annule-le et refais-le avant d’envoyer les vrais mails.',
  network: 'Connexion impossible. Vérifie ta connexion internet et réessaie.',
};

export function errorMessage(error: ApiErrorCode, overrides: Partial<Record<ApiErrorCode, string>> = {}): string {
  return overrides[error] ?? messages[error];
}
