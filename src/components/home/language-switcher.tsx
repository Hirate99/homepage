'use client';

import { useSearchParams } from 'next/navigation';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

import { ActionTooltip } from './action-tooltip';
import { heroActionClass } from './hero-styles';

export function LanguageSwitcher({ songId }: { songId: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('LanguageSwitcher');
  const targetLocale = locale === 'en' ? 'zh' : 'en';
  const targetLanguage = targetLocale === 'zh' ? t('chinese') : t('english');
  const targetLabel =
    targetLocale === 'zh' ? t('chineseShort') : t('englishShort');
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set('song', songId);
  const href = `${pathname}?${nextSearchParams.toString()}`;
  const accessibleLabel = t('switchTo', { language: targetLanguage });

  return (
    <ActionTooltip label={accessibleLabel}>
      <Link
        className={heroActionClass}
        href={href}
        locale={targetLocale}
        hrefLang={targetLocale}
        lang={targetLocale}
        aria-label={accessibleLabel}
        onClick={(event) => {
          if (window.location.hash) {
            event.currentTarget.href += window.location.hash;
          }
        }}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase">{targetLabel}</span>
      </Link>
    </ActionTooltip>
  );
}
