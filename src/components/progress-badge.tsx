'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  CircleCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status } from '@/types';
import React from 'react';

export const PROGRESS_STATUS_FILTER_OPTIONS = [
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'Skipped', value: 'SKIPPED' },
  { label: 'Queued', value: 'QUEUED' },
];

type ProgressBadgeProps = {
  status: Status | string;
  failedEnsCount?: number;
  className?: string;
  showFailedIndicator?: boolean;
};

const statusMeta: Record<
  string,
  { label: string; icon: any; classes: string; spin?: boolean }
> = {
  COMPLETED: {
    label: 'Completed',
    icon: CircleCheck,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: Loader2,
    classes: 'bg-amber-50 text-amber-700 ring-amber-200',
    spin: true,
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-rose-50 text-rose-500 ring-rose-200',
  },
  NOT_STARTED: {
    label: 'Not Started',
    icon: Circle,
    classes: 'bg-slate-50 text-slate-600 ring-slate-200',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: SkipForward,
    classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  QUEUED: {
    label: 'Queued',
    icon: Clock,
    classes: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
};

export function ProgressBadge({
  status,
  failedEnsCount = 0,
  className,
  showFailedIndicator = true,
}: ProgressBadgeProps) {
  const meta = statusMeta[status] ?? {
    label: status,
    icon: Circle,
    classes: 'bg-slate-50 text-slate-600 ring-slate-200',
  };
  const Icon = meta.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
          meta.classes,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', meta.spin && 'animate-spin')} />
        {meta.label}
      </span>
      {showFailedIndicator && failedEnsCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle
              className="h-4 w-4 text-amber-500 cursor-pointer"
              aria-label="Failed entity count"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {failedEnsCount} failed entit{failedEnsCount === 1 ? 'y' : 'ies'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
