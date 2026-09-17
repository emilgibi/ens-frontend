'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Plus, Play, ChevronDown, AlertTriangle, FileText, ExternalLink, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/lib/utils';

const ACCENT = '#FFE600';

// All ENS risk categories mirroring entity-analysis findings sections
const BASE_RISK_OPTIONS = [
  // General / ENS screening categories
  'Sanctions Risk',
  'Legal Risk',
  'Financial Risk',
  'Adverse Media',
  'Cyber Risk',
  'Entity Existence Risk',
  'Reputational Risk',
  'Compliance Risk',
  'Political Risk',
  'Natural Disaster',
  // Location-specific prefixes (will be combined with location names)
  'Flood Risk',
  'Heat Wave Risk',
  'Cyclone Risk',
  'Earthquake Risk',
  'Drought Risk',
  'Infrastructure Risk',
  'Labour Unrest',
  'Supply Chain Disruption',
];

// Special sentinel entry pinned inside the Risk Types dropdown — selecting
// it never adds a real tag (it's a mode switch, not a risk category). It
// reveals the freeform Location field below, where the user types their
// own location + risk combo directly (e.g. "Chennai Flood Risk", "Delhi
// Heat Wave") with no autocomplete of any kind.
const LOCATION_RISK_OPTION = '📍 Location Risk (type your own)';

type Row = {
  id: string;
  entity: any | null;
  entityQuery: string;
  risks: string[];
  materials: string[];
  finalMat: string;
  sob: string;
};

function makeRow(): Row {
  return { id: Math.random().toString(36).slice(2), entity: null, entityQuery: '', risks: [], materials: [], finalMat: '', sob: '' };
}

// ── Shared card wrapper matching entity-analysis style ──────────────────────
function Card({ title, icon: Icon, children, accent }: { title?: React.ReactNode; icon?: any; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent }} />}
      {title != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          {Icon && <Icon size={13} style={{ color: '#ca8a04', flexShrink: 0 }} />}
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

// ── Tag chip ────────────────────────────────────────────────────────────────
function Tag({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: color ? `${color}18` : 'rgba(255,255,255,0.08)', border: `1px solid ${color ? color + '44' : 'rgba(255,255,255,0.12)'}`, color: color ?? 'var(--foreground)' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}>
        <X size={10} />
      </button>
    </span>
  );
}

