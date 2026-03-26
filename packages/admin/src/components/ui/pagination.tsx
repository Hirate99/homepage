import * as React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from './button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn(
        'flex w-full items-center justify-between gap-3',
        className,
      )}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-3',
        className,
      )}
      {...props}
    />
  );
}

function PaginationButton({
  isActive,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { isActive?: boolean }) {
  return (
    <Button
      variant={isActive ? 'default' : 'secondary'}
      size="sm"
      className={cn('min-w-10 rounded-full', className)}
      {...props}
    />
  );
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="subtle" size="sm" {...props}>
      <ChevronLeft className="h-4 w-4" />
      Prev
    </Button>
  );
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="subtle" size="sm" {...props}>
      Next
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
};
