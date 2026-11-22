const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const formatted = dateFormat.format(new Date(year!, month! - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
