export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeDetails = {
  en: {
    nativeName: 'English',
    shortName: 'EN',
  },
  zh: {
    nativeName: '中文',
    shortName: '中',
  },
  ja: {
    nativeName: '日本語',
    shortName: '日',
  },
} satisfies Record<
  Locale,
  {
    nativeName: string;
    shortName: string;
  }
>;

export function getLocalePath(locale: Locale) {
  return `/${locale}` as const;
}
