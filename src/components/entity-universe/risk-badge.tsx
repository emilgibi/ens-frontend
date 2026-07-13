import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RiskLevel = 'high' | 'medium' | 'low' | 'none' | 'no alerts';
export type BadgeSize = 'default' | 'small';

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: BadgeSize;
  className?: string;
  keepFill?: boolean;
}

interface RiskConfig {
  styles: string;
  label: string;
}

const RISK_CONFIGS: Record<RiskLevel, RiskConfig> = {
  high: { styles: 'bg-red-100 text-red-900 ring-red-600/20', label: 'High' },
  medium: {
    styles: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
    label: 'Medium',
  },
  low: {
    styles: 'bg-green-100 text-green-900 ring-green-600/20',
    label: 'Low',
  },
  'no alerts': {
    styles: 'bg-gray-100 text-gray-700 ring-gray-600/20',
    label: 'No Alerts',
  },
  none: {
    styles: 'bg-gray-100 text-gray-900 ring-gray-600/20',
    label: 'No Alerts',
  },
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  default: 'min-w-[90px] text-sm py-1',
  small: 'min-w-[70px] text-xs py-0.5 px-2 rounded-sm',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  risk,
  size = 'small',
  className = '',
  keepFill = true,
}) => {
  const normalizedRisk = (risk?.toLowerCase() || 'none') as RiskLevel;
  const { styles, label } = RISK_CONFIGS[normalizedRisk] || RISK_CONFIGS['none'];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        styles,
        sizeStyle,
        'border-0',
        className,
        'inline-flex items-center justify-center ring-1 ring-inset',
        !keepFill ? 'bg-transparent' : ''
      )}
    >
      {label}
    </Badge>
  );
};
