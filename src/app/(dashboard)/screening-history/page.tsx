'use client';

import Results from '@/components/run-screening/results';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SourceBadge, SourceType } from '@/components/source-badge';
import { ScreeningTypeBadge } from '@/components/screening-type-badge';
import { Status, ScreeningType, SCREENING_TYPE_META } from '@/types';
import { formatDate, getApiUrl } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftIcon, EyeIcon } from 'lucide-react';
import {
  ProgressBadge,
  PROGRESS_STATUS_FILTER_OPTIONS,
} from '@/components/progress-badge';
import { useState } from 'react';

type SessionInfo = {
  sessionId: string;
  createTime: string;
  overallStatus: string;
  count: number;
  source: string;
  sourceId: string;
  failedEnsCount: number;
  // Which pipeline this run was screened against — set once at upload
  // time via the domestic/international popup, read straight through
  // from session_screening_status.screening_type. No backend changes
  // needed: getSessionInfo() already selects every column.
  screeningType: ScreeningType;
};

export default function ScreeningHistoryPage() {
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [selectedScreeningType, setSelectedScreeningType] = useState<ScreeningType>('domestic');

  const columns: ColumnDef<SessionInfo>[] = [
    {
      accessorKey: 'sessionId',
      size: 170,
      header: () => {
        return (
          <div className="flex items-center justify-center w-full">
            <span>Session ID</span>
          </div>
        );
      },
    },
    {
      header: 'Initiated On',
      accessorKey: 'createTime',
      size: 120,
      cell: ({ row }) => {
        return <div>{formatDate(row.original.createTime)}</div>;
      },
      meta: {
        filterVariant: 'none',
      },
    },
    {
      header: 'Source',
      accessorKey: 'source',
      meta: {
        filterVariant: 'select',
        filterOptions: {
          options: [
            { label: 'Periodic Monitoring', value: 'PD' },
            { label: 'On Demand Re-Screening', value: 'OD' },
            { label: 'New Upload', value: 'NU' },
            { label: 'Continuous Monitoring', value: 'CM' },
          ],
        },
      },
      size: 150,
      cell: ({ row }) => {
        const source = row.original.source as SourceType;
        const sourceId = row.original.sourceId;
        if (!source) {
          return <div>-</div>;
        }

        const sourceBadge = <SourceBadge source={source} />;

        if ((source === 'NU' || source === 'OD') && sourceId) {
          return (
            <div className="flex gap-2">
              {sourceBadge}
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-800 ring-gray-600/20 font-medium border-0 inline-flex items-center justify-center ring-1 ring-inset"
              >
                {sourceId}
              </Badge>
            </div>
          );
        }

        return source ? (
          <div className="flex items-start">
            <SourceBadge source={source} />
          </div>
        ) : (
          <div>-</div>
        );
      },
    },

    {
      header: 'Pipeline',
      accessorKey: 'screeningType',
      size: 150,
      meta: {
        filterVariant: 'select',
        filterOptions: {
          options: [
            { label: SCREENING_TYPE_META.domestic.shortLabel, value: 'domestic' },
            { label: SCREENING_TYPE_META.international.shortLabel, value: 'international' },
          ],
        },
      },
      cell: ({ row }) => (
        <ScreeningTypeBadge screeningType={row.original.screeningType} />
      ),
    },

    {
      header: 'Status',
      accessorKey: 'overallStatus',
      size: 100,
      meta: {
        filterVariant: 'select',
        filterOptions: {
          options: PROGRESS_STATUS_FILTER_OPTIONS, // replaced inline list
        },
      },
      cell: ({ row }) => {
        const status = row.original.overallStatus as Status;
        const failedEnsCount = row.original.failedEnsCount ?? 0;
        return (
          <ProgressBadge status={status} failedEnsCount={failedEnsCount} />
        );
      },
    },

    {
      header: () => {
        return <div className="justify-self-end">Details</div>;
      },
      accessorKey: 'viewResults',
      meta: {
        filterVariant: 'none',
      },
      size: 75,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 w-full"
              onClick={() => {
                setSessionStatus(row.original.overallStatus as Status);
                handleViewResults(row.original.sessionId, row.original.screeningType);
              }}
            >
              <EyeIcon className="h-4 w-4" />
              View
            </Button>
          </div>
        );
      },
    },
  ];

  const handleViewResults = (sessionId: string, screeningType: ScreeningType) => {
    setSessionId(sessionId);
    setSelectedScreeningType(screeningType);
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Screening History</h1>
      <p className="text-muted-foreground">
        View and manage your screening history.
      </p>
      <div className="flex flex-col gap-4 mt-4">
        {sessionId ? (
          <div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 w-[200px] mb-4"
              onClick={() => setSessionId('')}
              disabled={!sessionId}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Session Info
            </Button>

            <Results
              sessionId={sessionId}
              sessionInitialStatus={sessionStatus}
              initialScreeningType={selectedScreeningType}
            />
          </div>
        ) : (
          <PaginatedTable
            columns={columns}
            endpoint={getApiUrl('/api/get-screening-history-pipeline')}
            initialSorting={[{ id: 'createTime', desc: true }]}
          />
        )}
      </div>
    </>
  );
}