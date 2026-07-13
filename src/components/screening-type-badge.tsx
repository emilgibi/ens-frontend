import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScreeningType, SCREENING_TYPE_META } from '@/types';
import { BadgeSize } from '@/components/source-badge';

interface ScreeningTypeBadgeProps {
  screeningType: ScreeningType | string | null | undefined;
  size?: BadgeSize;
  className?: string;
}

const STYLES: Record<ScreeningType, string> = {
  domestic: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20',
  international: 'bg-indigo-100 text-indigo-900 ring-indigo-600/20',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  default: 'min-w-[120px] text-sm py-1',
  small: 'min-w-[80px] text-xs py-0.5 px-2 rounded-sm',
};

export const ScreeningTypeBadge: React.FC<ScreeningTypeBadgeProps> = ({
  screeningType,
  size = 'small',
  className = '',
}) => {
  if (!screeningType) return <div>-</div>;

  const type = screeningType as ScreeningType;
  const meta = SCREENING_TYPE_META[type];
  const styles = STYLES[type] ?? 'bg-gray-100 text-gray-900 ring-gray-600/20';
  const label = meta?.shortLabel ?? screeningType;

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        SIZE_STYLES[size],
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
