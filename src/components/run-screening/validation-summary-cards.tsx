import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface ValidationSummaryCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  variant: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantStyles = {
  success: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    valueColor: 'text-green-600',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-600',
  },
  error: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-600',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-600',
  },
};

export function ValidationSummaryCard({
  title,
  value,
  description,
  icon: Icon,
  variant,
  className,
}: ValidationSummaryCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('py-4', className)}>
      <CardContent>
        <div className='flex items-center space-x-3'>
          <div className={cn('p-2 rounded-lg', styles.iconBg)}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          <div className='flex-1'>
            <p className='text-sm font-medium'>{title}</p>
            <p className={cn('text-2xl font-bold', styles.valueColor)}>
              {value.toLocaleString()}
            </p>
            <p className='text-xs text-muted-foreground mt-1'>{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
