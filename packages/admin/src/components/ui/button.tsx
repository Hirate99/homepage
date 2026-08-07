import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-xl font-sans text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--studio-accent] focus-visible:ring-offset-2 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-[--studio-accent] px-5 py-3 text-white shadow-[0_8px_20px_rgba(223,100,56,0.18)] hover:-translate-y-0.5 hover:bg-[--studio-accent-hover]',
        secondary:
          'border border-black/10 bg-white px-5 py-3 text-[--studio-ink] hover:-translate-y-0.5 hover:border-black/20 hover:bg-[#fafafa]',
        subtle:
          'border border-transparent bg-[#f5f5f5] px-4 py-2.5 text-[--studio-ink] hover:bg-[#ededed]',
        ghost:
          'border border-transparent bg-transparent px-3 py-2 text-[--studio-muted] hover:bg-[#f5f5f5] hover:text-[--studio-ink]',
        destructive:
          'border border-red-300/60 bg-red-50 px-5 py-3 text-red-700 hover:-translate-y-0.5 hover:border-red-400/80 hover:bg-red-100',
      },
      size: {
        default: '',
        sm: 'px-3.5 py-2 text-xs',
        icon: 'h-11 w-11 rounded-xl',
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
