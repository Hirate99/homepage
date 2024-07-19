'use client';

import { ReactNode, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { SiGithub, SiGmail, SiLinkedin } from '@icons-pack/react-simple-icons';
import Markdown from 'marked-react';
import { BsFillArrowDownCircleFill } from 'react-icons/bs';
import { RiInstagramFill } from 'react-icons/ri';

import { notoSerif } from '@/fonts';
import { useBreakingPoint } from '@/hooks/use-breaking-point';
import { cdn, cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer';
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
        'w-full max-w-[600px] self-start px-2 sm:self-center md:mt-20 md:max-w-[720px]',
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

function Intro() {
  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);

  const { responsive } = useBreakingPoint({});

  return (
    <>
      <section className="relative flex w-full flex-grow flex-col items-center">
        <div
          className="absolute left-0 top-0 z-10 h-full w-full backdrop-blur-sm"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0, 0, 0, 0) 1px, var(--orange-2) 1px)',
            backgroundSize: '4px 4px',
          }}
        />
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
            className="text-transparent"
            style={{
              WebkitTextStroke: '1px var(--orange-9)',
            }}
          >
            Hi, {`I\'m`}
          </p>
          <h1 className="text-5xl font-black text-[--orange-9]">Haonan Su</h1>
          <Image
            className={cn(
              'mt-4 h-32 w-32 rounded-full shadow-xl',
              'md:absolute md:right-0 md:top-0 md:mt-[6px] md:h-40 md:w-40 md:-translate-y-1/4',
            )}
            src={cdn('fumikiri-mo.webp')}
            width={500}
            height={500}
            alt="avatar"
          />
        </IntroSection>
        <IntroSection
          className={cn('relative z-10 mt-auto flex flex-grow flex-col')}
        >
          <p
            className={cn('mt-auto text-6xl text-transparent')}
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
        <p className="mb-4 mt-2 flex w-full justify-center text-6xl font-black text-[--orange-8] md:mb-12 md:mt-8 md:text-7xl">
          青い、濃い、橙色の日
        </p>
        <footer
          className={cn(
            'absolute bottom-0 left-1/2 z-10 mb-8 h-20 w-full max-w-[600px] -translate-x-1/2 self-start overflow-x-visible px-2 sm:mb-4 md:mb-12 md:max-w-[720px]',
            'flex items-center justify-start gap-x-4 sm:gap-x-6',
          )}
        >
          <Link href="https://github.com/Hirate99" target="_blank">
            <SiGithub className="h-8 w-8 text-[--orange-9]" />
          </Link>
          {responsive === 'mobile' ? (
            <Popover>
              <PopoverTrigger asChild>
                <SiGmail className="h-8 w-8 text-[--orange-9] hover:cursor-pointer" />
              </PopoverTrigger>
              <PopoverContent className="flex w-auto items-center bg-[--orange-9] text-white">
                haonan.su@outlook.com
              </PopoverContent>
            </Popover>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="mailto:haonan.su@outlook.com">
                    <SiGmail className="h-8 w-8 text-[--orange-9] hover:cursor-pointer" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-[--orange-9] font-sans text-sm">
                  haonan.su@outlook.com
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Link href="https://www.instagram.com/kevinsu99/" target="_blank">
            <RiInstagramFill className="h-9 w-9 text-[--orange-9]" />
          </Link>
          <Drawer>
            <DrawerTrigger asChild>
              <button className="relative ml-auto mr-2 flex h-10 w-10 outline-none sm:mr-0">
                <BsFillArrowDownCircleFill className="absolute inline-flex h-full w-full animate-[ping-slow_3s_ease-in-out_infinite] rounded-full text-[--orange-9]" />
                <BsFillArrowDownCircleFill className="relative h-full w-full text-[--orange-9]" />
              </button>
            </DrawerTrigger>
            <DrawerContent
              className={cn(
                'fixed bottom-0 z-50 flex w-full flex-col items-center rounded-tl-xl rounded-tr-xl border-none bg-white/90 py-3 !pb-0 backdrop-blur-md',
                'h-screen-safe sm:h-[calc(100%-60px)]',
              )}
            >
              <div
                className={cn(
                  'mt-6 flex h-full w-full max-w-[720px] flex-grow flex-col overflow-y-auto',
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
        'mb-auto max-w-[720px] px-4 pb-3 font-serif text-lg font-light text-[--orange-8]',
        'sm:pb-2 sm:text-justify',
        'md:max-w-[840px] md:text-xl',
      )}
    >
      <section
        className={cn(
          '[&_h2]:py-1 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-[--orange-9] sm:[&_h2]:text-4xl',
          '[&_h4]:text-xl [&_h4]:font-bold [&_h4]:text-[--orange-9] sm:[&_h4]:text-2xl',
          '[&_p]:my-3',
          '[&_a]:underline',
          '[&_ul]:my-3 [&_ul]:list-inside [&_ul]:list-disc',
          '[&_strong]:font-bold',
        )}
      >
        <Markdown value={intro} />
      </section>
    </article>
  );
}

function AboutFooter() {
  return (
    <footer
      className={cn(
        'mb-6 mt-3 flex items-center gap-x-4 px-3',
        'sm:mb-10 sm:gap-x-5',
      )}
    >
      <Link href="https://github.com/Hirate99" target="_blank">
        <SiGithub className="h-8 w-8 text-[--orange-9]" />
      </Link>
      <Link
        href="https://www.linkedin.com/in/%E6%B5%A9%E5%8D%97-%E8%8B%8F-5829311bb/"
        target="_blank"
      >
        <SiLinkedin className="h-8 w-8 text-[--orange-9]" />
      </Link>
    </footer>
  );
}

export function Home() {
  return (
    <main className="flex h-full min-h-[500px] min-w-[280px] flex-grow flex-col bg-[--orange-2] font-serif">
      <Intro />
    </main>
  );
}
