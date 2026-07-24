import 'server-only';

import type { Locale } from '@/i18n/locales';

export async function getLocalizedIntro(locale: Locale) {
  return (await import(`./intro.${locale}.md`)).default;
}
