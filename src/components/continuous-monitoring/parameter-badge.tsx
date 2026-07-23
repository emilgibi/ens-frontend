import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CcmParameterType =
  | 'LITIGATION'
  | 'SANCTIONS'
  | 'NEGATIVE_MEDIA'
  | 'GST_COMPLIANCE'
  | 'CYBER_RISK'
  | 'FINANCIAL_DISTRESS';

export type BadgeSize = 'default' | 'small';

interface ParameterBadgeProps {
  source: CcmParameterType;
  size?: BadgeSize;
  className?: string;
}

interface ParameterConfig {
  styles: string;
  label: string;
  dot: string;
  chartColor: string;
}

export const PARAMETER_CONFIGS: Record<CcmParameterType, ParameterConfig> = {
  LITIGATION: {
    styles: 'bg-blue-100 text-blue-900 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-200',
    label: 'Litigation',
    dot: 'bg-blue-500',
    chartColor: '#3b82f6',
  },
  SANCTIONS: {
    styles: 'bg-purple-100 text-purple-900 ring-purple-600/20 dark:bg-purple-950 dark:text-purple-200',
    label: 'Sanctions / Watchlist',
    dot: 'bg-purple-500',
    chartColor: '#a855f7',
  },
  NEGATIVE_MEDIA: {
    styles: 'bg-red-100 text-red-900 ring-red-600/20 dark:bg-red-950 dark:text-red-200',
    label: 'Negative Media',
    dot: 'bg-red-500',
    chartColor: '#ef4444',
  },
  GST_COMPLIANCE: {
    styles: 'bg-green-100 text-green-900 ring-green-600/20 dark:bg-green-950 dark:text-green-200',
    label: 'GST Compliance',
    dot: 'bg-green-500',
    chartColor: '#22c55e',
  },
  CYBER_RISK: {
    styles: 'bg-cyan-100 text-cyan-900 ring-cyan-600/20 dark:bg-cyan-950 dark:text-cyan-200',
    label: 'Cyber Risk',
    dot: 'bg-cyan-500',
    chartColor: '#06b6d4',
  },
  FINANCIAL_DISTRESS: {
    styles: 'bg-amber-100 text-amber-900 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-200',
    label: 'Financial Distress',
    dot: 'bg-amber-500',
    chartColor: '#f59e0b',
  },
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  default: 'min-w-[120px] text-sm py-1',
  small: 'min-w-[80px] text-xs py-0.5 px-2 rounded-sm',
};

export const ParameterBadge: React.FC<ParameterBadgeProps> = ({ source, size = 'small', className = '' }) => {
  const { styles, label } = PARAMETER_CONFIGS[source] || {
    styles: 'bg-gray-100 text-gray-900 ring-gray-600/20',
    label: source,
  };
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        sizeStyle,
        styles,
        'border-0',
        className,
        'inline-flex items-center justify-center ring-1 ring-inset',
      )}
    >
      {label}
    </Badge>
  );
};
