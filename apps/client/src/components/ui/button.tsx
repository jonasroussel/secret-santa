import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';
import * as React from 'react';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md text-base font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_3px_0_var(--color-primary-dark),inset_0_0_0_2px_rgb(255_255_255/0.18)] hover:brightness-95 active:not-aria-[haspopup]:shadow-[0_2px_0_var(--color-primary-dark),inset_0_0_0_2px_rgb(255_255_255/0.18)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        outline: 'border-[1.5px] border-input bg-white text-foreground hover:bg-muted aria-expanded:bg-muted',
        ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        link: 'text-secondary underline underline-offset-4 hover:text-secondary/80',
      },
      size: {
        default: 'h-12 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        sm: 'h-11 gap-1.5 px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        lg: "h-15 gap-2.5 rounded-lg px-6 font-heading text-[1.375rem] [&_svg:not([class*='size-'])]:size-6",
        icon: 'size-11',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-11 px-0' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot='button'
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
