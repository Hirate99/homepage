import type { CityPost } from '@/lib/collections';

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
            Places.
          </h2>
          <p className="pb-0.5 text-right text-[10px] font-semibold uppercase tabular-nums leading-5 tracking-[0.16em] text-[var(--atlas-muted)] sm:pb-1 sm:text-xs sm:tracking-[0.18em]">
            {hasSummary ? (
              <>
                {String(summary.countryCount).padStart(2, '0')} countries
                <span
                  className="mx-1.5 text-[var(--atlas-rule)]"
                  aria-hidden="true"
                >
                  ·
                </span>
                {String(summary.placeCount).padStart(2, '0')} places
              </>
            ) : (
              'Atlas / 2026'
            )}
          </p>
        </header>

        <div className="relative min-h-[520px] overflow-hidden rounded-[20px] border border-[var(--atlas-rule)] bg-[var(--atlas-panel)] p-5 sm:rounded-[28px] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45"
          />

          {hasSummary ? (
            <ul className="relative z-10 grid gap-3 sm:grid-cols-2">
              {summary.countries.map((country) => (
                <li
                  key={country.name}
                  className="bg-[var(--atlas-card)]/90 rounded-2xl border border-[var(--atlas-rule)] p-5 backdrop-blur-sm"
                >
                  <p className="font-serif text-3xl">{country.name}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--atlas-muted)]">
                    {[...country.places].sort().join(' · ')}
                  </p>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--atlas-accent)]">
                    {country.posts} {country.posts === 1 ? 'post' : 'posts'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="relative z-10 grid min-h-[470px] place-items-center text-center">
              {status === 'error' ? (
                <div>
                  <p className="text-sm font-medium">
                    The atlas could not load.
                  </p>
                  {onRetry && (
                    <button
                      type="button"
                      className="mt-4 min-h-11 rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] px-5 text-sm font-semibold outline-none transition hover:border-[var(--atlas-accent)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
                      onClick={onRetry}
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--atlas-muted)]" role="status">
                  Loading places…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
