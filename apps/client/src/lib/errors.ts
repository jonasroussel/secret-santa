import type { ApiErrorCode } from '@/lib/api.ts';

const messages: Record<ApiErrorCode, string> = {
  not_found: 'Cet élément n’existe plus. Recharge la page.',
  unauthorized: 'Ta session a expiré. Reconnecte-toi.',
  invalid_input: 'Vérifie les informations saisies.',
  invalid_code: 'Ce code n’est pas bon ou a expiré.',
  too_many_requests: 'Trop de demandes. Réessaie dans quelques minutes.',
  duplicate_name: 'Ce prénom est déjà dans la liste.',
  duplicate_exclusion: 'Ce couple est déjà dans la liste.',
  network: 'Connexion impossible. Vérifie ta connexion internet et réessaie.',
};

export function errorMessage(error: ApiErrorCode, overrides: Partial<Record<ApiErrorCode, string>> = {}): string {
  return overrides[error] ?? messages[error];
}
