'use client';

import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef } from '@tanstack/react-table';
import { FileTextIcon } from 'lucide-react';
import { DownloadDropdown } from '../shared/download-button';
import { getApiUrl } from '@/lib/utils';

type InternationalEntity = {
  ensId: string;
  sessionId: string;
  externalVendorId?: string;
  name: string;
  nameInternational?: string;
  country?: string;
  nationalId?: string;
  state?: string;
  city?: string;
  postcode?: string;
  address?: string;
  bvdId?: string;
};

// No detail sheet here (unlike the domestic table's Overview sheet) —
// that's powered by Probe42-only submodal profile/findings endpoints
// (getEntityProfile/getEntityFindings) with no Orbis equivalent available.
const columns: ColumnDef<InternationalEntity>[] = [
  { accessorKey: 'externalVendorId', header: 'ID', size: 140 },
  { accessorKey: 'name', header: 'Name', size: 220 },
  { accessorKey: 'nameInternational', header: 'International Name', size: 200 },
  { accessorKey: 'country', header: 'Country', size: 100 },
  { accessorKey: 'nationalId', header: 'National ID', size: 150 },
  { accessorKey: 'state', header: 'State', size: 120 },
  { accessorKey: 'city', header: 'City', size: 120 },
  { accessorKey: 'address', header: 'Address', size: 250 },
  {
    id: 'actions',
    header: 'Download',
    size: 100,
    meta: { filterVariant: 'none' },
    enableSorting: false,
    cell: ({ row }) => (
      <DownloadDropdown
        options={[
          {
            sessionId: row.original.sessionId || '',
            ensId: row.original.ensId || '',
            fileType: 'docx',
            fileName: row.original.name,
            label: 'DOCX Report',
            icon: <FileTextIcon size={16} />,
            screeningType: 'international',
          },
        ]}
      />
    ),
  },
];

export default function EntityUniverseTableInternational() {
  return (
    <PaginatedTable
      columns={columns}
      endpoint={getApiUrl('/api/entity-universe-international')}
      initialSorting={[{ id: 'name', desc: false }]}
    />
  );
}