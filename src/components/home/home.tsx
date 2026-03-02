'use client';

import { ReactNode, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { SiGithub, SiGmail } from '@icons-pack/react-simple-icons';
import Markdown from 'marked-react';
import { AiFillInfoCircle } from 'react-icons/ai';
import { BsFillPersonVcardFill } from 'react-icons/bs';
import { RiInstagramFill } from 'react-icons/ri';
import { SiLinkedin } from 'react-icons/si';

import { type CityPost } from '@/lib/collections';
import { notoSerif } from '@/fonts';
import { useBreakingPoint } from '@/hooks/use-breaking-point';
import { cdn, clipCDNImage, cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { EmblaCarousel } from './carousel';
import intro from './intro.md';
import { Lyrics } from './lyrics.data';

import { CityPosts } from './images';

function IntroSection({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'w-full max-w-[600px] self-center px-4 md:mt-20 md:max-w-[720px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

const Roles = [
  'Full-Stack Developer',
  'Graphic Designer',
  'Amateur Photographer',
];

const actionIconClass =
  'grid h-10 w-10 place-items-center rounded-lg border border-orange-500/15 bg-white/70 text-[--orange-9] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white';

function Intro() {
  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);

  const { responsive } = useBreakingPoint({});

  return (
    <>
      <section className="relative flex w-full flex-grow flex-col items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-8 h-72 w-72 animate-[heroFloat_14s_ease-in-out_infinite] rounded-full bg-orange-300/35 blur-3xl" />
          <div className="absolute -right-20 top-20 h-80 w-80 animate-[heroFloat_18s_ease-in-out_infinite] rounded-full bg-amber-200/35 blur-3xl" />
          <div className="absolute bottom-4 left-1/2 h-56 w-[80%] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" />
        </div>
        <div
          className="absolute left-0 top-0 z-10 h-full w-full backdrop-blur-sm"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0, 0, 0, 0) 1px, var(--orange-2) 1px)',
            backgroundSize: '4px 4px',
          }}
        />
        <div className="absolute left-0 top-0 select-none opacity-0">
          <Markdown value={intro} />
        </div>
        <div
          className={cn(
            'absolute max-h-full w-full overflow-hidden font-bold text-[--orange-5]',
            notoSerif.className,
            'max-w-[720px] text-6xl',
            'md:max-w-[840px] md:text-7xl',
          )}
        >
          {Lyrics}
        </div>
        <IntroSection className="relative z-10 pt-[env(safe-area-inset-top)] text-4xl leading-tight">
          <p
            className="text-2xl uppercase tracking-[0.12em] text-transparent sm:text-[1.7rem]"
            style={{
              WebkitTextStroke: '1px var(--orange-9)',
            }}
          >
            Hi, {`I'm`}
          </p>
          <h1 className="text-5xl font-black leading-[0.92] tracking-tight text-[--orange-9] sm:text-6xl md:text-7xl">
            Haonan Su
          </h1>
          <p className="mt-2 max-w-[440px] text-base leading-relaxed text-[--orange-8] sm:text-lg">
            Building thoughtful web products with engineering, design, and
            visual storytelling.
          </p>
          <Image
            className={cn(
              'mt-4 h-32 w-32 rounded-full border-2 border-orange-300/70 shadow-2xl shadow-orange-700/30',
              'md:absolute md:right-0 md:top-0 md:mt-[6px] md:h-40 md:w-40 md:-translate-y-1/4',
            )}
            src={clipCDNImage(cdn('fumikiri-mo.webp'), {
              width: 500,
            })}
            width={500}
            height={500}
            alt="avatar"
          />
        </IntroSection>
        <IntroSection
          className={cn('relative z-10 mt-auto flex flex-grow flex-col')}
        >
          <p
            className={cn('mt-auto text-5xl text-transparent sm:text-6xl')}
            style={{
              WebkitTextStroke: '1px var(--orange-9)',
            }}
          >
            {['a', 'e', 'i', 'o', 'u'].includes(
              Roles[currentRoleIdx].at(0)?.toLowerCase() ?? '',
            )
              ? 'an'
              : 'a'}
          </p>
          <EmblaCarousel slides={Roles} onSlideFocus={setCurrentRoleIdx} />
        </IntroSection>
        <p className="mb-4 mt-2 flex w-full justify-center text-5xl font-bold tracking-tight text-[--orange-8] md:mb-12 md:mt-8 md:text-6xl">
          青い、濃い、橙色の日
        </p>
        <footer
          className={cn(
            'absolute bottom-0 left-1/2 z-10 mb-8 w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 overflow-x-visible px-4 py-2 sm:mb-4 md:mb-12 md:max-w-[720px]',
            'flex items-center justify-start gap-x-3 sm:gap-x-4',
            'rounded-2xl border border-orange-500/20 bg-white/45 shadow-sm backdrop-blur-md',
          )}
        >
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  className={cn(actionIconClass, 'h-11 w-11')}
                  href={cdn('bXNreXVyaW5hLWN2.pdf')}
                  target="_blank"
                >
                  <BsFillPersonVcardFill className="h-[30px] w-[30px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-[--orange-9] font-sans text-sm shadow-md">
                My CV / Resume
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {responsive === 'mobile' ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className={actionIconClass} aria-label="Email">
                  <SiGmail className="h-6 w-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="flex w-auto items-center bg-[--orange-9] text-white">
                haonan.su@outlook.com
              </PopoverContent>
            </Popover>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className={actionIconClass}
                    href="mailto:haonan.su@outlook.com"
                  >
                    <SiGmail className="h-6 w-6" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-[--orange-9] font-sans text-sm shadow-md">
                  haonan.su@outlook.com
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className="relative ml-auto mr-2 grid h-10 w-10 place-items-center text-[--orange-9] sm:mr-0"
                aria-label="Open about dialog"
              >
                <AiFillInfoCircle className="absolute inline-flex h-full w-full animate-[ping-slow_3s_ease-in-out_infinite] rounded-full text-[--orange-9]" />
                <AiFillInfoCircle className="relative h-full w-full text-[--orange-9]" />
              </button>
            </DrawerTrigger>
            <DrawerContent
              className={cn(
                'fixed bottom-0 z-50 flex w-full flex-col items-center rounded-tl-xl rounded-tr-xl border-none bg-white/90 py-3 !pb-0 backdrop-blur-md',
                'h-screen-safe scrollbar-track-transparent sm:h-[calc(100%-60px)]',
              )}
            >
              <DrawerTitle className="sr-only">About Haonan Su</DrawerTitle>
              <div
                className={cn(
                  'mt-6 flex h-full w-full max-w-[720px] flex-grow flex-col overflow-y-auto',
                  'sm:scrollbar-none',
                  'md:max-w-[840px]',
                )}
              >
                <AboutMe />
                <AboutFooter />
              </div>
            </DrawerContent>
          </Drawer>
        </footer>
      </section>
    </>
  );
}

