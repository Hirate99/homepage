'use client';

import type { CSSProperties } from 'react';

import Link from 'next/link';

import { SiGithub } from '@icons-pack/react-simple-icons';
import { Info, X } from 'lucide-react';
import Markdown from 'marked-react';
import { useLocale, useTranslations } from 'next-intl';
import { RiInstagramFill } from 'react-icons/ri';
import { SiLinkedin } from 'react-icons/si';

import { bodoni72OldstyleBook } from '@/fonts';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { TooltipProvider } from '../ui/tooltip';
import { ActionTooltip } from './action-tooltip';
import { heroActionClass } from './hero-styles';
import introEn from './intro.en.md';
import introZh from './intro.zh.md';
import type { SongDefinition } from './songs';

const socialActionClass =
  'grid h-10 w-10 place-items-center border border-[var(--about-rule)] text-[var(--about-ink)] transition-colors hover:border-[var(--about-accent)] hover:bg-[var(--about-accent)] hover:text-[var(--about-accent-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--about-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--about-bg)]';

export function AboutDrawer({ song }: { song: SongDefinition }) {
  const locale = useLocale();
  const t = useTranslations('About');
  const intro = locale === 'zh' ? introZh : introEn;
  const themeStyle = {
    '--about-bg': song.colors.background,
    '--about-ink': song.colors.ink,
    '--about-accent': song.colors.accent,
    '--about-accent-ink':
      song.theme === 'rain-night' ? song.colors.background : song.colors.ink,
    '--about-link': `color-mix(in srgb, ${song.colors.accent} 55%, ${song.colors.ink})`,
    '--about-rule': song.colors.rule,
  } as CSSProperties;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className={heroActionClass} aria-label={t('open')}>
          <Info className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('button')}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent
        data-slot="about-drawer"
        data-song={song.id}
        data-theme={song.theme}
        style={themeStyle}
        className={cn(
          'fixed bottom-0 z-50 flex w-full flex-col items-center rounded-none border-none bg-[var(--about-bg)] !pb-0 text-[var(--about-ink)] transition-colors h-screen-safe',
          'sm:h-[calc(100%-40px)] sm:border-x sm:border-t sm:border-[var(--about-rule)]',
        )}
      >
        <DrawerTitle className="sr-only">{t('title')}</DrawerTitle>
        <DrawerDescription className="sr-only">
          {t('description')}
        </DrawerDescription>
        <DrawerClose asChild>
          <button
            type="button"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-[var(--about-rule)] bg-[var(--about-bg)] text-[var(--about-ink)] transition-colors hover:border-[var(--about-accent)] hover:bg-[var(--about-accent)] hover:text-[var(--about-accent-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--about-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--about-bg)] sm:right-6 sm:top-6"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerClose>
        <div className="mt-6 flex h-full w-full max-w-[960px] flex-grow flex-col overflow-y-auto px-1 sm:mt-10 sm:scrollbar-none">
          <div className="flex items-end justify-between border-b border-[var(--about-rule)] px-4 pb-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--about-link)]">
                {t('eyebrow')}
              </p>
              <p
                className={cn(
                  'mt-1 text-5xl leading-none sm:text-7xl',
                  bodoni72OldstyleBook.className,
                )}
              >
                Haonan Su
              </p>
            </div>
            <p className="hidden max-w-[260px] text-right text-sm leading-6 text-[var(--about-ink)] opacity-70 sm:block">
              {t('summary')}
            </p>
          </div>
          <AboutMe intro={intro} />
          <AboutFooter />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AboutMe({ intro }: { intro: string }) {
  return (
    <article
      className={cn(
        'mx-auto mb-auto w-full max-w-[760px] select-text px-4 pb-6 pt-2 font-serif text-lg font-light leading-8 text-[var(--about-ink)]',
        'sm:px-8 sm:pb-8 sm:text-justify md:text-xl',
      )}
    >
      <section
        className={cn(
          '[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-[var(--about-rule)] [&_h2]:pb-3 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-[var(--about-ink)] sm:[&_h2]:text-4xl',
          '[&_h4]:mt-7 [&_h4]:text-xl [&_h4]:font-bold [&_h4]:text-[var(--about-ink)] sm:[&_h4]:text-2xl',
          '[&_p]:my-4',
          '[&_a]:text-[var(--about-link)] [&_a]:underline [&_a]:decoration-[var(--about-link)] [&_a]:underline-offset-4',
          '[&_ul]:my-3 [&_ul]:list-inside [&_ul]:list-disc',
          '[&_li]:my-1',
          '[&_strong]:font-bold',
        )}
      >
        <Markdown value={intro} openLinksInNewTab />
      </section>
    </article>
  );
}

function AboutFooter() {
  const t = useTranslations('About');

  return (
    <footer className="mx-4 mb-8 mt-3 flex items-center gap-3 border-t border-[var(--about-rule)] px-1 pt-5 sm:mx-8 sm:mb-10">
      <TooltipProvider delayDuration={150}>
        <ActionTooltip label="GitHub">
          <Link
            className={socialActionClass}
            href="https://github.com/Hirate99"
            target="_blank"
            aria-label={t('github')}
          >
            <SiGithub className="h-5 w-5" />
          </Link>
        </ActionTooltip>
        <ActionTooltip label="LinkedIn">
          <Link
            className={socialActionClass}
            href="https://www.linkedin.com/in/haonansu/"
            target="_blank"
            aria-label={t('linkedin')}
          >
            <SiLinkedin className="h-5 w-5" />
          </Link>
        </ActionTooltip>
        <ActionTooltip label="Instagram">
          <Link
            className={socialActionClass}
            href="https://www.instagram.com/mskyurina/"
            target="_blank"
            aria-label={t('instagram')}
          >
            <RiInstagramFill className="h-6 w-6" />
          </Link>
        </ActionTooltip>
      </TooltipProvider>
      <p className="ml-auto text-xs uppercase text-[var(--about-ink)] opacity-55">
        Los Angeles · 2026
      </p>
    </footer>
  );
}
