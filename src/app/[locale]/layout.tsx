import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

import '../globals.css';

const inter = Inter({ subsets: ['latin'] });
const siteUrl = 'https://mskyurina.top';
const ogImage = 'https://r2.mskyurina.top/fumikiri-mo.webp';

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const canonical = `/${locale}`;

  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    authors: [{ name: 'Haonan Su', url: siteUrl }],
    creator: 'Haonan Su',
    keywords:
      locale === 'zh'
        ? ['苏浩南', '软件工程师', '摄影师', '洛杉矶', '个人主页', '摄影图集']
        : [
            'Haonan Su',
            'software engineer',
            'photographer',
            'Los Angeles',
            'homepage',
            'photo atlas',
          ],
    alternates: {
      canonical,
      languages: {
        en: '/en',
        zh: '/zh',
        'x-default': '/en',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Haonan Su',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? ['en_US'] : ['zh_CN'],
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: ogImage,
          width: 500,
          height: 500,
          alt: t('imageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [ogImage],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const localizedUrl = `${siteUrl}/${locale}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t('title'),
      url: localizedUrl,
      inLanguage: locale,
      description: t('description'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Haonan Su',
      alternateName: '苏浩南',
      url: localizedUrl,
      image: ogImage,
      jobTitle: t('jobTitle'),
      knowsAbout: [t('softwareEngineering'), t('photography')],
      alumniOf: [
        {
          '@type': 'EducationalOrganization',
          name: 'University of Southern California',
        },
        {
          '@type': 'EducationalOrganization',
          name: 'Peking University',
        },
      ],
      sameAs: [
        'https://github.com/Hirate99',
        'https://www.linkedin.com/in/haonansu/',
        'https://www.instagram.com/mskyurina/',
      ],
    },
  ];

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          id="json-ld-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={cn(inter.className, 'bg-white')}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
