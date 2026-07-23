import type { CityPost } from '@/lib/collections';
import { useTranslations } from 'next-intl';

import { getAtlasTheme } from './theme';
import type { SongDefinition } from '../songs';

interface AtlasShellProps {
  song: SongDefinition;
  posts?: CityPost[];
  status?: 'loading' | 'error';
  onRetry?: () => void;
}

function getAtlasSummary(posts: CityPost[]) {
  const countries = new Map<
    string,
    { name: string; places: Set<string>; posts: number }
  >();

  posts.forEach((post) => {
    if (!post.location) {
      return;
    }

    const country = countries.get(post.location.country) ?? {
      name: post.location.country,
      places: new Set<string>(),
      posts: 0,
    };
    country.places.add(post.location.locationName);
    country.posts += 1;
    countries.set(country.name, country);
  });

  const items = [...countries.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  return {
    countries: items,
    countryCount: items.length,
    placeCount: items.reduce((total, item) => total + item.places.size, 0),
  };
}

export function AtlasShell({
  song,
  posts = [],
  status,
  onRetry,
}: AtlasShellProps) {
  const t = useTranslations('Atlas');
  const theme = getAtlasTheme(song);
  const summary = getAtlasSummary(posts);
  const hasSummary = summary.countries.length > 0;

  return (
    <section
      id="atlas"
      data-song={song.id}
      data-theme={song.theme}
      style={theme.cssVariables}
      className="relative min-h-[720px] w-full scroll-mt-0 bg-[var(--atlas-bg)] px-4 pb-20 pt-12 text-[var(--atlas-ink)] sm:px-8 sm:pb-24 sm:pt-16 lg:min-h-screen lg:px-12"
      aria-labelledby="atlas-title"
      aria-busy={status === 'loading'}
    >
      <div className="relative mx-auto w-full max-w-[1240px]">
        <header className="flex items-end justify-between gap-5 border-t border-[var(--atlas-rule)] pb-7 pt-5 sm:gap-8 sm:pb-9 sm:pt-7">
          <h2
            id="atlas-title"
            className="font-serif text-[clamp(3.25rem,7vw,6.4rem)] leading-[0.88] tracking-[-0.055em]"
          >
            {t('title')}
          </h2>
          <p className="pb-0.5 text-right text-[10px] font-semibold uppercase tabular-nums leading-5 tracking-[0.16em] text-[var(--atlas-muted)] sm:pb-1 sm:text-xs sm:tracking-[0.18em]">
            {hasSummary ? (
              <>
                {String(summary.countryCount).padStart(2, '0')}{' '}
                {t('countries', { count: summary.countryCount })}
                <span
                  className="mx-1.5 text-[var(--atlas-rule)]"
                  aria-hidden="true"
                >
                  ·
                </span>
                {String(summary.placeCount).padStart(2, '0')}{' '}
                {t('places', { count: summary.placeCount })}
              </>
            ) : (
              t('eyebrow')
            )}
          </p>
        </header>

        <div
          data-slot="atlas-placeholder"
          data-state={status ?? 'idle'}
          className="relative mx-auto h-[min(72svh,570px)] min-h-[430px] w-full overflow-hidden rounded-[20px] border border-[var(--atlas-rule)] bg-[var(--atlas-panel)] shadow-[0_32px_90px_-58px_var(--atlas-shadow)] sm:h-[620px] sm:rounded-[28px] lg:h-[min(68vh,700px)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_46%,var(--atlas-glow),transparent_54%)]"
          />

          <div className="absolute inset-0 grid place-items-center">
            <div
              aria-hidden="true"
              className="relative aspect-square w-[min(70vw,310px)] overflow-hidden rounded-full border border-[var(--atlas-rule)] opacity-55 shadow-[0_24px_80px_-36px_var(--atlas-shadow)] sm:w-[min(44vw,390px)]"
              style={{
                backgroundImage: `url(${theme.globe.textures.compact})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,transparent_0%,transparent_28%,var(--atlas-shadow)_88%)]" />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center px-5 sm:bottom-7">
            {status === 'error' ? (
              <div className="bg-[var(--atlas-card)]/90 rounded-full border border-[var(--atlas-rule)] px-5 py-3 text-center shadow-lg backdrop-blur-md">
                <p className="text-sm font-medium">{t('loadError')}</p>
                {onRetry && (
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-full border border-[var(--atlas-rule)] px-5 text-sm font-semibold outline-none transition hover:border-[var(--atlas-accent)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
                    onClick={onRetry}
                  >
                    {t('retry')}
                  </button>
                )}
              </div>
            ) : (
              <p
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--atlas-muted)]"
                role="status"
                aria-live="polite"
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--atlas-accent)] motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t('loading')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
