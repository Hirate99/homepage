import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const siteUrl = 'https://mskyurina.top';
const ogImage = 'https://r2.mskyurina.top/fumikiri-mo.webp';
const siteDescription =
  'Portfolio of Haonan Su (苏浩南), a software engineer and photographer in Los Angeles, featuring selected work and a place-based photo atlas.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Haonan Su — Software Engineer & Photographer',
  description: siteDescription,
  authors: [{ name: 'Haonan Su', url: siteUrl }],
  creator: 'Haonan Su',
  keywords: [
    'Haonan Su',
    '苏浩南',
    'software engineer',
    'photographer',
    'Los Angeles',
    'portfolio',
    'photo atlas',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Haonan Su',
    locale: 'en_US',
    title: 'Haonan Su — Software Engineer & Photographer',
    description: siteDescription,
    images: [
      {
        url: ogImage,
        width: 500,
        height: 500,
        alt: 'Photographic work by Haonan Su',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Haonan Su — Software Engineer & Photographer',
    description: siteDescription,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Haonan Su',
      url: siteUrl,
      description: siteDescription,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Haonan Su',
      alternateName: '苏浩南',
      url: siteUrl,
      image: ogImage,
      jobTitle: 'Software Engineer',
      knowsAbout: ['Software engineering', 'Photography'],
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
    <>
      <head>
        <script
          id="json-ld-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <html lang="en" suppressHydrationWarning>
        <body className={cn(inter.className, 'bg-white')}>{children}</body>
      </html>
    </>
  );
}