// ── Entity search dropdown (same style as entity-analysis SearchBar) ────────
function EntityDropdown({ query, onChange, onSelect, suggestions, loading, show }: {
  query: string;
  onChange: (v: string) => void;
  onSelect: (s: any) => void;
  suggestions: any[];
  loading: boolean;
  show: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
      <Input
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Search entity…"
        style={{ paddingLeft: '28px', height: '34px', fontSize: '12px' }}
      />
      {show && query.trim().length >= 3 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '260px', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
              <Loader2 size={12} className="animate-spin" style={{ color: ACCENT }} />Searching…
            </div>
          )}
          {!loading && suggestions.length === 0 && (
            <div style={{ padding: '10px 14px', color: 'var(--muted-foreground)', fontSize: '12px' }}>No results found</div>
          )}
          {suggestions.map((s, i) => (
            <button key={i} onMouseDown={() => onSelect(s)}
              style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,230,0,0.06)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: '12px', color: 'var(--foreground)', fontWeight: 500, marginBottom: '3px' }}>{s.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(s.cin ?? s.llpin ?? s.identifier) && (
                  <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{s.cin ?? s.llpin ?? s.identifier}</span>
                )}
                {(s.entity_type ?? (s.cin ? 'Company' : s.llpin ? 'LLP' : null)) && (
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: s.llpin ? '#f59e0b' : '#6ee7b7', background: s.llpin ? 'rgba(245,158,11,0.1)' : 'rgba(110,231,183,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    {s.entity_type ?? (s.cin ? 'Company' : 'LLP')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Risk search dropdown ────────────────────────────────────────────────────
function RiskDropdown({ query, onChange, suggestions, show, onSelect }: {
  query: string;
  onChange: (v: string) => void;
  suggestions: string[];
  show: boolean;
  onSelect: (r: string) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Search risk type or location…"
        style={{ height: '34px', fontSize: '12px' }}
      />
      {show && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map((r, i) => {
            const isLocationOption = r === LOCATION_RISK_OPTION;
            return (
              <button key={r} onMouseDown={() => onSelect(r)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 14px',
                  background: isLocationOption ? 'rgba(96,165,250,0.06)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  fontSize: '12px', fontWeight: isLocationOption ? 600 : 400,
                  color: isLocationOption ? '#60a5fa' : 'var(--foreground)',
                }}
                onMouseOver={e => (e.currentTarget.style.background = isLocationOption ? 'rgba(96,165,250,0.14)' : 'rgba(255,230,0,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = isLocationOption ? 'rgba(96,165,250,0.06)' : 'transparent')}
              >
                {r}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Material dropdown ───────────────────────────────────────────────────────
// `exposed` lists materials flagged as high-exposure to the row's currently
// tagged risk types (e.g. Flood Risk → MS/TMT Bars/Cement); these are shown
// first with a flame indicator + amber styling so the risk-material link is
// visible before the user even opens the dropdown.
function MaterialDropdown({ query, onChange, suggestions, exposed, show, onSelect }: {
  query: string;
  onChange: (v: string) => void;
  suggestions: string[];
  exposed: string[];
  show: boolean;
  onSelect: (m: string) => void;
}) {
  const exposedSet = new Set(exposed);
  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Type or select material…"
        style={{ height: '34px', fontSize: '12px' }}
        onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { onSelect(query.trim()); } }}
      />
      {show && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map((m, i) => {
            const isExposed = exposedSet.has(m);
            return (
              <button key={m} onMouseDown={() => onSelect(m)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', padding: '8px 14px', background: isExposed ? 'rgba(249,115,22,0.06)' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '12px', color: isExposed ? '#f97316' : 'var(--foreground)' }}
                onMouseOver={e => (e.currentTarget.style.background = isExposed ? 'rgba(249,115,22,0.14)' : 'rgba(255,230,0,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = isExposed ? 'rgba(249,115,22,0.06)' : 'transparent')}
              >
                {isExposed && <Flame size={11} style={{ flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{m}</span>
                {isExposed && <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f97316', flexShrink: 0 }}>Exposed</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Per-row editor ──────────────────────────────────────────────────────────
function RowEditor({ row, onUpdate, onRemove }: {
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [entityQuery, setEntityQuery] = useState(row.entity?.name ?? row.entityQuery);
  const [entitySugs, setEntitySugs] = useState<any[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [showEntityDrop, setShowEntityDrop] = useState(false);

  const [riskQuery, setRiskQuery] = useState('');
  const [showRiskDrop, setShowRiskDrop] = useState(false);

  const [matQuery, setMatQuery] = useState('');
  const [matSugs, setMatSugs] = useState<string[]>([]);
  const [matExposed, setMatExposed] = useState<string[]>([]);
  const [showMatDrop, setShowMatDrop] = useState(false);
  const [matLoading, setMatLoading] = useState(false);

  const entityDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entity search debounce
  useEffect(() => {
    if (entityQuery.trim().length < 3) { setEntitySugs([]); return; }
    if (entityDebRef.current) clearTimeout(entityDebRef.current);
    entityDebRef.current = setTimeout(async () => {
      setEntityLoading(true);
      try {
        const r = await fetch(getApiUrl(`/api/probe42-name-search?orgName=${encodeURIComponent(entityQuery.trim())}`));
        const j = await r.json();
        setEntitySugs((j?.data?.results ?? j?.results ?? []).slice(0, 10));
        setShowEntityDrop(true);
      } catch { setEntitySugs([]); }
      finally { setEntityLoading(false); }
    }, 350);
    return () => { if (entityDebRef.current) clearTimeout(entityDebRef.current); };
  }, [entityQuery]);

  // Fetch material suggestions when entity is selected, and re-fetch whenever
  // the row's tagged risks change too — risk-aware ranking (e.g. Flood Risk
  // surfacing MS/Cement over other suggested materials) depends on both.
  const riskKey = row.risks.slice().sort().join('|');
  useEffect(() => {
    if (!row.entity) return;
    setMatLoading(true);
    const id = row.entity.cin ?? row.entity.llpin ?? row.entity.identifier;
    const it = row.entity.identifier_type ?? (row.entity.cin ? 'cin' : 'llpin');
    fetch(getApiUrl('/api/risk-configuration/material-suggestions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: id,
        identifier_type: it,
        entity_type: row.entity.entity_type ?? 'company',
        name: row.entity.name,
        risks: row.risks,
      }),
    })
      .then(r => r.json())
      .then(j => { setMatSugs(j?.suggestions ?? []); setMatExposed(j?.exposed ?? []); setShowMatDrop(true); })
      .catch(() => { setMatSugs([]); setMatExposed([]); })
      .finally(() => setMatLoading(false));
  }, [row.entity?.cin ?? row.entity?.llpin, riskKey]);

  // Risk Types dropdown shows generic categories, with the special
  // "Location Risk" entry always pinned first — visible on focus even
  // before typing, so it's easy to discover rather than requiring the
  // user to already know it exists.
  const riskSuggestions = [
    LOCATION_RISK_OPTION,
    ...BASE_RISK_OPTIONS.filter(r =>
      riskQuery.trim().length === 0 || r.toLowerCase().includes(riskQuery.trim().toLowerCase())
    ),
  ].slice(0, 15);

  const [locationRiskQuery, setLocationRiskQuery] = useState('');
  const [locationModeEnabled, setLocationModeEnabled] = useState(false);
  // Auto-reveal the Location field if this row already carries a freeform
  // location-risk tag from elsewhere (e.g. loaded pre-filled), in addition
  // to the explicit toggle-on when the user picks the dropdown option.
  const showLocationField = locationModeEnabled || row.risks.some(r => !BASE_RISK_OPTIONS.includes(r));

  const handleEntitySelect = (s: any) => {
    setEntityQuery(s.name);
    setShowEntityDrop(false);
    setEntitySugs([]);
    onUpdate({ entity: s, entityQuery: s.name });
  };

  const addRisk = (r: string) => {
    if (r === LOCATION_RISK_OPTION) {
      // Mode switch, not a real risk tag — reveal the freeform Location
      // field instead of adding "📍 Location Risk (type your own)" itself
      // into row.risks, which would be meaningless to the backend.
      setLocationModeEnabled(true);
      setRiskQuery('');
      setShowRiskDrop(false);
      return;
    }
    if (!row.risks.includes(r)) onUpdate({ risks: [...row.risks, r] });
    setRiskQuery('');
    setShowRiskDrop(false);
  };

  // Freeform location + risk entry (e.g. "Chennai Flood Risk", "Delhi Heat
  // Wave") — no dropdown, no suggestions, just whatever the user types.
  // Lands in the same row.risks array as the dropdown-selected risk types,
  // so everything downstream (material-suggestion risk-awareness, the news
  // pipeline) keeps working unchanged — it just sees one flat risk list.
  const addLocationRisk = () => {
    const trimmed = locationRiskQuery.trim();
    if (trimmed && !row.risks.includes(trimmed)) onUpdate({ risks: [...row.risks, trimmed] });
    setLocationRiskQuery('');
  };

  const addMaterial = (m: string) => {
    const trimmed = m.trim();
    if (trimmed && !row.materials.includes(trimmed)) onUpdate({ materials: [...row.materials, trimmed] });
    setMatQuery('');
    setShowMatDrop(false);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '10px', position: 'relative' }}>
      <button onClick={onRemove} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
        <X size={14} />
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
        {/* Entity */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Entity / Company</div>
          <EntityDropdown
            query={entityQuery}
            onChange={v => { setEntityQuery(v); onUpdate({ entity: null, entityQuery: v }); setShowEntityDrop(true); }}
            onSelect={handleEntitySelect}
            suggestions={entitySugs}
            loading={entityLoading}
            show={showEntityDrop}
          />
          {row.entity && (
            <div style={{ marginTop: '5px', fontSize: '10px', color: '#6ee7b7', fontFamily: 'monospace' }}>
              ✓ {row.entity.cin ?? row.entity.llpin ?? ''}
            </div>
          )}
        </div>

        {/* Risks */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Risk Types</div>
          <RiskDropdown
            query={riskQuery}
            onChange={v => { setRiskQuery(v); setShowRiskDrop(true); }}
            suggestions={riskSuggestions}
            show={showRiskDrop}
            onSelect={addRisk}
          />
          {row.risks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {row.risks.map(r => (
                <Tag key={r} label={r} color="#f97316" onRemove={() => onUpdate({ risks: row.risks.filter(x => x !== r) })} />
              ))}
            </div>
          )}
        </div>

        {/* Location — only revealed after selecting "📍 Location Risk" from
            the Risk Types dropdown above. Freeform, no autocomplete: type
            e.g. "Chennai Flood Risk" or "Delhi Heat Wave" and press Enter;
            lands in the same tag list as Risk Types. */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Location</div>
          {showLocationField ? (
            <>
              <Input
                value={locationRiskQuery}
                onChange={e => setLocationRiskQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && locationRiskQuery.trim()) { addLocationRisk(); } }}
                placeholder="e.g. Chennai Flood Risk"
                style={{ height: '34px', fontSize: '12px' }}
                autoFocus
              />
              <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '5px' }}>
                Press Enter to add
              </div>
            </>
          ) : (
            <div style={{
              height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px',
              border: '1px dashed var(--border)', borderRadius: '8px',
              fontSize: '11px', color: 'var(--muted-foreground)',
            }}>
              Select "📍 Location Risk" in Risk Types
            </div>
          )}
        </div>

        {/* Materials */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Material {matLoading && <Loader2 size={10} className="animate-spin" style={{ display: 'inline', marginLeft: 4 }} />}
          </div>
          <MaterialDropdown
            query={matQuery}
            onChange={v => { setMatQuery(v); setShowMatDrop(true); }}
            suggestions={matQuery.trim().length > 0
              ? matSugs.filter(m => m.toLowerCase().includes(matQuery.toLowerCase()))
              : matSugs}
            exposed={matExposed}
            show={showMatDrop}
            onSelect={addMaterial}
          />
          {row.materials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {row.materials.map(m => {
                const isExposed = matExposed.includes(m);
                return (
                  <Tag key={m} label={isExposed ? `🔥 ${m}` : m} color={isExposed ? '#f97316' : '#60a5fa'} onRemove={() => onUpdate({ materials: row.materials.filter(x => x !== m) })} />
                );
              })}
            </div>
          )}
          {row.risks.length > 0 && matExposed.length > 0 && (
            <div style={{ fontSize: '10px', color: '#f97316', marginTop: '5px', lineHeight: 1.4 }}>
              {matExposed.length} material{matExposed.length > 1 ? 's' : ''} flagged as high-exposure for the tagged risk{row.risks.length > 1 ? 's' : ''}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI summary renderer (same BriefOutput style as entity-analysis) ─────────
function AISummaryOutput({ text }: { text: string }) {
  const lines = text.split('\n');
  const els: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (/^[A-Z][A-Z\s/&0-9·\-]+$/.test(line) && line.length > 3 && !line.includes(':')) {
      els.push(
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px', marginBottom: '6px' }}>
          <div style={{ width: '3px', height: '14px', background: ACCENT, borderRadius: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{line}</span>
        </div>
      );
      i++; continue;
    }
    if (line.startsWith('•') || line.startsWith('-') || /^\d+\.\s/.test(line)) {
      const bullets: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('•') || lines[i].trim().startsWith('-') || /^\d+\.\s/.test(lines[i].trim()))) {
        const l = lines[i].trim().replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
        bullets.push(
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
            <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0, fontSize: '13px' }}>•</span>
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.55 }}>{l}</span>
          </li>
        );
        i++;
      }
      els.push(<ul key={`ul${i}`} style={{ listStyle: 'none', padding: 0, marginBottom: '6px' }}>{bullets}</ul>);
      continue;
    }
    els.push(<p key={i} style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.65, marginBottom: '5px' }}>{line}</p>);
    i++;
  }
  return <div>{els}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function RiskConfiguration() {
  const [rows, setRows] = useState<Row[]>([makeRow()]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ news: any[]; ai: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  };

  const handleRun = async () => {
    const validRows = rows.filter(r => r.entity || r.entityQuery.trim() || r.risks.length > 0);
    if (validRows.length === 0) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Use the first row's entity as primary, aggregate all risks and materials
      const primaryRow = validRows[0];
      // Normalize risk labels (e.g. "Flood Risk" -> "Flood") before sending
      const rawRisks = Array.from(new Set(validRows.flatMap(r => r.risks)));
      const normalizeRisk = (s: string) => {
        if (!s) return s;
        return s.replace(/\b[rR]isk\b/g, '').replace(/\s+/g, ' ').trim();
      };
      const allRisks = rawRisks.map(normalizeRisk).filter(Boolean);
      const allMaterials = Array.from(new Set(validRows.flatMap(r => r.materials)));

      const payload = {
        entity: primaryRow.entity ?? (primaryRow.entityQuery ? { name: primaryRow.entityQuery } : null),
        risks: allRisks,
        materials: allMaterials,
        rows: validRows.map(r => ({
          entity: r.entity?.name ?? r.entityQuery,
          risks: r.risks,
          materials: r.materials,
          finalMat: r.finalMat,
          sob: r.sob,
        })),
      };

      const res = await fetch(getApiUrl('/api/risk-configuration/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const news = data?.news ?? data?.articles ?? data?.items ?? [];
      const ai = data?.ai_summary ?? data?.summary ?? null;
      const aiErrors = Array.isArray(data?.ai_errors) ? data.ai_errors : [];
      if (!ai && aiErrors.length > 0) {
        setError(`AI summary unavailable: ${aiErrors.map((item: any) => `${item.stage}: ${item.message}`).join(' | ')}`);
      }
      setResult({ news: Array.isArray(news) ? news : [], ai });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,230,0,0.12)', border: '1px solid rgba(255,230,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} style={{ color: ACCENT }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Risk Configuration</h1>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
          Configure entities, risk types, and materials to fetch targeted news and AI-generated supply chain risk summaries.
        </p>
      </div>

      {/* ── Configuration table ── */}
      <Card title="Configuration" icon={AlertTriangle} accent="rgba(255,230,0,0.4)">
        <div style={{ marginBottom: '12px' }}>
          {rows.map(row => (
            <RowEditor
              key={row.id}
              row={row}
              onUpdate={patch => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setRows(prev => [...prev, makeRow()])}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: ACCENT, background: 'none', border: `1px dashed rgba(255,230,0,0.3)`, borderRadius: '7px', padding: '6px 14px', cursor: 'pointer' }}
          >
            <Plus size={13} /> Add Row
          </button>

          <button
            onClick={handleRun}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 22px', borderRadius: '8px', background: loading ? 'rgba(255,230,0,0.4)' : ACCENT, color: '#111', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? 'Running…' : 'Run'}
          </button>
        </div>
      </Card>

      {/* ── Error ── */}
      {error && (
        <div style={{ marginTop: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* AI Summary */}
          {result.ai && (
            <Card title="AI Risk Summary" icon={AlertTriangle} accent="rgba(255,230,0,0.5)">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#111' }}>AI</span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>Supply Chain Risk Intelligence</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Generated from news articles · Azure OpenAI</div>
                </div>
              </div>
              <AISummaryOutput text={result.ai} />
            </Card>
          )}

          {/* News Articles */}
          <Card title={`News Articles · ${result.news.length} found`} icon={FileText} accent="rgba(96,165,250,0.4)">
            {result.news.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', padding: '12px 0' }}>No articles returned for the selected configuration.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {result.news.slice(0, 15).map((a: any, i: number) => {
                  const title = a.title ?? a.headline ?? a.h ?? a.name ?? `Article ${i + 1}`;
                  const snippet = a.snippet ?? a.summary ?? a.excerpt ?? a.description ?? '';
                  const url = a.url ?? a.link ?? a.source_url ?? '';
                  const source = a.source ?? a.publisher ?? '';
                  const date = a.date ?? a.published_at ?? a.publishedAt ?? '';
                  const sentiment = a.sentiment ?? '';
                  const sentColor = sentiment === 'negative' ? '#ef4444' : sentiment === 'positive' ? '#22c55e' : '#eab308';
                  return (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < result.news.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', marginBottom: '4px', lineHeight: 1.4 }}>{title}</div>
                          {snippet && <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: '5px' }}>{snippet}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {source && <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{source}</span>}
                            {date && <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{date}</span>}
                            {sentiment && <span style={{ fontSize: '10px', fontWeight: 600, color: sentColor }}>{sentiment}</span>}
                          </div>
                        </div>
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: ACCENT, textDecoration: 'none', flexShrink: 0, marginTop: '2px' }}>
                            Read <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Empty state before run ── */}
      {!result && !loading && !error && (
        <div style={{ marginTop: '20px', textAlign: 'center', padding: '40px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <Play size={28} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Configure entities and risks above, then click <strong style={{ color: ACCENT }}>Run</strong> to fetch news and AI summary.</div>
        </div>
      )}
    </div>
  );
}