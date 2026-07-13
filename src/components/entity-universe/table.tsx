'use client';

import { RiskBadge, RiskLevel } from '@/components/entity-universe/risk-badge';
import { PaginatedTable } from '@/components/shared/dynamic-table';
import { ColumnDef } from '@tanstack/react-table';
import { FileTextIcon, X, Loader2, Eye } from 'lucide-react';
import { useState } from 'react';
import { DownloadDropdown } from '../shared/download-button';
import { getApiUrl } from '@/lib/utils';
import EntityUniverseOverview from './overview';
import { useEntityProfile } from '@/hooks/use-api';
import { RiskBadge as RiskBadgeComp } from './risk-badge';

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

// ── Overview side-sheet ───────────────────────────────────────────────────────
function OverviewSheet({
  ensId,
  lastSessionId,
  onClose,
}: {
  ensId: string;
  lastSessionId: string;
  onClose: () => void;
}) {
  const { data, isPending } = useEntityProfile(ensId);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(720px, 90vw)', zIndex: 50,
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.35)',
        animation: 'slideIn 0.22s cubic-bezier(.22,1,.36,1) both',
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Sheet header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0, gap: '12px',
          borderTop: '3px solid #FFE600',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {data && !isPending ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                    {data.profile.name}
                  </span>
                  <RiskBadgeComp risk={data.ratings.supplier as RiskLevel} size="small" />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px', lineHeight: 1.4 }}>
                  {data.profile.address}
                </p>
              </>
            ) : (
              <div style={{ height: '20px', width: '200px', borderRadius: '4px', background: 'var(--muted)', animation: 'pulse 1.5s infinite' }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {data && (
              <DownloadDropdown
                sessionId={lastSessionId}
                ensId={ensId}
                fileName={data.profile.name || 'report'}
                variant="outline"
                showLabel={true}
              />
            )}
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: 'var(--muted)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted-foreground)', transition: 'background 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--accent)')}
              onMouseOut={e => (e.currentTarget.style.background = 'var(--muted)')}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Sheet content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {isPending ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: 'var(--muted-foreground)' }}>
              <Loader2 className="animate-spin" size={20} />
              <span style={{ fontSize: '14px' }}>Loading entity data…</span>
            </div>
          ) : data ? (
            <EntityUniverseOverview profileData={data} />
          ) : null}
        </div>
      </div>
    </>
  );
}

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