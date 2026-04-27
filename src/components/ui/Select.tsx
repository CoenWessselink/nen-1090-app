import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn('select', className)} {...props} />,
);

Select.displayName = 'Select';
