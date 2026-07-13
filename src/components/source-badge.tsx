import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SourceType = 'PD' | 'OD' | 'NU' | 'CM' | 'NEW';
export type BadgeSize = 'default' | 'small';

interface SourceBadgeProps {
  source: SourceType;
  size?: BadgeSize;
  className?: string;
}

interface SourceConfig {
  styles: string;
  label: string;
}

const SOURCE_CONFIGS: Record<SourceType, SourceConfig> = {
  PD: {
    styles: 'bg-blue-100 text-blue-900 ring-blue-600/20',
    label: 'Periodic Monitoring',
  },
  OD: {
    styles: 'bg-purple-100 text-purple-900 ring-purple-600/20',
    label: 'On Demand Re-Screening',
  },
  NU: {
    styles: 'bg-sky-100 text-sky-900 ring-sky-600/20',
    label: 'New Upload',
  },
  CM: {
    styles: 'bg-orange-100 text-orange-900 ring-orange-600/20',
    label: 'Continuous Monitoring',
  },
  NEW: {
    styles: 'bg-sky-100 text-sky-900 ring-sky-600/20 min-w-auto',
    label: 'New',
  },
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  default: 'min-w-[120px] text-sm py-1',
  small: 'min-w-[80px] text-xs py-0.5 px-2 rounded-sm',
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = 'small',
  className = '',
}) => {
  const { styles, label } = SOURCE_CONFIGS[source] || {
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
