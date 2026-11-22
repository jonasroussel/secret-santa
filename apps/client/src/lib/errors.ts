import type { ApiErrorCode } from '@/lib/api.ts';

const messages: Record<ApiErrorCode, string> = {
  not_found: 'Cet élément n’existe plus. Rechargez la page.',
  unauthorized: 'Votre session a expiré. Reconnectez-vous.',
  invalid_input: 'Vérifiez les informations saisies.',
  invalid_link: 'Ce lien n’est plus valable.',
  too_many_requests: 'Trop de demandes. Réessayez dans quelques minutes.',
  duplicate_name: 'Ce prénom est déjà dans la liste.',
  duplicate_exclusion: 'Ce couple est déjà dans la liste.',
  network: 'Connexion impossible. Vérifiez votre connexion internet et réessayez.',
};

export function errorMessage(error: ApiErrorCode, overrides: Partial<Record<ApiErrorCode, string>> = {}): string {
  return overrides[error] ?? messages[error];
}
