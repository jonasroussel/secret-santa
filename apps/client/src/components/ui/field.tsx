import { cn } from 'cn';
import * as React from 'react';

import { Label } from '@/components/ui/label';

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-group'
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-6 *:data-[slot=field-group]:gap-4',
        className,
      )}
      {...props}
    />
  );
}

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role='group'
      data-slot='field'
      className={cn(
        'group/field flex w-full flex-col gap-2 *:w-full data-[invalid=true]:text-destructive [&>.sr-only]:w-auto',
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot='field-label'
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='field-description'
      className={cn(
        'text-left text-sm leading-normal font-normal text-muted-foreground',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: React.ComponentProps<'div'>) {
  if (!props.children) {
    return null;
  }

  return (
    <div
      role='alert'
      data-slot='field-error'
      className={cn('text-sm font-semibold text-destructive', className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldDescription, FieldError, FieldGroup };
