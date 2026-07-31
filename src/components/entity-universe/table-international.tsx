'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef } from '@tanstack/react-table';
import { FileTextIcon, Eye } from 'lucide-react';
import { DownloadDropdown } from '../shared/download-button';
import OverviewSheet from './overview-sheet';
import { RiskBadge, RiskLevel } from './risk-badge';
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
  entityExistence?: string;
  financials?: string;
  adverseMedia?: string;
  legal?: string;
  additionalIndicators?: string;
};

export default function EntityUniverseTableInternational() {
  const [sheetEnsId, setSheetEnsId] = useState<string | null>(null);
  const [sheetSessionId, setSheetSessionId] = useState<string>('');

  const handleRowClick = (row: any) => {
    setSheetEnsId(row.ensId);
    setSheetSessionId(row.sessionId || '');
  };

  const columns: ColumnDef<InternationalEntity>[] = [
    { accessorKey: 'externalVendorId', header: 'ID', size: 140 },
    { accessorKey: 'name', header: 'Name', size: 220 },
    // ── Eye icon: opens the same overview sheet the domestic table uses,
    // pointed at Orbis's /graph/get-submodal-profile via screeningType.
    {
      id: 'overview',
      header: '',
      size: 44,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSheetEnsId(row.original.ensId ?? null);
            setSheetSessionId(row.original.sessionId ?? '');
          }}
          title="View overview"
          style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'transparent', border: '1px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--muted-foreground)',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,230,0,0.12)';
            e.currentTarget.style.borderColor = 'rgba(255,230,0,0.35)';
            e.currentTarget.style.color = '#FFE600';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
        >
          <Eye size={14} />
        </button>
      ),
    },
    { accessorKey: 'nameInternational', header: 'International Name', size: 200 },
    { accessorKey: 'country', header: 'Country', size: 100 },
    { accessorKey: 'nationalId', header: 'National ID', size: 150 },
    { accessorKey: 'state', header: 'State', size: 120 },
    { accessorKey: 'city', header: 'City', size: 120 },
    { accessorKey: 'address', header: 'Address', size: 250 },
    // ── Individual KPI ratings ──────────────────────────────────────────
    // Enriched server-side in /api/entity-universe-international for just
    // the current page's rows (see getEntityRatingsBulk in
    // lib/orbis-entity-universe.ts) — Orbis has no bulk source for these
    // the way Probe42's entity_universe.thematic_rating column is, so
    // each page load does one /graph/get-submodal-profile call per row
    // shown (typically 10), not per entity in the whole universe.
    {
      id: 'entityExistence',
      header: 'Entity Existence',
      size: 140,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => {
        const rating = row.original.entityExistence as RiskLevel | undefined;
        return rating ? <RiskBadge risk={rating} /> : <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'financials',
      header: 'Financials',
      size: 120,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => {
        const rating = row.original.financials as RiskLevel | undefined;
        return rating ? <RiskBadge risk={rating} /> : <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'adverseMedia',
      header: 'Adverse Media',
      size: 130,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => {
        const rating = row.original.adverseMedia as RiskLevel | undefined;
        return rating ? <RiskBadge risk={rating} /> : <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'legal',
      header: 'Legal',
      size: 100,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => {
        const rating = row.original.legal as RiskLevel | undefined;
        return rating ? <RiskBadge risk={rating} /> : <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'additionalIndicators',
      header: 'Additional Indicators',
      size: 150,
      enableSorting: false,
      meta: { filterVariant: 'none' },
      cell: ({ row }) => {
        const rating = row.original.additionalIndicators as RiskLevel | undefined;
        return rating ? <RiskBadge risk={rating} /> : <span className="text-gray-400">-</span>;
      },
    },
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

  return (
    <>
      <PaginatedTable
        columns={columns}
        endpoint={getApiUrl('/api/entity-universe-international')}
        onRowClick={handleRowClick}
        initialSorting={[{ id: 'name', desc: false }]}
      />

      {sheetEnsId && (
        <OverviewSheet
          ensId={sheetEnsId}
          lastSessionId={sheetSessionId}
          screeningType="international"
          onClose={() => setSheetEnsId(null)}
        />
      )}
    </>
  );
}
