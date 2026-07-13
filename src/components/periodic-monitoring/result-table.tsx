'use client';

import { RiskBadge, RiskLevel } from '@/components/entity-universe/risk-badge';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileSignature, FileTextIcon } from 'lucide-react';
import { useState } from 'react';
import EntityInfoDialog from '../entity-universe/entity-info-dialogue';
import { DownloadDropdown } from '../shared/download-button';
import { getApiUrl } from '@/lib/utils';

type Entity = {
  ensId: string;
  externalVendorId?: string;
  name: string;
  nationalId?: string;
  country?: string;
  address?: string;
  overallSupplierRating?: string;
  lastScreenedDate?: Date;
  isScreenedAfterGroup?: boolean;
  lastSessionId: string;
};

const columns: ColumnDef<Entity>[] = [
  {
    accessorKey: 'externalVendorId',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const name = row.getValue('name') as string;
      return (
        <div className="flex items-center gap-2">
          {row.original.isScreenedAfterGroup && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-blue-500">●</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    This entity has been further re-screened through other
                    triggers after the last periodic monitoring
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {name}
        </div>
      );
    },
  },
  {
    accessorKey: 'nationalId',
    header: 'National ID',
  },
  {
    accessorKey: 'country',
    header: 'Country',
  },
  {
    accessorKey: 'address',
    header: 'Address',
  },
  {
    accessorKey: 'overallSupplierRating',
    header: 'Overall Supplier Rating',
    cell: ({ row }) => {
      const rating = row.getValue('overallSupplierRating');
      return <RiskBadge risk={rating as RiskLevel} />;
    },
    meta: {
      filterVariant: 'select',
      filterOptions: {
        options: [
          { label: 'High', value: 'High' },
          { label: 'Medium', value: 'Medium' },
          { label: 'Low', value: 'Low' },
        ],
      },
    },
  },
  {
    accessorKey: 'lastScreenedDate',
    header: 'Last Screened Date',
    meta: {
      filterVariant: 'none',
    },
    cell: ({ row }) => {
      const date = row.getValue('lastScreenedDate');
      if (!date) return '';
      return new Date(date as string).toLocaleString('en-GB', {
        hour12: false,
      });
    },
  },
  {
    id: 'actions',
    header: 'Download',
    enableSorting: false,
    meta: {
      filterVariant: 'none',
    },
    size: 100,
    cell: ({ row }) => (
      <DownloadDropdown
        options={[
          {
            sessionId: row.original.lastSessionId || '',
            ensId: row.original.ensId || '',
            fileType: 'docx',
            fileName: row.original.name,
            label: 'DOCX Report',
            icon: <FileTextIcon size={16} />,
          },
          // {
          //   sessionId: '123',
          //   ensId: '123',
          //   fileType: 'pdf',
          //   fileName: 'report.pdf',
          //   label: 'PDF Report',
          //   icon: <FileSignature size={16} />,
          // },
        ]}
      />
    ),
  },
];

interface PeriodicMonitoringResultTableProps {
  groupId: string;
}

export default function PeriodicMonitoringResultTable({
  groupId,
}: PeriodicMonitoringResultTableProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [ensId, setEnsId] = useState<string>('');
  const [lastSessionId, setLastSessionId] = useState<string>('');

  const handleRowClick = (row: any) => {
    setIsPopupOpen(true);
    setEnsId(row.ensId);
    setLastSessionId(row.lastSessionId);
  };

  return (
    <>
      <PaginatedTable
        columns={columns}
        endpoint={getApiUrl(`/api/periodic-monitoring/result-table?groupId=${groupId}`)}
        onRowClick={handleRowClick}
        initialSorting={[{ id: 'name', desc: false }]}
      />
      <EntityInfoDialog
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        ensId={ensId}
        lastSessionId={lastSessionId}
      />
    </>
  );
}
