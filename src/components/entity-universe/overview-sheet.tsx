'use client';

import { X, Loader2 } from 'lucide-react';
import { DownloadDropdown } from '../shared/download-button';
import EntityUniverseOverview from './overview';
import { useEntityProfile } from '@/hooks/use-api';
import { RiskBadge as RiskBadgeComp, RiskLevel } from './risk-badge';
import { ScreeningType } from '@/types';

/**
 * Shared "eye icon" overview sheet for both the domestic (Probe42) and
 * international (Orbis) Entity Universe tables.
 *
 * Both backends' /universe or /graph get-submodal-profile endpoints are
 * backed by the identical compile_company_profile()/pull_ratings()
 * functions and return the same {profile, ratings, metadata} shape
 * (confirmed directly against both repos' source), so this single
 * component and EntityUniverseOverview work unchanged for either
 * pipeline — only which backend useEntityProfile calls differs, driven
 * by the screeningType prop.
 */
export default function OverviewSheet({
  ensId,
  lastSessionId,
  screeningType = 'domestic',
  onClose,
}: {
  ensId: string;
  lastSessionId: string;
  screeningType?: ScreeningType;
  onClose: () => void;
}) {
  const { data, isPending } = useEntityProfile(ensId, screeningType);

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
                screeningType={screeningType}
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