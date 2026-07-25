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
}

export function AtlasBrowser({
  title,
  items,
  scopeKey,
  searchLabel,
  searchPlaceholder,
  resultLabel,
  emptyLabel,
}: AtlasBrowserProps) {
  const [query, setQuery] = useState('');
  const activeItemRef = useRef<HTMLLIElement>(null);
  const activeItemId = items.find((item) => item.active)?.id;

  useEffect(() => {
    setQuery('');
  }, [scopeKey]);

  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      return;
    }

    activeItemRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
  }, [activeItemId, scopeKey]);

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

  const showSearch = items.length > 8 || query.length > 0;

  return (
    <aside
      data-slot="atlas-browser"
      className="flex min-h-0 flex-col border-t border-[var(--atlas-rule)] bg-[var(--atlas-panel)] [overflow-anchor:none] lg:border-l lg:border-t-0"
      aria-labelledby="atlas-browser-title"
    >
      <div className="shrink-0 border-b border-[var(--atlas-rule)] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="atlas-browser-title"
            className="min-w-0 text-pretty font-serif text-[1.55rem] leading-none tracking-[-0.035em] sm:text-[1.7rem]"
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

        {showSearch && (
          <label className="relative mt-4 block">
            <span className="sr-only">{searchLabel}</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--atlas-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              name={`atlas-search-${scopeKey}`}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={`${searchPlaceholder}…`}
              className="min-h-11 w-full touch-manipulation rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] py-2.5 pl-10 pr-4 text-sm text-[var(--atlas-ink)] outline-none placeholder:text-[var(--atlas-muted)] focus-visible:border-[var(--atlas-accent)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
            />
          </label>
        )}
      </div>

      {filteredItems.length > 0 ? (
        <ul className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-[var(--atlas-rule)] sm:grid-cols-3 lg:block lg:space-y-px lg:overflow-y-auto lg:overscroll-contain lg:bg-[var(--atlas-panel)] lg:[scrollbar-color:var(--atlas-rule)_transparent] lg:[scrollbar-width:thin]">
          {filteredItems.map((item, index) => (
            <li
              key={item.id}
              ref={item.active ? activeItemRef : undefined}
              className="min-w-0 bg-[var(--atlas-panel)] [contain-intrinsic-size:184px] [content-visibility:auto] lg:[contain-intrinsic-size:92px]"
            >
              <button
                type="button"
                data-atlas-browser-item={item.id}
                data-state={item.active ? 'active' : 'idle'}
                className={cn(
                  'group relative grid h-full min-h-[176px] w-full touch-manipulation grid-rows-[112px_auto] gap-0 bg-[var(--atlas-panel)] text-left outline-none transition-[background-color,color] duration-200 hover:bg-[var(--atlas-card)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] lg:min-h-[92px] lg:grid-cols-[104px_minmax(0,1fr)_28px] lg:grid-rows-1 lg:items-center',
                  item.active &&
                    'bg-[var(--atlas-card-active)] shadow-[inset_3px_0_0_var(--atlas-accent)]',
                )}
                onClick={(event) => item.onSelect(event.currentTarget)}
                aria-current={item.active ? 'true' : undefined}
              >
                <span className="relative block h-full overflow-hidden bg-[var(--atlas-panel-strong)] lg:h-[92px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    width={208}
                    height={112}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none"
                    loading={index < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 border-b border-transparent transition-colors lg:border-b-0 lg:border-r',
                      item.active
                        ? 'border-[var(--atlas-accent)]'
                        : 'border-[var(--atlas-rule)]',
                    )}
                  />
                </span>

                <span className="min-w-0 px-3 py-3 lg:px-4 lg:py-2">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--atlas-ink)]">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--atlas-muted)] lg:text-[10px]">
                    {item.meta}
                  </span>
                </span>

                <ArrowUpRight
                  className={cn(
                    'bg-[var(--atlas-card)]/80 absolute right-2.5 top-2.5 h-4 w-4 rounded-full p-0.5 text-[var(--atlas-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--atlas-accent)] lg:static lg:bg-transparent lg:p-0',
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
