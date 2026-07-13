'use client';

import * as React from 'react';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiskLevel } from '@/types';
import { RiskBadge } from '../entity-universe/risk-badge';
import { Checkbox } from '../ui/checkbox';
import { getApiUrl } from '@/lib/utils';

export type ContinuousMonitoringEntity = {
  id: string;
  ensId: string;
  name: string;
  nationalId: string;
  country: string;
  address: string;
  overallSupplierRating: string;
  lastScreenedDate: Date;
  status: string;
};

export const columns: ColumnDef<ContinuousMonitoringEntity>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
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
  },
  {
    accessorKey: 'lastScreenedDate',
    header: 'Last Screened Date',
    cell: ({ row }) => {
      const date = row.getValue('lastScreenedDate') as string | number | Date;
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
  },
];

type ContiniousMonitoringTableProps = {
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
};

export default function ContiniousMonitoringTable({
  rowSelection,
  setRowSelection,
}: ContiniousMonitoringTableProps) {
  return (
    <>
      <PaginatedTable
        columns={columns}
        endpoint={getApiUrl("/api/continuous-monitoring/configuration")}
        // enableRowSelection={(row) => row.original.status === 'ACTIVE'}
        // rowSelection={rowSelection}
        // setRowSelection={setRowSelection}
        otherElements={
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            View Entities Set for CM
          </Button>
        }
      />
    </>
  );
}
