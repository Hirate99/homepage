'use client';

import { ReactNode, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { SiGithub, SiGmail } from '@icons-pack/react-simple-icons';

import { notoSerif } from '@/fonts';
import { useBreakingPoint } from '@/hooks/use-breaking-point';
import { cdn, cn } from '@/lib/utils';
import { EmblaCarousel } from './carousel';
import { Lyrics } from './lyrics.data';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

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
      <section className="flex h-full w-full flex-col items-center">
        <div
          className="absolute left-0 top-0 z-10 h-full w-full backdrop-blur-sm"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0, 0, 0, 0) 1px, var(--orange-2) 1px)',
            backgroundSize: '4px 4px',
          }}
        />
        <p
          className={cn(
            'absolute max-h-full w-full overflow-hidden font-bold text-[--orange-5]',
            notoSerif.className,
            'max-w-[720px] text-6xl',
            'md:max-w-[840px] md:text-7xl',
          )}
        >
          {Lyrics}you
        </p>
        <IntroSection className="relative z-10 pt-[env(safe-area-inset-top)] text-4xl leading-tight">
          <p
            className="text-transparent"
            style={{
              WebkitTextStroke: '1px var(--orange-9)',
            }}
          >
            Hi, {`I\'m`}
          </p>
          <p className="text-5xl font-black text-[--orange-9]">Haonan Su</p>
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
            'absolute bottom-0 left-1/2 z-10 mb-8 h-20 w-full max-w-[600px] -translate-x-1/2 self-start px-2 sm:mb-4 md:mb-12 md:max-w-[720px]',
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
                  <SiGmail className="h-8 w-8 text-[--orange-9] hover:cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-[--orange-9] font-sans text-sm">
                  haonan.su@outlook.com
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </footer>
      </section>
    </>
  );
}

export function Home() {
  return (
    <main className="h-screen min-h-[500px] min-w-[280px] overflow-y-scroll bg-[--orange-2] font-serif">
      <Intro />
    </main>
  );
}
