'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, Globe, ShieldAlert, CloudLightning, Building2 } from 'lucide-react';
import PoliticalPanel from '@/components/location360/PoliticalPanel';
import ClimatePanel   from '@/components/location360/ClimatePanel';
import InfraPanel     from '@/components/location360/InfraPanel';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ACCENT = '#FFE600';

const LEVEL_COLORS: Record<string, string> = {
  Low:    '#16a34a',
  Medium: '#f59e0b',
  High:   '#dc2626',
};

const LEVEL_BG: Record<string, string> = {
  Low:    '#dcfce7',
  Medium: '#fef9c3',
  High:   '#fee2e2',
};

// ── Mini score pill shown in the tab bar ──────────────────────────
function TabScore({ score, level, active }: { score?: number; level?: string; active: boolean }) {
  if (score == null) return null;
  const color = LEVEL_COLORS[level ?? ''] ?? '#64748b';
  return (
    <span style={{
      padding: '1px 8px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 600,
      background: active ? color : 'rgba(0,0,0,0.06)',
      color: active ? '#fff' : 'var(--foreground)',
      marginLeft: 4,
    }}>
      {score.toFixed(1)}
      <span style={{ fontWeight: 400, opacity: 0.85, marginLeft: 3 }}>{level}</span>
    </span>
  );
}

// ── Summary gauge strip ───────────────────────────────────────────
function SummaryStrip({ pol, cli, inf }: { pol: any; cli: any; inf: any }) {
  const items = [
    {
      icon: <ShieldAlert size={14} />,
      label: 'Political / Security',
      score: pol?.political_static_risk?.score,
      level: pol?.political_static_risk?.level,
    },
    {
      icon: <CloudLightning size={14} />,
      label: 'Climate / Environmental',
      score: cli?.climate_static_risk?.score,
      level: cli?.climate_static_risk?.level,
    },
    {
      icon: <Building2 size={14} />,
      label: 'Infrastructure Disruption',
      score: inf?.infrastructure_static_risk?.score,
      level: inf?.infrastructure_static_risk?.level,
    },
  ].filter((it) => it.score != null);

  if (!items.length) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
      {items.map(({ icon, label, score, level }) => {
        const color = LEVEL_COLORS[level ?? ''] ?? '#64748b';
        const bg    = LEVEL_BG[level ?? '']  ?? '#f8fafc';
        return (
          <div key={label} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Coloured left accent */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: color, borderRadius: '12px 0 0 12px' }} />
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color, flexShrink: 0, marginLeft: 8,
            }}>
              {icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{score?.toFixed(2)}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: color, padding: '2px 8px', borderRadius: 8,
                }}>
                  {level}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type TabId = 'political' | 'climate' | 'infra';

interface RiskResults {
  political?:      any;
  politicalError?: string | null;
  climate?:        any;
  climateError?:   string | null;
  infra?:          any;
  infraError?:     string | null;
}

const EXAMPLE_LOCATIONS = ['Pune', 'Srinagar', 'Balasore', 'Chennai', 'Imphal West', 'Mumbai'];

