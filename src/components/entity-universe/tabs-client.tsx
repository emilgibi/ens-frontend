'use client';

import { useState } from 'react';
import EntityUniverseTable from '@/components/entity-universe/table';
import EntityUniverseTableInternational from '@/components/entity-universe/table-international';
import EntityAnalysisTab from '@/components/entity-universe/entity-analysis';
import { Building2, FileText } from 'lucide-react';

const ACCENT = '#FFE600';

function StatCardDark({
  title, value, description, icon,
}: {
  title: string; value: number; description: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px 22px', flex: 1,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ACCENT, opacity: 0.6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', letterSpacing: '0.04em' }}>{title}</span>
        <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '34px', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1, marginBottom: '8px' }}>
        {value.toLocaleString()}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

export default function EntityUniverseTabsClient({
  totalCount,
  recentCount,
  ratingCard,
  internationalTotalCount,
  internationalRecentCount,
  internationalRatingCard,
}: {
  totalCount: number;
  recentCount: number;
  ratingCard: React.ReactNode;
  internationalTotalCount: number;
  internationalRecentCount: number;
  internationalRatingCard: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<'domestic-overview' | 'international-overview' | 'analysis'>('analysis');
  // When a name is clicked in the table, store it here and switch to analysis tab
  // Stores the entity selected from table — has identifier for API, name for display
  const [selectedEntity, setSelectedEntity] = useState<{
    name: string;
    identifier: string;
    identifierType: string;
    entityType: string;
  } | null>(null);

  const handleEntityNameClick = (entity: { name: string; identifier: string; identifierType: string; entityType: string }) => {
    setSelectedEntity(entity);
    setActiveTab('analysis');
  };

  const handleTabSwitch = (tab: 'domestic-overview' | 'international-overview' | 'analysis') => {
    if (tab !== 'analysis') setSelectedEntity(null);
    setActiveTab(tab);
  };

  return (
    <div>
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
        {[
          { key: 'analysis',                label: 'Entity Analysis'         },
          { key: 'domestic-overview',       label: 'Domestic Overview'       },
          { key: 'international-overview',  label: 'International Overview'  },
        ].map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabSwitch(key as 'domestic-overview' | 'international-overview' | 'analysis')}
              style={{
                padding: '10px 20px', fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                background: 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s ease',
                marginBottom: '-1px', letterSpacing: '0.02em',
              }}
              onMouseOver={e => { if (!isActive) e.currentTarget.style.color = 'var(--foreground)'; }}
              onMouseOut={e => { if (!isActive) e.currentTarget.style.color = 'var(--muted-foreground)'; }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Domestic Overview tab ── */}
      {activeTab === 'domestic-overview' && (
        <div>
          {/* Stat cards — three equal columns */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'stretch', minHeight: '170px' }}>
            <StatCardDark
              title="Entities Screened"
              value={totalCount}
              description="Total number of entities screened for risk evaluation to date"
              icon={<Building2 size={16} />}
            />
            {/* ratingCard wrapped to match the two stat cards exactly */}
            <div style={{
              flex: 1, minWidth: 0,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Yellow top accent — same as the two stat cards */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#FFE600', opacity: 0.6, zIndex: 1 }} />
              {ratingCard}
            </div>
            <StatCardDark
              title="Recent Entities Screened"
              value={recentCount}
              description="Number of entities screened in the last 2 weeks"
              icon={<FileText size={16} />}
            />
          </div>

          {/* Table */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)' }}>
              Entities Overview
            </h4>
            {/*
              Pass onEntityNameClick so clicking a name switches to Analysis tab
              and pre-fills the search query.
            */}
            <EntityUniverseTable onEntityNameClick={handleEntityNameClick} />
          </div>
        </div>
      )}

      {/* ── International Overview tab ── */}
      {activeTab === 'international-overview' && (
        <div>
          {/*
            Risk Distribution here comes from Orbis's per-entity
            /graph/get-submodal-profile (same underlying function/table as
            Probe42's rating, just aggregated here instead of read from a
            local table — see lib/orbis-entity-universe.ts).
          */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'stretch', minHeight: '170px' }}>
            <StatCardDark
              title="Entities Screened"
              value={internationalTotalCount}
              description="Total number of international entities screened for risk evaluation to date"
              icon={<Building2 size={16} />}
            />
            <div style={{
              flex: 1, minWidth: 0,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#FFE600', opacity: 0.6, zIndex: 1 }} />
              {internationalRatingCard}
            </div>
            <StatCardDark
              title="Recent Entities Screened"
              value={internationalRecentCount}
              description="Number of international entities screened in the last 2 weeks"
              icon={<FileText size={16} />}
            />
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)' }}>
              Entities Overview
            </h4>
            {/*
              No onEntityNameClick here — Entity Analysis (the search tab)
              is Probe42-only (searches by CIN/PAN via Probe42-specific
              lookup + submodal endpoints), so there's nothing sensible to
              switch into for an international entity yet.
            */}
            <EntityUniverseTableInternational />
          </div>
        </div>
      )}

      {/* ── Entity Analysis tab ── */}
      {activeTab === 'analysis' && (
        <EntityAnalysisTab
          key={selectedEntity?.identifier ?? 'manual'}
          selectedEntity={selectedEntity}
        />
      )}
    </div>
  );
}