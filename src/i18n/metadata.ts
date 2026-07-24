import { defaultLocale, getLocalePath, type Locale, locales } from './locales';

export const siteUrl = 'https://mskyurina.top';
export const ogImage = 'https://r2.mskyurina.top/fumikiri-mo.webp';

export const localeMetadata = {
  en: {
    openGraphLocale: 'en_US',
    keywords: [
      'Haonan Su',
      'software engineer',
      'photographer',
      'Los Angeles',
      'homepage',
      'photo atlas',
    ],
  },
  zh: {
    openGraphLocale: 'zh_CN',
    keywords: [
      '苏浩南',
      '软件工程师',
      '摄影师',
      '洛杉矶',
      '个人主页',
      '摄影图集',
    ],
  },
  ja: {
    openGraphLocale: 'ja_JP',
    keywords: [
      '蘇浩南',
      'ソフトウェアエンジニア',
      'フォトグラファー',
      'ロサンゼルス',
      'ホームページ',
      '写真アトラス',
    ],
  },
} satisfies Record<
  Locale,
  {
    openGraphLocale: string;
    keywords: string[];
  }
>;

export function getLocalizedUrl(locale: Locale) {
  return `${siteUrl}${getLocalePath(locale)}`;
}

export function getLanguageAlternates(absolute = false) {
  const prefix = absolute ? siteUrl : '';
  const entries = locales.map(
    (locale) => [locale, `${prefix}${getLocalePath(locale)}`] as const,
  );

  return {
    ...Object.fromEntries(entries),
    'x-default': `${prefix}${getLocalePath(defaultLocale)}`,
  } as Record<Locale | 'x-default', string>;
}

export function getAlternateOpenGraphLocales(locale: Locale) {
  return locales
    .filter((candidate) => candidate !== locale)
    .map((candidate) => localeMetadata[candidate].openGraphLocale);
}
