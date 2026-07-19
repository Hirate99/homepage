'use client';

import Link from 'next/link';

import { SiGithub } from '@icons-pack/react-simple-icons';
import { Info, X } from 'lucide-react';
import Markdown from 'marked-react';
import { RiInstagramFill } from 'react-icons/ri';
import { SiLinkedin } from 'react-icons/si';

import { bodoni72OldstyleBook } from '@/fonts';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { TooltipProvider } from '../ui/tooltip';
import { ActionTooltip } from './action-tooltip';
import { heroActionClass } from './hero-styles';
import intro from './intro.md';

const socialActionClass =
  'grid h-10 w-10 place-items-center border border-[#18332d]/25 text-[#18332d] transition-colors hover:border-[#ff5a2f] hover:bg-[#ff5a2f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a2f] focus-visible:ring-offset-2';

export function AboutDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className={heroActionClass} aria-label="Open about Haonan Su">
          <Info className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">About</span>
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          'fixed bottom-0 z-50 flex w-full flex-col items-center rounded-none border-none bg-[#f6f3ea] !pb-0 text-[#18332d] h-screen-safe',
          'sm:h-[calc(100%-40px)] sm:border-x sm:border-t sm:border-[#18332d]/20',
        )}
      >
        <DrawerTitle className="sr-only">About Haonan Su</DrawerTitle>
        <DrawerClose asChild>
          <button
            type="button"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-[#18332d]/25 bg-[#f6f3ea] text-[#18332d] transition-colors hover:border-[#ff5a2f] hover:bg-[#ff5a2f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a2f] sm:right-6 sm:top-6"
            aria-label="Close about panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerClose>
        <div className="mt-6 flex h-full w-full max-w-[960px] flex-grow flex-col overflow-y-auto px-1 sm:mt-10 sm:scrollbar-none">
          <div className="flex items-end justify-between border-b border-[#18332d]/25 px-4 pb-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-[#d84622]">
                Profile / 2026
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
            <p className="hidden max-w-[260px] text-right text-sm leading-6 text-[#18332d]/70 sm:block">
              Software engineer and visual maker based in Los Angeles.
            </p>
          </div>
          <AboutMe />
          <AboutFooter />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AboutMe() {
  return (
    <article
      className={cn(
        'mx-auto mb-auto w-full max-w-[760px] select-text px-4 pb-6 pt-2 font-serif text-lg font-light leading-8 text-[#27453f]',
        'sm:px-8 sm:pb-8 sm:text-justify md:text-xl',
      )}
    >
      <section
        className={cn(
          '[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-[#18332d]/20 [&_h2]:pb-3 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-[#18332d] sm:[&_h2]:text-4xl',
          '[&_h4]:mt-7 [&_h4]:text-xl [&_h4]:font-bold [&_h4]:text-[#18332d] sm:[&_h4]:text-2xl',
          '[&_p]:my-4',
          '[&_a]:text-[#c83d1c] [&_a]:underline [&_a]:decoration-[#c83d1c]/40 [&_a]:underline-offset-4',
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
  return (
    <footer className="mx-4 mb-8 mt-3 flex items-center gap-3 border-t border-[#18332d]/25 px-1 pt-5 sm:mx-8 sm:mb-10">
      <TooltipProvider delayDuration={150}>
        <ActionTooltip label="GitHub">
          <Link
            className={socialActionClass}
            href="https://github.com/Hirate99"
            target="_blank"
            aria-label="Haonan Su on GitHub"
          >
            <SiGithub className="h-5 w-5" />
          </Link>
        </ActionTooltip>
        <ActionTooltip label="LinkedIn">
          <Link
            className={socialActionClass}
            href="https://www.linkedin.com/in/haonansu/"
            target="_blank"
            aria-label="Haonan Su on LinkedIn"
          >
            <SiLinkedin className="h-5 w-5" />
          </Link>
        </ActionTooltip>
        <ActionTooltip label="Instagram">
          <Link
            className={socialActionClass}
            href="https://www.instagram.com/mskyurina/"
            target="_blank"
            aria-label="Haonan Su on Instagram"
          >
            <RiInstagramFill className="h-6 w-6" />
          </Link>
        </ActionTooltip>
      </TooltipProvider>
      <p className="ml-auto text-xs uppercase text-[#18332d]/55">
        Los Angeles · 2026
      </p>
    </footer>
  );
}
