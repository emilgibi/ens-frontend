import { cn } from '@/lib/utils';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { Badge } from '../ui/badge';

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-cyan-100/50',
    icon: PlayIcon,
  },
  'in progress': {
    label: 'In Progress',
    className: 'text-gray-600 bg-gray-50 ring-gray-500/10',
    icon: PauseIcon,
  },
  paused: {
    label: 'Paused',
    className:
      'bg-slate-50 text-slate-600 border-slate-200 shadow-slate-100/50',
    icon: PauseIcon,
  },
  inactive: {
    label: 'Paused',
    className:
      'bg-slate-50 text-slate-600 border-slate-200 shadow-slate-100/50',
    icon: PauseIcon,
  },
} as const;

export type StatusType = keyof typeof statusConfig;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: Readonly<StatusBadgeProps>) {
  const normalizedStatus = status.toLowerCase() as StatusType;
  const config = statusConfig[normalizedStatus];
  const Icon = config.icon ?? null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 px-3 py-1 text-sm font-medium transition-all duration-200',
        config.className,
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
