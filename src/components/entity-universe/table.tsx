'use client';

import { RiskBadge, RiskLevel } from '@/components/entity-universe/risk-badge';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef } from '@tanstack/react-table';
import { FileTextIcon, Eye } from 'lucide-react';
import { useState } from 'react';
import { DownloadDropdown } from '../shared/download-button';
import { getApiUrl } from '@/lib/utils';
import OverviewSheet from './overview-sheet';

// ── Types ─────────────────────────────────────────────────────────────────────
type User = {
  externalVendorId?: string;
  name: string;
  entityType?: string;
  identifier?: string;
  identifierType?: string;
  panId?: string;
  address?: string;
  overallSupplierRating?: string;
  lastScreenedDate?: Date;
  lastSessionId?: string;
  ensId?: string;
};

// ── Main table component ───────────────────────────────────────────────────────
export default function EntityUniverseTable({
  onEntityNameClick,
}: {
  onEntityNameClick?: (entity: { name: string; identifier: string; identifierType: string; entityType: string; ensId: string; sessionId: string }) => void;
}) {
  const [sheetEnsId, setSheetEnsId] = useState<string | null>(null);
  const [sheetSessionId, setSheetSessionId] = useState<string>('');

  const handleRowClick = (row: any) => {
    setSheetEnsId(row.ensId);
    setSheetSessionId(row.lastSessionId || '');
  };

  // Build columns dynamically so we can wire up the name-click callback
  const columns: ColumnDef<User>[] = [
    { accessorKey: 'externalVendorId', header: 'ID' },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 250,
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        return (
          <button
            onClick={e => {
              e.stopPropagation(); // don't also open the sheet
              onEntityNameClick?.({
                name,
                identifier:      (row.original.identifier ?? '').trim(),
                identifierType:  (row.original.identifierType ?? 'cin').toLowerCase(),
                entityType:      (row.original.entityType ?? 'company').toLowerCase(),
                ensId:           (row.original.ensId ?? '').trim(),
                sessionId:       (row.original.lastSessionId ?? '').trim(),
              });
            }}
            style={{
              background: 'none', border: 'none', padding: 0,
              textAlign: 'left', cursor: onEntityNameClick ? 'pointer' : 'default',
              color: onEntityNameClick ? '#FFE600' : 'inherit',
              textDecoration: onEntityNameClick ? 'underline' : 'none',
              textDecorationColor: 'rgba(255,230,0,0.4)',
              fontSize: 'inherit', fontFamily: 'inherit',
              lineHeight: 'inherit',
            }}
            onMouseOver={e => { if (onEntityNameClick) e.currentTarget.style.opacity = '0.8'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
            title={onEntityNameClick ? `Analyse "${name}" →` : undefined}
          >
            {name}
          </button>
        );
      },
    },
    // ── Eye icon: opens overview sheet ──────────────────────────────────────
    {
      id: 'overview',
      header: '',
      size: 44,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => (
        <button
          onClick={e => {
            e.stopPropagation();
            setSheetEnsId(row.original.ensId ?? null);
            setSheetSessionId(row.original.lastSessionId ?? '');
          }}
          title="View overview"
          style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'transparent', border: '1px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--muted-foreground)',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,230,0,0.12)';
            e.currentTarget.style.borderColor = 'rgba(255,230,0,0.35)';
            e.currentTarget.style.color = '#FFE600';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
        >
          <Eye size={14} />
        </button>
      ),
    },
    { accessorKey: 'entityType', header: 'Entity Type' },
    { accessorKey: 'identifier', header: 'Identifier' },
    { accessorKey: 'identifierType', header: 'Identifier Type' },
    { accessorKey: 'panId', header: 'Pan ID' },
    { accessorKey: 'address', header: 'Address' },
    {
      accessorKey: 'overallSupplierRating',
      header: 'Overall Supplier Rating',
      cell: ({ row }) => <RiskBadge risk={row.getValue('overallSupplierRating') as RiskLevel} />,
      meta: {
        filterVariant: 'select',
        filterOptions: {
          options: [
            { label: 'High',   value: 'High'   },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low',    value: 'Low'    },
          ],
        },
      },
    },
    { accessorKey: 'ensId', header: 'System ID', size: 300 },
    { accessorKey: 'lastScreenedDate', header: 'Last Screened Date', meta: { filterVariant: 'none' } },
    {
      id: 'actions',
      header: 'Download',
      size: 100,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => (
        <DownloadDropdown
          options={[{
            sessionId: row.original.lastSessionId || '',
            ensId: row.original.ensId || '',
            fileType: 'docx',
            fileName: row.original.name,
            label: 'DOCX Report',
            icon: <FileTextIcon size={16} />,
          }]}
        />
      ),
      enableSorting: false,
    },
  ];

  return (
    <>
      <PaginatedTable
        columns={columns}
        endpoint={getApiUrl('/api/entity-universe')}
        onRowClick={handleRowClick}
        initialSorting={[{ id: 'name', desc: false }]}
      />

      {sheetEnsId && (
        <OverviewSheet
          ensId={sheetEnsId}
          lastSessionId={sheetSessionId}
          onClose={() => setSheetEnsId(null)}
        />
      )}
    </>
  );
}