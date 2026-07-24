'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowUpRight, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

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
  emptyLabel: string;
  activeHint: string;
}

export function AtlasBrowser({
  title,
  items,
  scopeKey,
  searchLabel,
  searchPlaceholder,
  resultLabel,
  emptyLabel,
  activeHint,
}: AtlasBrowserProps) {
  const [query, setQuery] = useState('');
  const activeItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    setQuery('');
  }, [scopeKey]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
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

  return (
    <aside
      data-slot="atlas-browser"
      className="bg-[var(--atlas-card)]/40 flex min-h-0 flex-col border-t border-[var(--atlas-rule)] lg:border-l lg:border-t-0"
      aria-labelledby="atlas-browser-title"
    >
      <div className="shrink-0 border-b border-[var(--atlas-rule)] px-4 pb-4 pt-5 sm:px-5 lg:px-6 lg:pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="atlas-browser-title"
            className="min-w-0 truncate font-serif text-[clamp(1.8rem,3vw,2.6rem)] leading-none tracking-[-0.035em]"
          >
            {title}
          </h3>
          <p
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--atlas-muted)]"
            aria-live="polite"
          >
            {resultLabel(filteredItems.length)}
          </p>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">{searchLabel}</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--atlas-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            className="min-h-11 w-full rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] py-2.5 pl-10 pr-4 text-sm text-[var(--atlas-ink)] outline-none placeholder:text-[var(--atlas-muted)] focus-visible:border-[var(--atlas-accent)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
          />
        </label>
      </div>

      {filteredItems.length > 0 ? (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2.5 pr-2 [scrollbar-color:var(--atlas-rule)_transparent] [scrollbar-width:thin] sm:p-3 lg:p-3">
          {filteredItems.map((item, index) => (
            <li
              key={item.id}
              ref={item.active ? activeItemRef : undefined}
              className="min-w-0"
            >
              <button
                type="button"
                data-atlas-browser-item={item.id}
                data-state={item.active ? 'active' : 'idle'}
                className={cn(
                  'group grid min-h-[82px] w-full grid-cols-[78px_minmax(0,1fr)_24px] items-center gap-3 rounded-2xl border border-transparent p-2 text-left outline-none transition duration-200 hover:border-[var(--atlas-rule)] hover:bg-[var(--atlas-card)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]',
                  item.active &&
                    'border-[var(--atlas-accent)] bg-[var(--atlas-card-active)] shadow-[0_12px_30px_-24px_var(--atlas-shadow)]',
                )}
                onClick={(event) => item.onSelect(event.currentTarget)}
                aria-current={item.active ? 'true' : undefined}
              >
                <span className="relative block h-[66px] overflow-hidden rounded-xl bg-[var(--atlas-panel-strong)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading={index < 5 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 border-2 border-transparent transition',
                      item.active && 'border-[var(--atlas-accent)]',
                    )}
                  />
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--atlas-ink)]">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--atlas-muted)]">
                    {item.meta}
                  </span>
                  {item.active && (
                    <span className="mt-1.5 block text-[10px] font-semibold text-[var(--atlas-accent)]">
                      {activeHint}
                    </span>
                  )}
                </span>

                <ArrowUpRight
                  className={cn(
                    'h-4 w-4 text-[var(--atlas-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--atlas-accent)]',
                    item.active && 'text-[var(--atlas-accent)]',
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="grid min-h-48 flex-1 place-items-center px-6 text-center text-sm text-[var(--atlas-muted)]">
          {emptyLabel}
        </p>
      )}
    </aside>
  );
}
