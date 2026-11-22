const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const formatted = dateFormat.format(new Date(year!, month! - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

/** « le 24/12 à 18:05 », in Paris time. */
export function formatMoment(isoDateTime: string): string {
  const moment = new Date(isoDateTime);
  return `le ${dayFormat.format(moment)} à ${timeFormat.format(moment)}`;
}
