import Image from 'next/image';

import { clipCDNImage, cn } from '@/lib/utils';

interface AtlasDockCardProps {
  active: boolean;
  image: string;
  title: string;
  meta: string;
  onClick: (element: HTMLButtonElement) => void;
}

export function AtlasDockCard({
  active,
  image,
  title,
  meta,
  onClick,
}: AtlasDockCardProps) {
  return (
    <button
      type="button"
      data-slot="atlas-dock-card"
      data-state={active ? 'active' : 'idle'}
      aria-pressed={active}
      aria-label={`${title}, ${meta}`}
      onClick={(event) => onClick(event.currentTarget)}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={cn(
        'group relative min-w-[172px] max-w-[172px] appearance-none overflow-hidden rounded-[14px] border bg-[var(--atlas-card)] text-left shadow-[0_12px_36px_-28px_var(--atlas-shadow)] outline-none duration-200 [transition-property:transform,border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--atlas-bg)] sm:min-w-[224px] sm:max-w-[224px]',
        active
          ? 'border-[var(--atlas-accent)] bg-[var(--atlas-card-active)] shadow-[0_18px_44px_-26px_var(--atlas-shadow)]'
          : 'border-[var(--atlas-rule)] sm:hover:-translate-y-0.5 sm:hover:border-[var(--atlas-accent)]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 z-10 h-[3px] origin-left bg-[var(--atlas-accent)] transition-transform duration-300',
          active ? 'scale-x-100' : 'scale-x-0',
        )}
      />
      <span className="relative block aspect-[4/3] overflow-hidden bg-[var(--atlas-panel-strong)]">
        <Image
          src={clipCDNImage(image, { width: 520, quality: 82 })}
          alt=""
          fill
          sizes="(min-width: 640px) 224px, 172px"
          className="object-cover transition-transform duration-500 ease-out motion-reduce:transition-none sm:group-hover:scale-[1.025]"
          loading="lazy"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10 opacity-60"
        />
      </span>
      <span className="block border-t border-[var(--atlas-rule)] px-3.5 py-3 sm:px-4 sm:py-3.5">
        <span className="block truncate text-[15px] font-semibold leading-5 text-[var(--atlas-ink)] sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] uppercase leading-5 tracking-[0.12em] text-[var(--atlas-muted)] sm:text-xs">
          {meta}
        </span>
      </span>
    </button>
  );
}
