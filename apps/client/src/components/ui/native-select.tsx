import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div data-slot='native-select-wrapper' className='relative w-full'>
      <select
        data-slot='native-select'
        className={cn(
          'h-12 w-full min-w-0 appearance-none rounded-md border-[1.5px] border-input bg-white py-1 pr-10 pl-3.5 text-base text-foreground transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden='true'
        className='text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2'
      />
    </div>
  );
}

export { NativeSelect };
