import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    en: 'https://mskyurina.top/en',
    zh: 'https://mskyurina.top/zh',
  };

  return Object.values(languages).map((url) => ({
    url,
    alternates: {
      languages: {
        ...languages,
        'x-default': languages.en,
      },
    },
  }));
}