function AboutMe() {
  return (
    <article
      className={cn(
        'mb-auto max-w-[720px] select-text px-4 pb-3 font-serif text-lg font-light leading-8 text-[--orange-8]',
        'sm:pb-2 sm:text-justify',
        'md:max-w-[840px] md:text-xl',
      )}
    >
      <section
        className={cn(
          '[&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:border-l-4 [&_h2]:border-orange-500/70 [&_h2]:py-1 [&_h2]:pl-3 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-[--orange-9] sm:[&_h2]:text-4xl',
          '[&_h4]:mt-6 [&_h4]:text-xl [&_h4]:font-bold [&_h4]:text-[--orange-9] sm:[&_h4]:text-2xl',
          '[&_p]:my-4',
          '[&_a]:underline',
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
    <footer
      className={cn(
        'mb-6 mt-3 flex items-center gap-x-4 border-t border-orange-500/20 px-3 pt-4',
        'sm:mb-10 sm:gap-x-5',
      )}
    >
      <Link
        className={actionIconClass}
        href="https://github.com/Hirate99"
        target="_blank"
      >
        <SiGithub className="h-6 w-6" />
      </Link>
      <Link
        className={actionIconClass}
        href="https://www.linkedin.com/in/haonansu/"
        target="_blank"
      >
        <SiLinkedin className="h-6 w-6" />
      </Link>
      <Link
        className={actionIconClass}
        href="https://www.instagram.com/kevinsu99/"
        target="_blank"
      >
        <RiInstagramFill className="h-7 w-7" />
      </Link>
    </footer>
  );
}

export function Home({ posts }: { posts: CityPost[] }) {
  return (
    <>
      <main className="relative flex h-screen min-h-[500px] min-w-[280px] flex-grow flex-col overflow-hidden bg-[--orange-2] font-serif">
        <Intro />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[--orange-2] to-white" />
      </main>
      <section className="relative mx-auto w-full max-w-screen-xl pb-8 pt-3 sm:pt-8">
        <CityPosts posts={posts} />
      </section>
    </>
  );
}
