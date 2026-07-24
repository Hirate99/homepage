'use client';

import { useEffect, useMemo, useState } from 'react';

import { ChevronDown, Search } from 'lucide-react';

import { AtlasDockCard } from './atlas-dock-card';

export interface AtlasBrowserItem {
  id: string;
  active: boolean;
  image: string;
  title: string;
  meta: string;
  onSelect: (element: HTMLButtonElement) => void;
}

interface AtlasBrowserProps {
  title: string;
  items: AtlasBrowserItem[];
  scopeKey: string;
  searchLabel: string;
  searchPlaceholder: string;
  resultLabel: (count: number) => string;
  showMoreLabel: (count: number) => string;
  emptyLabel: string;
}

const PAGE_SIZE = 8;

export function AtlasBrowser({
  title,
  items,
  scopeKey,
  searchLabel,
  searchPlaceholder,
  resultLabel,
  showMoreLabel,
  emptyLabel,
}: AtlasBrowserProps) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setQuery('');
    setVisibleCount(PAGE_SIZE);
  }, [scopeKey]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      `${item.title} ${item.meta}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [items, query]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const remainingCount = Math.max(
    filteredItems.length - visibleItems.length,
    0,
  );

  return (
    <section
      data-slot="atlas-browser"
      className="border-t border-[var(--atlas-rule)] pt-5 sm:pt-6"
      aria-labelledby="atlas-browser-title"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="atlas-browser-title"
            className="font-serif text-[clamp(1.9rem,4vw,3rem)] leading-none tracking-[-0.035em]"
          >
            {title}
          </h3>
          <p
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--atlas-muted)]"
            aria-live="polite"
          >
            {resultLabel(filteredItems.length)}
          </p>
        </div>

        <label className="relative block w-full sm:max-w-[320px]">
          <span className="sr-only">{searchLabel}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--atlas-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={searchPlaceholder}
            className="min-h-12 w-full rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] py-3 pl-11 pr-4 text-sm text-[var(--atlas-ink)] shadow-[0_12px_36px_-30px_var(--atlas-shadow)] outline-none placeholder:text-[var(--atlas-muted)] focus-visible:border-[var(--atlas-accent)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
          />
        </label>
      </div>

      {visibleItems.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visibleItems.map((item) => (
            <li key={item.id} className="min-w-0">
              <AtlasDockCard
                active={item.active}
                image={item.image}
                title={item.title}
                meta={item.meta}
                onClick={item.onSelect}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="grid min-h-40 place-items-center rounded-[18px] border border-dashed border-[var(--atlas-rule)] px-6 text-center text-sm text-[var(--atlas-muted)]">
          {emptyLabel}
        </p>
      )}

      {remainingCount > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] px-6 text-sm font-semibold text-[var(--atlas-ink)] outline-none transition hover:border-[var(--atlas-accent)] hover:bg-[var(--atlas-card-active)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--atlas-bg)]"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          >
            {showMoreLabel(Math.min(PAGE_SIZE, remainingCount))}
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
