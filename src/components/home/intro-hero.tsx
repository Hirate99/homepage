import type { CSSProperties } from 'react';

import Link from 'next/link';

import { ArrowDown, FileText, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { bodoni72OldstyleBook, notoSerif } from '@/fonts';
import { cdn, cn } from '@/lib/utils';
import { TooltipProvider } from '../ui/tooltip';
import { AboutDrawer } from './about-drawer';
import { ActionTooltip } from './action-tooltip';
import { heroActionClass } from './hero-styles';
import { LyricsSceneLoader } from './lyrics-scene-loader';
import { LanguageSwitcher } from './language-switcher';
import { RoleTicker } from './role-ticker';
import type { SongDefinition } from './songs';

export function IntroHero({
  intro,
  song,
}: {
  intro: string;
  song: SongDefinition;
}) {
  const t = useTranslations('Hero');
  const themeStyle = {
    '--hero-bg': song.colors.background,
    '--hero-ink': song.colors.ink,
    '--hero-accent': song.colors.accent,
    '--hero-signal': song.colors.signal,
    '--hero-rule': song.colors.rule,
  } as CSSProperties;

  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[var(--hero-bg)] text-[var(--hero-ink)]"
      aria-labelledby="hero-title"
      data-song={song.id}
      style={themeStyle}
    >
      <LyricsSceneLoader song={song} />

      <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-[1440px] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] sm:px-8 lg:px-12">
        <header className="pointer-events-auto flex h-20 shrink-0 items-center">
          <Link
            href="#top"
            className="text-sm font-bold uppercase text-[var(--hero-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]"
          >
            HN / 2026
          </Link>
          <p className="ml-8 hidden text-xs uppercase text-[var(--hero-ink)] opacity-55 md:block">
            Los Angeles · 34.05° N
          </p>
          <TooltipProvider delayDuration={150}>
            <nav
              className="ml-auto flex items-center gap-3 sm:gap-4"
              aria-label={t('primaryNavigation')}
            >
              <ActionTooltip label={t('resume')}>
                <Link
                  className={heroActionClass}
                  href={cdn('bXNreXVyaW5hLWN2.pdf')}
                  target="_blank"
                  aria-label={t('openResume')}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('resume')}</span>
                </Link>
              </ActionTooltip>
              <ActionTooltip label={t('email')}>
                <Link
                  className={heroActionClass}
                  href="mailto:haonan.su@outlook.com"
                  aria-label={t('emailHaonan')}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('email')}</span>
                </Link>
              </ActionTooltip>
              <LanguageSwitcher songId={song.id} />
              <AboutDrawer intro={intro} song={song} />
            </nav>
          </TooltipProvider>
        </header>

        <div className="pointer-events-none absolute inset-0">
          <p className="absolute left-5 top-[15%] text-xs font-semibold uppercase text-[var(--hero-accent)] opacity-80 sm:left-8 sm:top-[17%] sm:text-sm lg:left-12">
            {t('greeting')}
          </p>
          <h1
            id="hero-title"
            className={cn(
              'absolute inset-0 whitespace-nowrap leading-[0.78]',
              bodoni72OldstyleBook.className,
            )}
            aria-label="Haonan Su"
          >
            <span
              aria-hidden="true"
              className="absolute left-5 top-[18%] text-[4.6rem] text-[var(--hero-ink)] sm:left-8 sm:top-[20%] sm:text-[8.25rem] lg:left-12 lg:text-[9.25rem]"
              style={{ textShadow: '0 0 24px var(--hero-bg)' }}
            >
              Haonan
            </span>
            <span
              aria-hidden="true"
              className="absolute right-5 top-[24%] text-[4.75rem] text-transparent opacity-80 sm:right-8 sm:top-[31%] sm:text-[9.25rem] lg:right-12 lg:text-[10.25rem]"
              style={{
                WebkitTextStroke: '1.2px var(--hero-ink)',
                textShadow: '0 0 22px var(--hero-bg)',
              }}
            >
              Su<span className="text-[var(--hero-accent)]">.</span>
            </span>
          </h1>
          <p
            className={cn(
              'absolute left-5 top-[43%] flex items-center gap-2 text-sm font-semibold text-[var(--hero-accent)] [text-orientation:mixed] [writing-mode:horizontal-tb] sm:left-auto sm:right-8 sm:top-[52%] sm:block sm:[text-orientation:upright] sm:[writing-mode:vertical-rl] lg:right-12',
              notoSerif.className,
            )}
          >
            <span>{song.title}</span>
            <span className="font-sans text-[0.62rem] font-medium uppercase opacity-65 sm:mt-3">
              {song.artist}
            </span>
          </p>
        </div>

        <div className="min-h-0 flex-1" />

        <div
          className={cn(
            'flex shrink-0 items-end justify-between gap-6',
            song.theme === 'rain-night' && 'sm:pb-28 lg:pb-32',
          )}
        >
          <RoleTicker />
          <Link
            href="#atlas"
            className="pointer-events-auto mb-2 hidden items-center gap-2 border-b border-[var(--hero-rule)] pb-1 text-sm font-medium text-[var(--hero-ink)] transition-colors hover:border-[var(--hero-accent)] hover:text-[var(--hero-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] sm:flex"
          >
            {t('atlas')}
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
