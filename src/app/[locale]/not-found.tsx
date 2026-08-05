import Link from 'next/link';

import { ArrowRight, Map } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { bodoni72OldstyleBook } from '@/fonts';
import { cn } from '@/lib/utils';

const orbitParticleClassNames = [
  'left-[12%] top-[18%] h-1 w-1 opacity-40',
  'left-[39%] top-[1%] h-0.5 w-0.5 opacity-30',
  'right-[5%] top-[33%] h-1.5 w-1.5 opacity-50',
  'bottom-[7%] right-[23%] h-1 w-1 opacity-50',
  'bottom-[1%] left-[39%] h-1 w-1 opacity-30',
  'bottom-[18%] left-[12%] h-1 w-1 opacity-50',
] as const;

export default async function NotFound() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('NotFound'),
  ]);
  const homeHref = `/${locale}`;
  const usesCjkLayout = locale === 'zh' || locale === 'ja';
  const localizedHeadingFont =
    locale === 'ja'
      ? "[font-family:'Yu_Gothic','YuGothic','Hiragino_Kaku_Gothic_ProN','Noto_Sans_JP',sans-serif]"
      : "[font-family:'PingFang_SC','Microsoft_YaHei','Noto_Sans_SC',sans-serif]";

  return (
    <main className="relative isolate grid min-h-svh w-screen min-w-[280px] grid-rows-[auto_1fr_auto] overflow-hidden bg-[#efede4] text-[#173a32] [background-image:radial-gradient(circle_at_78%_44%,#f0522b14,transparent_28rem)]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#173a321f_1px,transparent_1px),linear-gradient(to_bottom,#173a321f_1px,transparent_1px)] bg-center opacity-40 [background-size:min(10vw,8rem)_min(10vw,8rem)] [mask-image:linear-gradient(to_right,transparent_3%,black_35%,black_75%,transparent_98%)]"
        aria-hidden="true"
      />

      <header className="z-20 mx-auto flex min-h-20 w-full max-w-[1440px] items-center justify-between gap-8 border-b border-[#173a32]/20 px-5 pt-[env(safe-area-inset-top)] text-[0.72rem] uppercase tracking-[0.11em] motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:fill-mode-both sm:px-8 lg:px-12">
        <Link
          className="inline-flex min-h-11 items-center font-bold outline-none focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-[#f0522b]"
          href={homeHref}
        >
          HN{' '}
          <span className="mx-[0.45rem] text-[#f0522b]" aria-hidden="true">
            /
          </span>{' '}
          2026
        </Link>
        <p className="hidden text-[#5f706b] sm:block">Los Angeles · 34.05° N</p>
      </header>

      <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-4 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-[clamp(2rem,6vw,8rem)] lg:px-12 lg:py-[clamp(3rem,7vh,6.5rem)]">
        <section
          className="z-10 max-w-[47rem] lg:max-w-none"
          aria-labelledby="not-found-title"
        >
          <p className="mb-[clamp(1.2rem,3vh,2.25rem)] flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f0522b] motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:fill-mode-both">
            <span
              className="relative h-2 w-2 shrink-0 rounded-full bg-[#f0522b] shadow-[0_0_0_0.35rem_rgb(240_82_43_/_0.12)]"
              aria-hidden="true"
            >
              <span className="absolute inset-[-0.45rem] animate-ping rounded-full border border-[#f0522b] motion-reduce:animate-none" />
            </span>
            {t('eyebrow')}
          </p>

          <p
            className={cn(
              '-ml-[0.045em] whitespace-nowrap text-[clamp(8rem,38vw,15rem)] leading-[0.58] tracking-[-0.085em] [font-variant-numeric:lining-nums_tabular-nums] motion-safe:delay-100 motion-safe:duration-700 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 motion-safe:fill-mode-both lg:text-[clamp(8.5rem,20vw,18.5rem)]',
              bodoni72OldstyleBook.className,
            )}
            aria-hidden="true"
          >
            404<span className="text-[#f0522b]">.</span>
          </p>

          <div
            className={cn(
              'mt-[clamp(2.6rem,6vh,4.5rem)] grid grid-cols-1 items-start gap-5 border-t border-[#173a32]/20 pt-5 motion-safe:delay-300 motion-safe:duration-700 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both',
              usesCjkLayout
                ? 'max-w-[41.5rem] sm:gap-6'
                : 'max-w-[39rem] sm:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.85fr)] sm:gap-[clamp(1.5rem,4vw,3.5rem)]',
            )}
          >
            <h1
              id="not-found-title"
              className={cn(
                'text-balance',
                usesCjkLayout
                  ? cn(
                      'max-w-none text-[clamp(2.35rem,8.5vw,4.4rem)] font-medium leading-[1.12] tracking-[-0.055em]',
                      localizedHeadingFont,
                    )
                  : cn(
                      'max-w-[12ch] text-[clamp(2.4rem,4.3vw,4.5rem)] leading-[0.94] tracking-[-0.045em] sm:max-w-[11ch]',
                      bodoni72OldstyleBook.className,
                    ),
              )}
            >
              {t.rich('title', { break: () => <br /> })}
            </h1>
            <p
              className={cn(
                'text-pretty text-[#5f706b]',
                usesCjkLayout
                  ? 'max-w-[36rem] text-[clamp(0.9rem,1.05vw,1rem)] leading-[1.9] tracking-[0.01em]'
                  : 'max-w-lg text-[clamp(0.88rem,1.1vw,1rem)] leading-[1.72]',
              )}
            >
              {t('description')}
            </p>
          </div>

          <nav
            className="mt-[clamp(2rem,4vh,3rem)] flex flex-wrap items-stretch gap-4 motion-safe:delay-500 motion-safe:duration-700 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both sm:items-center sm:gap-6"
            aria-label={t('navigation')}
          >
            <Link
              className="group inline-flex min-h-11 flex-1 items-center justify-center gap-2.5 bg-[#173a32] px-5 text-[0.82rem] font-bold text-[#efede4] outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#f0522b] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-[#f0522b] motion-reduce:transform-none motion-reduce:transition-none sm:min-w-[9.5rem] sm:flex-none"
              href={homeHref}
            >
              {t('returnHome')}
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              className="group inline-flex min-h-11 flex-1 items-center justify-center gap-2.5 border-b border-[#173a32]/20 text-[0.82rem] font-bold outline-none transition-colors duration-200 hover:border-[#f0522b] hover:text-[#f0522b] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-[#f0522b] motion-reduce:transition-none sm:flex-none"
              href={`${homeHref}#atlas`}
            >
              <Map
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none"
                aria-hidden="true"
              />
              {t('exploreAtlas')}
            </Link>
          </nav>
        </section>

        <div
          className="pointer-events-none absolute right-[-13rem] top-1/2 -z-10 aspect-square w-[29rem] -translate-y-1/2 opacity-25 motion-safe:delay-200 motion-safe:duration-1000 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-both lg:relative lg:right-auto lg:top-auto lg:z-0 lg:w-[min(38vw,31rem)] lg:translate-y-0 lg:justify-self-center lg:opacity-100"
          aria-hidden="true"
        >
          <div className="absolute left-0 right-0 top-[5%] hidden justify-between text-[0.55rem] tracking-[0.12em] text-[#5f706b] lg:flex">
            <span>LAT 00.000</span>
            <span>LON 00.000</span>
          </div>
          <div className="absolute inset-[5%] rounded-full border border-[#173a32]/20">
            <div className="absolute inset-[10%] rounded-full border border-[#173a32]/20" />
          </div>
          <div className="absolute left-0 right-0 top-1/2 border-t border-[#173a32]/20" />
          <div className="absolute bottom-0 left-1/2 top-0 border-l border-[#173a32]/20" />

          <div className="absolute inset-[13%] rotate-[-18deg]">
            <div className="h-full w-full scale-y-[0.42]">
              <div className="relative h-full w-full rounded-full border border-[#f0522b]/45 motion-safe:animate-[spin_26s_linear_infinite]">
                {orbitParticleClassNames.map((particleClassName, index) => (
                  <span
                    className={cn(
                      'absolute rounded-full bg-[#f0522b] motion-safe:animate-pulse',
                      particleClassName,
                    )}
                    key={`orbit-particle-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-[31%] overflow-hidden rounded-full border border-[#f0522b]/20 bg-[#efede4]/55 motion-safe:delay-500 motion-safe:duration-1000 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:fill-mode-both">
            <div className="absolute inset-[10%_34%] rounded-[50%] border border-[#f0522b]/15" />
            <div className="absolute inset-[29%_8%] rounded-[50%] border border-[#f0522b]/15" />
            <div className="absolute left-[8%] right-[8%] top-1/2 border-t border-[#f0522b]/15" />
          </div>

          <div className="absolute left-[62%] top-[31%] grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full border border-[#f0522b] bg-[#efede4] motion-safe:animate-pulse">
            <span className="h-[0.45rem] w-[0.45rem] rounded-full bg-[#f0522b]" />
          </div>
          <p className="absolute bottom-[8%] left-0 right-0 hidden text-center text-[0.6rem] font-bold tracking-[0.18em] text-[#f0522b] lg:block">
            NO FIX
          </p>
        </div>
      </div>

      <footer className="z-20 mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-start gap-8 border-t border-[#173a32]/20 px-5 pb-[env(safe-area-inset-bottom)] text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-[#5f706b] motion-safe:delay-700 motion-safe:duration-700 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both sm:justify-between sm:px-8 lg:px-12">
        <p>{t('footer')}</p>
        <p className="hidden sm:block" aria-hidden="true">
          FRAME 04 · SIGNAL 00
        </p>
      </footer>
    </main>
  );
}
