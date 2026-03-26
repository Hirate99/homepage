import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-[--orange-9] px-5 py-3 text-white shadow-sm hover:-translate-y-0.5 hover:bg-[--orange-8]',
        secondary:
          'border border-orange-500/18 bg-white/80 px-5 py-3 text-[--orange-9] hover:-translate-y-0.5 hover:border-orange-500/30 hover:bg-white',
        subtle:
          'border border-orange-500/12 bg-orange-50/80 px-4 py-2.5 text-[--orange-9] hover:border-orange-500/28 hover:bg-orange-50',
        ghost:
          'border border-transparent bg-transparent px-3 py-2 text-[--orange-8] hover:bg-orange-100/70 hover:text-[--orange-9]',
        destructive:
          'border border-red-300/60 bg-red-50 px-5 py-3 text-red-700 hover:-translate-y-0.5 hover:border-red-400/80 hover:bg-red-100',
      },
      size: {
        default: '',
        sm: 'px-3.5 py-2 text-xs',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
