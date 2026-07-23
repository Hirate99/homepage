'use client';

import { useSearchParams } from 'next/navigation';

import { Check, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { type Locale, localeDetails, locales } from '@/i18n/locales';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

import { heroActionClass } from './hero-styles';

export type LanguageSwitcherProps = {
  songId: string;
};

export function LanguageSwitcher({ songId }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('LanguageSwitcher');
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set('song', songId);
  const href = `${pathname}?${nextSearchParams.toString()}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={heroActionClass}
          aria-label={t('label')}
          title={t('label')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase">
            {localeDetails[locale].shortName}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-40 rounded-none border border-[var(--hero-rule)] bg-[var(--hero-bg)] p-1 text-[var(--hero-ink)] shadow-lg"
      >
        <nav aria-label={t('label')}>
          <ul>
            {locales.map((optionLocale) => (
              <LanguageOption
                key={optionLocale}
                href={href}
                locale={optionLocale}
                current={optionLocale === locale}
                label={localeDetails[optionLocale].nativeName}
                shortLabel={localeDetails[optionLocale].shortName}
                accessibleLabel={
                  optionLocale === locale
                    ? t('currentLanguage', {
                        language: localeDetails[optionLocale].nativeName,
                      })
                    : t('switchTo', {
                        language: localeDetails[optionLocale].nativeName,
                      })
                }
              />
            ))}
          </ul>
        </nav>
      </PopoverContent>
    </Popover>
  );
}

function LanguageOption({
  href,
  locale,
  current,
  label,
  shortLabel,
  accessibleLabel,
}: {
  href: string;
  locale: Locale;
  current: boolean;
  label: string;
  shortLabel: string;
  accessibleLabel: string;
}) {
  return (
    <li>
      <Link
        className={cn(
          'flex min-h-10 items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-[var(--hero-accent)] hover:text-[var(--hero-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--hero-accent)]',
          current && 'font-semibold',
        )}
        href={href}
        locale={locale}
        hrefLang={locale}
        lang={locale}
        aria-current={current ? 'page' : undefined}
        aria-label={accessibleLabel}
        onClick={(event) => {
          if (window.location.hash) {
            event.currentTarget.href += window.location.hash;
          }
        }}
      >
        <span className="w-4" aria-hidden="true">
          {current && <Check className="h-4 w-4" />}
        </span>
        <span>{label}</span>
        <span
          className="ml-auto text-[0.65rem] font-semibold uppercase opacity-60"
          aria-hidden="true"
        >
          {shortLabel}
        </span>
      </Link>
    </li>
  );
}
