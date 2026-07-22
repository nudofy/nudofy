import { toSupportedLanguage, type SupportedLanguage } from '@/i18n';

const CURRENCY_LOCALES: Record<SupportedLanguage, string> = {
  es: 'es-ES',
  fr: 'fr-FR',
  en: 'en-GB',
};

export function formatEur(amount: number, language: string): string {
  const locale = CURRENCY_LOCALES[toSupportedLanguage(language)];
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatOrderDate(
  iso: string,
  language: string,
  labels: { today: string; yesterday: string },
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
): string {
  const locale = CURRENCY_LOCALES[toSupportedLanguage(language)];
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
    return `${labels.today} · ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return labels.yesterday;
  return new Intl.DateTimeFormat(locale, options).format(d);
}
