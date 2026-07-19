import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="border-none bg-[#173a32] font-sans text-xs text-white shadow-md">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
