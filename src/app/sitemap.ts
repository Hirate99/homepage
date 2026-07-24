import type { MetadataRoute } from 'next';

import { getLanguageAlternates, getLocalizedUrl } from '@/i18n/metadata';
import { locales } from '@/i18n/locales';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = getLanguageAlternates(true);

  return locales.map((locale) => ({
    url: getLocalizedUrl(locale),
    alternates: {
      languages,
    },
  }));
}