export default function Location360Client() {
  const [query,     setQuery]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [results,   setResults]   = useState<RiskResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('political');

  const handleSearch = useCallback(async (loc?: string) => {
    const location = (loc ?? query).trim();
    if (!location) return;

    setLoading(true);
    setResults(null);
    if (loc) setQuery(loc);

    try {
      const res = await fetch(`${BASE}/api/location-risk?location=${encodeURIComponent(location)}&type=all`);
      const data = await res.json();
      setResults(data);
      if      (data.political) setActiveTab('political');
      else if (data.climate)   setActiveTab('climate');
      else if (data.infra)     setActiveTab('infra');
    } catch (err: any) {
      setResults({ politicalError: err?.message ?? 'Network error' });
    } finally {
      setLoading(false);
    }
  }, [query]);

  const pol = results?.political;
  const cli = results?.climate;
  const inf = results?.infra;

  // Resolved location label from whichever dimension succeeded
  const resolved = pol?.resolved_location ?? cli?.resolved_location ?? inf?.resolved_location ?? null;
  const allFailed = results && !pol && !cli && !inf;

  const tabs: { id: TabId; icon: React.ReactNode; label: string; score?: number; level?: string }[] = [
    {
      id:    'political',
      icon:  <ShieldAlert size={14} />,
      label: 'Political & Security',
      score: pol?.political_static_risk?.score,
      level: pol?.political_static_risk?.level,
    },
    {
      id:    'climate',
      icon:  <CloudLightning size={14} />,
      label: 'Climate & Environment',
      score: cli?.climate_static_risk?.score,
      level: cli?.climate_static_risk?.level,
    },
    {
      id:    'infra',
      icon:  <Building2 size={14} />,
      label: 'Infrastructure Risk',
      score: inf?.infrastructure_static_risk?.score,
      level: inf?.infrastructure_static_risk?.level,
    },
  ];

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={16} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
              Location360
            </h1>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 6 }}>
          Static risk assessment for Indian districts across Political, Climate, and Infrastructure dimensions.
        </p>
      </div>

      {/* ── Search bar ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: ACCENT, opacity: 0.6 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={12} />
          Location Search
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }}
            />
            <input
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='Enter a district or city name (e.g. Pune, Srinagar, Balasore)…'
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px 10px 34px',
                border: '1.5px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                background: 'var(--background)',
                color: 'var(--foreground)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{
              padding: '10px 22px',
              background: loading || !query.trim() ? 'var(--muted)' : 'var(--primary)',
              color: loading || !query.trim() ? 'var(--muted-foreground)' : 'var(--primary-foreground)',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <span style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: 'currentColor',
                borderRadius: '50%',
                animation: 'location360spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
            ) : (
              <Search size={14} />
            )}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        {/* Example chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)', alignSelf: 'center' }}>Try:</span>
          {EXAMPLE_LOCATIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSearch(s)}
              disabled={loading}
              style={{
                padding: '3px 12px',
                background: 'var(--secondary)',
                color: 'var(--secondary-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Spinner / empty / error states ──────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--muted-foreground)' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'location360spin 0.7s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14 }}>
            Loading risk data for <strong style={{ color: 'var(--foreground)' }}>{query}</strong>…
          </p>
        </div>
      )}

      {!loading && !results && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--muted-foreground)' }}>
          <Globe size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 18, color: 'var(--foreground)', marginBottom: 8 }}>Search for a location</h2>
          <p style={{ maxWidth: 440, margin: '0 auto', fontSize: 13, lineHeight: 1.65 }}>
            Enter any Indian district or city name to get static risk scores across political, climate, and infrastructure dimensions.
          </p>
        </div>
      )}

      {allFailed && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 12, padding: '20px 24px', color: '#dc2626',
          fontSize: 13,
        }}>
          ⚠ Location not found in any dataset.
          {results?.politicalError && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{results.politicalError}</p>}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────── */}
      {results && (pol || cli || inf) && (
        <>
          {/* Location banner */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} style={{ color: LEVEL_COLORS[pol?.political_static_risk?.level ?? cli?.climate_static_risk?.level ?? 'Low'] }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                {resolved?.district ?? query}
              </span>
              {resolved?.state && (
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '2px 8px', borderRadius: 6 }}>
                  {resolved.state}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {resolved?.method && (
                <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8, fontWeight: 500 }}>
                  {resolved.method.replace(/_/g, ' ')}
                </span>
              )}
              {resolved?.confidence != null && (
                <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 8, fontWeight: 500 }}>
                  {(resolved.confidence * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>
          </div>

          {/* Summary strip */}
          <SummaryStrip pol={pol} cli={cli} inf={inf} />

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 2,
            borderBottom: '1px solid var(--border)',
            marginBottom: 0,
          }}>
            {tabs.map(({ id, icon, label, score, level }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: -1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {icon}
                  {label}
                  <TabScore score={score} level={level} active={isActive} />
                </button>
              );
            })}
          </div>

          {/* Panel container */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            marginBottom: 32,
          }}>
            {activeTab === 'political' && (
              <PoliticalPanel data={pol} error={results.politicalError} />
            )}
            {activeTab === 'climate' && (
              <ClimatePanel data={cli} error={results.climateError} />
            )}
            {activeTab === 'infra' && (
              <InfraPanel data={inf} error={results.infraError} />
            )}
          </div>
        </>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes location360spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
