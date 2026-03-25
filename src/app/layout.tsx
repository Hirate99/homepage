import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/providers/theme-provider';

import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const siteUrl = 'https://mskyurina.top';
const ogImage = 'https://r2.mskyurina.top/fumikiri-mo.webp';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Haonan Su',
  description: 'Personal website of Haonan Su (苏浩南), a software engineer.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Haonan Su',
    title: 'Haonan Su',
    description: 'Personal website of Haonan Su (苏浩南), a software engineer.',
    images: [
      {
        url: ogImage,
        width: 500,
        height: 500,
        alt: 'Avatar of Haonan Su',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Haonan Su',
    description: 'Personal website of Haonan Su (苏浩南), a software engineer.',
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Haonan Su',
      url: siteUrl,
      jobTitle: 'Software Engineer',
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
        'https://www.instagram.com/kevinsu99/',
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
        <body className={cn(inter.className, 'bg-white')}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
