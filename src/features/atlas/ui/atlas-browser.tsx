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
  const listRef = useRef<HTMLUListElement>(null);
  const activeItemId = items.find((item) => item.active)?.id;

  useEffect(() => {
    setQuery('');
  }, [scopeKey]);

  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      return;
    }

    const list = listRef.current;
    const activeItem = activeItemRef.current;
    if (!list || !activeItem || list.scrollHeight <= list.clientHeight) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop += itemRect.top - listRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
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
      className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[var(--atlas-rule)] bg-[var(--atlas-panel)] [overflow-anchor:none] lg:rounded-none lg:border-y-0 lg:border-l lg:border-r-0"
      aria-labelledby="atlas-browser-title"
    >
      <div className="shrink-0 border-b border-[var(--atlas-rule)] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="atlas-browser-title"
            className="min-w-0 text-pretty font-serif text-[1.4rem] leading-none tracking-[-0.035em] sm:text-[1.6rem] lg:text-[1.7rem]"
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
        <ul
          ref={listRef}
          className="min-h-0 flex-1 divide-y divide-[var(--atlas-rule)] lg:block lg:space-y-px lg:divide-y-0 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-color:var(--atlas-rule)_transparent] lg:[scrollbar-width:thin]"
        >
          {filteredItems.map((item, index) => (
            <li
              key={item.id}
              ref={item.active ? activeItemRef : undefined}
              className="min-w-0 bg-[var(--atlas-panel)] [contain-intrinsic-size:92px] [content-visibility:auto]"
            >
              <button
                type="button"
                data-atlas-browser-item={item.id}
                data-state={item.active ? 'active' : 'idle'}
                className={cn(
                  'group relative grid min-h-[92px] w-full touch-manipulation grid-cols-[112px_minmax(0,1fr)_28px] items-center gap-0 bg-[var(--atlas-panel)] text-left outline-none transition-[background-color,color] duration-200 hover:bg-[var(--atlas-card)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] sm:grid-cols-[132px_minmax(0,1fr)_32px] lg:grid-cols-[104px_minmax(0,1fr)_28px]',
                  item.active &&
                    'bg-[var(--atlas-card-active)] shadow-[inset_3px_0_0_var(--atlas-accent)]',
                )}
                onClick={(event) => item.onSelect(event.currentTarget)}
                aria-current={item.active ? 'true' : undefined}
              >
                <span className="relative block h-[92px] overflow-hidden bg-[var(--atlas-panel-strong)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    width={264}
                    height={184}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none"
                    loading={index < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 border-r border-transparent transition-colors',
                      item.active
                        ? 'border-[var(--atlas-accent)]'
                        : 'border-[var(--atlas-rule)]',
                    )}
                  />
                </span>

                <span className="min-w-0 px-3.5 py-2 sm:px-4">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--atlas-ink)]">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--atlas-muted)] lg:text-[10px]">
                    {item.meta}
                  </span>
                </span>

                <ArrowUpRight
                  className={cn(
                    'h-4 w-4 text-[var(--atlas-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--atlas-accent)]',
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
