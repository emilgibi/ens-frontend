import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CircleCheck, CircleX, Info } from 'lucide-react';
import { ReactNode } from 'react';

const toastVariants = cva('rounded-md border px-4 py-3', {
  variants: {
    variant: {
      success: 'border-green-500/50 bg-green-50 text-green-600',
      error: 'border-red-500/50 bg-red-50 text-red-600',
      warning: 'border-yellow-500/50 bg-yellow-50 text-yellow-600',
      info: 'border-blue-500/50 bg-blue-50 text-blue-600',
    },
  },
  defaultVariants: {
    variant: 'error',
  },
});

const iconVariants = cva('mt-0.5 flex-shrink-0 opacity-60', {
  variants: {
    variant: {
      success: 'text-green-600',
      error: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600',
    },
  },
  defaultVariants: {
    variant: 'error',
  },
});

export interface ToastMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  message: string | ReactNode;
  title?: string;
}

const iconMap = {
  success: CircleCheck,
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
} as const;

export function ToastMessage({
  variant,
  message,
  title,
  className,
  ...props
}: ToastMessageProps) {
  const IconComponent = iconMap[variant || 'error'];

  return (
    <div
      className={cn('bg-background rounded-md min-w-[300px]', className)}
      {...props}
    >
      <div className={cn(toastVariants({ variant }))}>
        <div className='flex items-start gap-3'>
          <IconComponent
            className={cn(iconVariants({ variant }))}
            size={16}
            aria-hidden='true'
          />
          <div className='flex-1'>
            {title && <p className='text-sm font-medium mb-1'>{title}</p>}
            <p className='text-sm'>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
