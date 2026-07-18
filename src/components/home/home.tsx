'use client';

import { type ReactNode, useEffect, useState } from 'react';

import Link from 'next/link';

import { SiGithub } from '@icons-pack/react-simple-icons';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, FileText, Info, Mail, X } from 'lucide-react';
import Markdown from 'marked-react';
import { RiInstagramFill } from 'react-icons/ri';
import { SiLinkedin } from 'react-icons/si';

import { bodoni72OldstyleBook, notoSerif } from '@/fonts';
import { type CityPost } from '@/lib/collections';
import { cdn, cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { GlobeAtlas } from './globe-atlas';
import intro from './intro.md';
import { LyricsScene } from './lyrics-scene';

const Roles = ['Software Engineer', 'Photographer'];

const headerActionClass =
  'inline-flex h-10 items-center justify-center gap-2 border-b border-[#173a32]/30 px-1 text-sm font-medium text-[#173a32] transition-colors hover:border-[#d84d29] hover:text-[#d84d29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d84d29] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f4efe3] sm:px-2';

const socialActionClass =
  'grid h-10 w-10 place-items-center border border-[#18332d]/25 text-[#18332d] transition-colors hover:border-[#ff5a2f] hover:bg-[#ff5a2f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a2f] focus-visible:ring-offset-2';

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="border-none bg-[#173a32] font-sans text-xs text-white shadow-md">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function AboutDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className={headerActionClass} aria-label="Open about Haonan Su">
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

function RoleTicker() {
  const [roleIndex, setRoleIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextRole = () => {
      window.clearTimeout(timeoutId);
      if (document.visibilityState !== 'visible') {
        return;
      }

      timeoutId = window.setTimeout(() => {
        setRoleIndex((current) => (current + 1) % Roles.length);
        scheduleNextRole();
      }, 4200);
    };

    scheduleNextRole();
    document.addEventListener('visibilitychange', scheduleNextRole);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', scheduleNextRole);
    };
  }, []);

  const role = Roles[roleIndex];
  const article = /^[aeiou]/i.test(role) ? 'an' : 'a';

  return (
    <div className="w-full min-w-0 max-w-[760px] text-[#173a32]">
      <p
        className="text-[2rem] leading-none text-transparent sm:text-5xl"
        style={{ WebkitTextStroke: '1px #d84d29' }}
      >
        {article}
      </p>
      <div
        className="relative mt-1 h-[4.6rem] overflow-visible sm:h-[5.8rem]"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={role}
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    x: 24,
                    clipPath: 'inset(0 100% 0 0)',
                  }
            }
            animate={
              reducedMotion
                ? {
                    opacity: 1,
                    x: 0,
                    skewX: 0,
                    clipPath: 'inset(0 0% 0 0)',
                  }
                : {
                    opacity: [0, 1, 0.35, 1],
                    x: [24, -12, 7, 0],
                    skewX: [-12, 7, -3, 0],
                    clipPath: [
                      'inset(0 100% 0 0)',
                      'inset(0 0% 0 0)',
                      'inset(58% 0 18% 0)',
                      'inset(0 0% 0 0)',
                    ],
                  }
            }
            exit={
              reducedMotion
                ? undefined
                : {
                    opacity: 0,
                    x: -18,
                    clipPath: 'inset(42% 0 36% 0)',
                    transition: {
                      duration: 0.16,
                      ease: [0.4, 0, 1, 1],
                    },
                  }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.62,
              ease: [0.16, 1, 0.3, 1],
              times: reducedMotion ? undefined : [0, 0.24, 0.46, 1],
            }}
            className="absolute left-0 top-0 origin-left whitespace-nowrap pb-2 text-[2rem] font-semibold leading-[1.16] sm:text-5xl md:text-6xl"
          >
            <span className="relative z-10">{role}</span>
            {!reducedMotion && (
              <>
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 z-0 text-[#e84d2a] mix-blend-multiply"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: [0, 0.9, 0.65, 0],
                    x: [-20, 13, -7, 0],
                    clipPath: [
                      'inset(8% 0 68% 0)',
                      'inset(46% 0 32% 0)',
                      'inset(72% 0 8% 0)',
                      'inset(100% 0 0 0)',
                    ],
                  }}
                  transition={{ duration: 0.62, times: [0, 0.25, 0.62, 1] }}
                >
                  {role}
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 z-0 text-[#55a99c] mix-blend-multiply"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{
                    opacity: [0, 0.85, 0.5, 0],
                    x: [18, -11, 5, 0],
                    clipPath: [
                      'inset(62% 0 14% 0)',
                      'inset(20% 0 58% 0)',
                      'inset(54% 0 24% 0)',
                      'inset(0 0 100% 0)',
                    ],
                  }}
                  transition={{
                    duration: 0.68,
                    delay: 0.03,
                    times: [0, 0.28, 0.66, 1],
                  }}
                >
                  {role}
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  className="absolute left-0 top-0 z-20 h-px w-full bg-[#e84d2a] shadow-[0_0_8px_#55a99c]"
                  initial={{ opacity: 0, y: 0, scaleX: 0.15 }}
                  animate={{
                    opacity: [0, 1, 0.7, 0],
                    y: [0, 20, 48, 68],
                    scaleX: [0.15, 1, 0.72, 0.2],
                  }}
                  transition={{ duration: 0.58, ease: 'easeOut' }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#f4efe3] text-[#173a32]"
      aria-labelledby="hero-title"
    >
      <LyricsScene />

      <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-[1440px] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] sm:px-8 lg:px-12">
        <header className="pointer-events-auto flex h-20 shrink-0 items-center">
          <Link
            href="#top"
            className="text-sm font-bold uppercase text-[#173a32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d84d29]"
          >
            HN / 2026
          </Link>
          <p className="ml-8 hidden text-xs uppercase text-[#173a32]/55 md:block">
            Los Angeles · 34.05° N
          </p>
          <TooltipProvider delayDuration={150}>
            <nav
              className="ml-auto flex items-center gap-4"
              aria-label="Primary"
            >
              <ActionTooltip label="Resume">
                <Link
                  className={headerActionClass}
                  href={cdn('bXNreXVyaW5hLWN2.pdf')}
                  target="_blank"
                  aria-label="Open resume in a new tab"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Resume</span>
                </Link>
              </ActionTooltip>
              <ActionTooltip label="Email">
                <Link
                  className={headerActionClass}
                  href="mailto:haonan.su@outlook.com"
                  aria-label="Email Haonan Su"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Email</span>
                </Link>
              </ActionTooltip>
              <AboutDrawer />
            </nav>
          </TooltipProvider>
        </header>

        <div className="pointer-events-none absolute inset-0">
          <p className="absolute left-5 top-[16%] text-lg font-medium text-[#c94825] sm:left-8 sm:top-[28%] sm:text-xl lg:left-12">
            Hi, I&apos;m
          </p>
          <h1
            id="hero-title"
            className={cn('absolute inset-0', bodoni72OldstyleBook.className)}
          >
            <span
              className="absolute left-5 top-[21%] text-[5rem] leading-[0.8] text-[#173a32] sm:left-8 sm:top-[32%] sm:text-[8.5rem] lg:left-12 xl:text-[10rem]"
              style={{ textShadow: '0 0 24px #f4efe3' }}
            >
              Haonan
            </span>
            <span
              className="absolute left-5 top-[31%] text-[5.5rem] leading-[0.8] text-transparent sm:left-auto sm:right-8 sm:top-[17%] sm:text-[9rem] lg:right-12 xl:text-[11rem]"
              style={{ WebkitTextStroke: '2px #173a32' }}
            >
              Su
              <span className="text-[#d84d29] [-webkit-text-stroke:0]">.</span>
            </span>
          </h1>
          <p
            className={cn(
              'absolute left-5 top-[42%] text-sm font-semibold text-[#c94825] [text-orientation:mixed] [writing-mode:horizontal-tb] sm:left-auto sm:right-8 sm:top-[43%] sm:[text-orientation:upright] sm:[writing-mode:vertical-rl] lg:right-12',
              notoSerif.className,
            )}
          >
            青い、濃い、橙色の日
          </p>
        </div>

        <div className="min-h-0 flex-1" />

        <div className="flex shrink-0 items-end justify-between gap-6">
          <RoleTicker />
          <Link
            href="#atlas"
            className="pointer-events-auto mb-2 hidden items-center gap-2 border-b border-[#173a32]/30 pb-1 text-sm font-medium text-[#173a32] transition-colors hover:border-[#d84d29] hover:text-[#d84d29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d84d29] sm:flex"
          >
            Atlas
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
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

export function Home({ posts }: { posts: CityPost[] }) {
  return (
    <main className="min-w-[280px] overflow-hidden bg-[#edf2ef]">
      <Intro />
      <GlobeAtlas posts={posts} />
    </main>
  );
}
