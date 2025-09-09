import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { ThemeProvider } from '@/providers/theme-provider';

import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Haonan Su',
  description: 'Personal website of Haonan Su (苏浩南), a software engineer.',
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
      url: 'https://mskyurina.top',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Haonan Su',
      url: 'https://mskyurina.top',
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
    <html lang="en" suppressHydrationWarning>
      <Script
        id="json-ld-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        strategy="beforeInteractive"
      />
      <body className={cn(inter.className, 'bg-white')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
