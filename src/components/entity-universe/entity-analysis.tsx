'use client';

import { useState, useEffect, useRef, type ReactNode, type RefObject, type ChangeEvent } from 'react';
import {
  Search, Loader2, ExternalLink, RefreshCw,
  Building2, Shield, TrendingUp, FileText,
  CheckCircle2, AlertTriangle, XCircle,
  BarChart3, CreditCard, Banknote, Activity, Globe, Scale,
  Users, Landmark, Newspaper,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Input } from '@/components/ui/input';
import { getApiUrl } from '@/lib/utils';
import { apiService } from '@/services/api';
import Location360Client from '@/components/location360/Location360Client';
import { DownloadDropdown } from '@/components/shared/download-button';

// ─── Types ────────────────────────────────────────────────────────────────────
type SelectedEntity = {
  name: string;
  identifier: string;
  identifierType: string;
  entityType: string;
  ensId?: string;
  sessionId?: string;
};
type TierType = 'RESTRICTED' | 'CONDITIONAL' | 'APPROVED' | 'PREFERRED' | 'STRATEGIC';
const TIERS: TierType[] = ['RESTRICTED', 'CONDITIONAL', 'APPROVED', 'PREFERRED', 'STRATEGIC'];
const ACCENT = '#FFE600';

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtCr = (v?: number | null) => {
  if (v == null || isNaN(v)) return '—';
  const cr = v / 1e7;
  return cr >= 1000 ? `₹${(cr / 1000).toFixed(1)}K Cr` : `₹${cr.toFixed(0)} Cr`;
};
const fmtPct = (v?: number | null, d = 1) =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;
// Compact axis-tick formatter for large raw USD values (e.g. 317180000000)
// — plotting the raw number with no formatter is what produced the
// garbled, clipped-looking Y-axis labels on the international financial
// charts (recharts' default axis width isn't wide enough for a 12-digit
// number, so the leading digits get cut off).
// Entity location image blobs occasionally include duplicate uploads under
// the same google_image_name prefix — dedupe by the actual image bytes
// (not filename, which can differ for identical content) so the grid never
// shows the same photo twice.
const dedupeImages = <T extends { data: string }>(images: T[]): T[] => {
  const seen = new Set<string>();
  return images.filter((img) => {
    if (seen.has(img.data)) return false;
    seen.add(img.data);
    return true;
  });
};
const fmtCompactUSD = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};
const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const s = String(d).trim();
  // Orbis (international) dates arrive as DD/MM/YYYY or DD-MM-YYYY, which
  // JS's native Date parser misreads as MM/DD/YYYY — "31/07/1947" silently
  // becomes an Invalid Date instead of throwing, so it can't be caught with
  // try/catch. Parse that shape explicitly; ISO strings (domestic) fall
  // through to the native parser unchanged.
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const date = dmy ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])) : new Date(s);
  if (isNaN(date.getTime())) return s;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const initials = (n: string) =>
  n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const scoreTheme = (s: number) => {
  if (s <= 1) return { color: '#ef4444', label: 'Very Low' };
  if (s <= 2) return { color: '#f97316', label: 'Low' };
  if (s <= 3) return { color: '#eab308', label: 'Moderate' };
  if (s <= 4) return { color: '#84cc16', label: 'Good' };
  return { color: '#22c55e', label: 'Strong' };
};
const getLatest = (fin?: any[]) => {
  if (!fin?.length) return null;
  const s = fin.filter(f => f.nature === 'STANDALONE');
  return (s.length ? s : fin).sort((a, b) => b.year?.localeCompare(a.year))[0];
};
const getLatestRating = (r?: any[]) => (r?.length ? [...r].reverse()[0] : null);
const countGroup = (g?: any) => {
  if (!g) return 0;
  return (Array.isArray(g.company) ? g.company.length : Number(g.company ?? 0)) +
         (Array.isArray(g.llp) ? g.llp.length : Number(g.llp ?? 0));
};

// ─── Analytics ────────────────────────────────────────────────────────────────
function computeTier(d: any, cvCr: number): { tier: TierType; tierIndex: number; conditions: string[]; signals: string } {
  const score = d.probe_financial_score?.overall_financial_score ?? 3;
  const cirp = d.company?.cirp_status;
  const bureau = d.key_indicators?.bureau_defaults;
  const pending = d.key_indicators?.pending_cases_filed_against_this_corporate;
  const gstDel = d.key_indicators?.gst_filing_delay;
  const rating = getLatestRating(d.credit_ratings)?.rating;
  const lat = getLatest(d.financials);
  const qr = lat?.ratios?.quick_ratio;

  if (cirp || bureau) return { tier: 'RESTRICTED', tierIndex: 0, conditions: ['CIRP/insolvency active or bureau defaults on record — do not proceed without legal clearance'], signals: 'Bureau default or insolvency flag' };
  if (score <= 1) return { tier: 'CONDITIONAL', tierIndex: 1, conditions: ['Financial score critically low (1/5) — enhanced due diligence required'], signals: `Score ${score}/5` };
  if (score <= 2) {
    const conds = ['Financial score weak (2/5) — enhanced monitoring required'];
    if (pending) conds.push('Active legal cases — indemnification mandatory');
    if (gstDel) conds.push('GST delay — ITC clause required');
    return { tier: 'CONDITIONAL', tierIndex: 1, conditions: conds, signals: `Score ${score}/5` };
  }
  const conds: string[] = [];
  if (cvCr >= 50) conds.push(`Procurement head sign-off for contracts ≥₹${cvCr.toFixed(0)} Cr`);
  if (gstDel) conds.push('Verify GSTR-2B before every invoice');
  if (pending) conds.push('Litigation representation clause required');
  if (rating) conds.push(`Annual credit rating review (current: ${rating})`);
  if (qr != null && qr < 1.1) conds.push(`Quick ratio marginal (${qr.toFixed(2)}x) — avoid advances`);
  if (score >= 4 && !pending && !gstDel) return { tier: 'PREFERRED', tierIndex: 3, conditions: conds.length ? conds : ['Standard terms apply'], signals: `Score ${score}/5` };
  return { tier: 'APPROVED', tierIndex: 2, conditions: conds, signals: `Score ${score}/5` };
}

function computeITCRisk(gst: any[]) {
  const delayed = gst.filter(g => g.filing_timeliness && !g.filing_timeliness.toLowerCase().includes('time'));
  const noData = gst.filter(g => !g.filing_timeliness);
  const onTime = gst.filter(g => g.filing_timeliness?.toLowerCase().includes('time'));
  const level: 'LOW' | 'MODERATE' | 'HIGH' = delayed.length === 0 ? 'LOW' : delayed.length <= 2 ? 'MODERATE' : 'HIGH';
  const meter = Math.min((delayed.length / Math.max(gst.length, 1)) * 200, 100);
  const impact = level === 'LOW' ? 'ITC on material purchases unlikely to be disrupted' :
                 level === 'MODERATE' ? `ITC blocked for ${delayed.map(g => g.state?.slice(0, 2)).join(', ')}` :
                 'Significant ITC exposure — multiple state delays';
  return { level, meter, delayed: delayed.length, noData: noData.length, onTime: onTime.length, total: gst.length, impact };
}

function computePaymentTerms(d: any, cvCr: number) {
  const lat = getLatest(d.financials);
  const qr = lat?.ratios?.quick_ratio;
  const cr = lat?.ratios?.current_ratio;
  const ocf = lat?.cash_flow?.cash_flows_from_used_in_operating_activities;
  const rating = getLatestRating(d.credit_ratings)?.rating ?? null;
  const cash = lat?.bs?.assets?.cash_and_bank_balances;
  let terms = 'Net-30 to Net-45';
  let bgRequired = false;
  const reasons: string[] = [];
  if (qr != null) {
    if (qr < 1.0) { terms = 'Net-60 (watch)'; reasons.push(`Quick ratio ${qr.toFixed(2)}x — avoid advance payments`); }
    else if (qr >= 1.5) { terms = 'Net-30'; reasons.push(`Quick ratio ${qr.toFixed(2)}x — strong liquidity`); }
    else reasons.push(`Quick ratio ${qr.toFixed(2)}x — acceptable`);
  }
  if (ocf != null && ocf < 0) { bgRequired = true; reasons.push(`Negative OCF (${fmtCr(ocf)}) — payment risk`); }
  if (cvCr >= 25) { bgRequired = true; reasons.push(`Performance BG for ₹${cvCr.toFixed(0)} Cr contract`); }
  if (cash != null) reasons.push(`Cash & bank: ${fmtCr(cash)} — near-term buffer`);
  if (rating) reasons.push(`Credit rating ${rating} — institutional liquidity confirmed`);
  return { terms, bgRequired, qr, cr, ocf, rating, cash, reasons };
}

function computeContinuity(d: any) {
  const lat = getLatest(d.financials);
  const rating = getLatestRating(d.credit_ratings);
  const ocf = lat?.cash_flow?.cash_flows_from_used_in_operating_activities;
  const cash = lat?.bs?.assets?.cash_and_bank_balances;
  const revGr = lat?.ratios?.revenue_growth;
  const ic = lat?.ratios?.interest_coverage_ratio;
  return [
    { label: 'Credit Rating', detail: rating ? `${rating.rating ?? ''} — ${rating.credit_rating_agency ?? ''}` : 'No rating data', status: rating?.rating?.includes('A') ? 'OK' : 'Watch' },
    { label: 'Bureau Defaults', detail: d.key_indicators?.bureau_defaults ? 'Defaults on record — verify before PO' : 'Clean — no recorded defaults', status: d.key_indicators?.bureau_defaults ? 'Risk' : 'OK' },
    { label: 'Cash & Liquid Assets', detail: cash != null ? `${fmtCr(cash)} — ${cash > 1e10 ? 'adequate' : 'watch'} buffer` : 'Not available', status: cash != null && cash > 5e9 ? 'OK' : 'Watch' },
    { label: 'CIRP / Insolvency', detail: d.company?.cirp_status ? 'CIRP proceedings active' : 'Not under insolvency proceedings', status: d.company?.cirp_status ? 'Risk' : 'OK' },
    { label: 'Revenue Trajectory', detail: revGr != null ? `${revGr >= 0 ? '+' : ''}${revGr.toFixed(1)}% YoY — ${revGr >= 20 ? 'healthy' : revGr >= 0 ? 'modest growth' : 'declining'}` : '—', status: revGr != null && revGr >= 0 ? 'OK' : 'Watch' },
    { label: 'Operating Cashflow', detail: ocf != null ? `${fmtCr(ocf)} — ${ocf < 0 ? 'negative; watch' : 'Positive'}` : 'Not available', status: ocf != null && ocf >= 0 ? 'OK' : 'Watch' },
    { label: 'Interest Coverage', detail: ic != null ? `${ic.toFixed(2)}x — ${ic >= 5 ? 'comfortable' : ic >= 3 ? 'adequate' : 'tight'}` : '—', status: ic != null && ic >= 5 ? 'OK' : ic != null && ic >= 2.5 ? 'Watch' : 'Risk' },
  ] as Array<{ label: string; detail: string; status: 'OK' | 'Watch' | 'Risk' }>;
}

function computeSafeguards(d: any, cvCr: number) {
  const lh = Array.isArray(d.legal_history) ? d.legal_history.length : (d.legal_history as number ?? 0);
  const fc = d.legal_cases_of_financial_disputes?.payable?.length ?? 0;
  const gstDel = d.key_indicators?.gst_filing_delay;
  const msme = d.msme_supplier_payment_delays?.delays_for_period;
  const subs = countGroup(d.subsidiary_entities) + countGroup(d.joint_ventures);
  return [
    { clause: 'Pending Litigation Representation & Warranty', detail: `${lh} cases in legal history${fc ? `; ${fc} NCLT financial disputes` : ''} — indemnify against supply disruption`, priority: 'HIGH' as const, show: lh > 0 || fc > 0 },
    { clause: 'GST Compliance & ITC Indemnification', detail: gstDel ? 'GST delay flag active — full ITC clawback if denied' : 'Standard ITC compliance clause — no active delay flags', priority: gstDel ? 'HIGH' as const : 'MEDIUM' as const, show: true },
    { clause: 'Change of Control & Lender Notification', detail: `${d.open_charges?.length ?? 0} open charges — trigger clause on material change`, priority: 'MEDIUM' as const, show: (d.open_charges?.length ?? 0) > 0 },
    { clause: 'Sub-contractor MSME Payment Obligations', detail: msme ? `${msme.delays?.length ?? 0} MSME suppliers with active overdue payments — 45-day compliance` : 'Ensure MSMED Act compliance', priority: 'MEDIUM' as const, show: true },
    { clause: 'Business Continuity & Step-in Rights', detail: `${subs} group entities — define continuity if primary defaults`, priority: 'MEDIUM' as const, show: true },
    { clause: 'Performance Bank Guarantee', detail: cvCr >= 25 ? `₹${cvCr.toFixed(0)} Cr contract — 10% BG recommended` : `₹${cvCr.toFixed(0)} Cr contract — BG optional below ₹25 Cr`, priority: cvCr >= 25 ? 'HIGH' as const : 'LOW' as const, show: true },
  ].filter(s => s.show);
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function SectionHeader({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '32px 0 16px' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>{n}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
    </div>
  );
}

function Card({ title, icon: Icon, children, accent }: { title?: ReactNode; icon?: any; children: ReactNode; accent?: string }) {
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

function ScoreBar({ label, score }: { label: string; score: number }) {
  const { color, label: lvl } = scoreTheme(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ width: '88px', fontSize: '12px', color: 'var(--muted-foreground)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '9999px', background: color, width: `${(score / 5) * 100}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: '16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, flexShrink: 0, color }}>{score}</span>
      <span style={{ width: '56px', fontSize: '11px', flexShrink: 0, color }}>{lvl}</span>
    </div>
  );
}

const STATUS_COLORS = { OK: '#22c55e', Watch: '#eab308', Risk: '#ef4444' } as const;
const STATUS_ICONS  = { OK: CheckCircle2, Watch: AlertTriangle, Risk: XCircle } as const;

function StatusRow({ label, detail, status }: { label: string; detail: string; status: 'OK' | 'Watch' | 'Risk' }) {
  const Icon = STATUS_ICONS[status];
  const color = STATUS_COLORS[status];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, color }}>
        <Icon size={13} /><span style={{ fontSize: '11px', fontWeight: 700 }}>{status}</span>
      </div>
    </div>
  );
}

const PRIORITY_COLORS = { HIGH: 'rgba(239,68,68,0.08)', MEDIUM: 'rgba(234,179,8,0.08)', LOW: 'rgba(34,197,94,0.08)' } as const;
const PRIORITY_BORDER = { HIGH: 'rgba(239,68,68,0.3)', MEDIUM: 'rgba(234,179,8,0.3)', LOW: 'rgba(34,197,94,0.3)' } as const;
const PRIORITY_TEXT   = { HIGH: '#ef4444', MEDIUM: '#ca8a04', LOW: '#22c55e' } as const;

// ─── AI brief text renderer ───────────────────────────────────────────────────
function BriefOutput({ text }: { text: string }) {
  const lines = text.split('\n');
  const els: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('RISK TIER:')) {
      const val = line.replace('RISK TIER:', '').trim();
      const c = ({ CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e' } as Record<string, string>)[val] ?? '#6b7280';
      els.push(<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Risk Tier</span>
        <span style={{ padding: '3px 14px', borderRadius: '999px', background: `${c}22`, border: `1px solid ${c}44`, color: c, fontWeight: 800, fontSize: '13px', fontFamily: 'monospace' }}>{val}</span>
      </div>);
      i++; continue;
    }
    if (/^[A-Z][A-Z\s/&0-9·\-]+$/.test(line) && line.length > 3 && !line.includes(':')) {
      els.push(<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', marginBottom: '8px' }}>
        <div style={{ width: '3px', height: '14px', background: ACCENT, borderRadius: '2px', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{line}</span>
      </div>);
      i++; continue;
    }
    if (line.startsWith('•') || line.startsWith('-') || /^\d+\.\s/.test(line)) {
      const bullets: ReactNode[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('•') || lines[i].trim().startsWith('-') || /^\d+\.\s/.test(lines[i].trim()))) {
        const l = lines[i].trim().replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
        bullets.push(<li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0, marginTop: '1px', fontSize: '13px' }}>•</span>
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.55 }}>{l}</span>
        </li>);
        i++;
      }
      els.push(<ul key={`ul${i}`} style={{ listStyle: 'none', padding: 0, marginBottom: '8px' }}>{bullets}</ul>);
      continue;
    }
    els.push(<p key={i} style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.65, marginBottom: '6px' }}>{line}</p>);
    i++;
  }
  return <div>{els}</div>;
}

// ─── Search mode toggle (Domestic / International) ────────────────────────────
// "Both" removed from the toggle per request — searchMode's type and the
// 'both' branches in handleNameInput/SourceTag are left as-is (harmless,
// just unreachable via the UI) rather than ripping out a third state that
// still exists in the type everywhere else.
const SEARCH_MODES = [
  { key: 'domestic',      label: 'Domestic' },
  { key: 'international', label: 'International' },
] as const;

function SearchModeToggle({ mode, onChange }: { mode: 'domestic' | 'international' | 'both'; onChange: (m: 'domestic' | 'international' | 'both') => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: '2px', padding: '2px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px' }}>
      {SEARCH_MODES.map(({ key, label }) => {
        const active = mode === key;
        return (
          <button key={key} onClick={() => onChange(key)}
            style={{
              padding: '4px 12px', fontSize: '11px', fontWeight: active ? 700 : 500,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: active ? ACCENT : 'transparent',
              color: active ? '#1a1a1a' : 'var(--muted-foreground)',
              transition: 'all 0.12s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Small DOM/INT tag shown per suggestion row once a search can return either.
function SourceTag({ source }: { source?: 'domestic' | 'international' }) {
  if (!source) return null;
  const isIntl = source === 'international';
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      color: isIntl ? '#93c5fd' : '#86efac',
      background: isIntl ? 'rgba(147,197,253,0.12)' : 'rgba(134,239,172,0.12)',
      border: `1px solid ${isIntl ? 'rgba(147,197,253,0.3)' : 'rgba(134,239,172,0.3)'}`,
      padding: '1px 6px', borderRadius: '4px', flexShrink: 0,
    }}>
      {isIntl ? 'INT' : 'DOM'}
    </span>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ nameQuery, handleNameInput, sugLoading, suggestions, showDrop, pickSuggestion, inputRef, dropRef, searchMode, onSearchModeChange }: {
  nameQuery: string;
  handleNameInput: (v: string) => void;
  sugLoading: boolean;
  suggestions: any[];
  showDrop: boolean;
  pickSuggestion: (s: any) => void;
  inputRef: RefObject<HTMLDivElement | null>;
  dropRef: RefObject<HTMLDivElement | null>;
  searchMode: 'domestic' | 'international' | 'both';
  onSearchModeChange: (m: 'domestic' | 'international' | 'both') => void;
}) {
  const showSourceTags = searchMode === 'both';
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
          Company Name
        </label>
        <SearchModeToggle mode={searchMode} onChange={onSearchModeChange} />
      </div>
      <div ref={inputRef} style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
        <Input
          value={nameQuery}
          onChange={(e) => handleNameInput(e.target.value)}
          placeholder="e.g. TATA STEEL LIMITED"
          style={{ paddingLeft: '34px', height: '40px', fontSize: '13px' }}
        />
        {showDrop && nameQuery.trim().length >= 3 && (
          <div ref={dropRef} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '300px', overflowY: 'auto' }}>
            {sugLoading && (
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                <Loader2 size={13} className="animate-spin" style={{ color: ACCENT }} />Searching…
              </div>
            )}
            {!sugLoading && suggestions.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--muted-foreground)', fontSize: '12px' }}>No companies found</div>
            )}
            {suggestions.map((s, i) => (
              <button key={i} onMouseDown={() => pickSuggestion(s)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,230,0,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {showSourceTags && <SourceTag source={s.source} />}
                  <div style={{ fontSize: '13px', color: 'var(--foreground)', fontWeight: 500 }}>{s.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {(s.cin ?? s.llpin ?? s.identifier) && (
                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{s.cin ?? s.llpin ?? s.identifier}</span>
                  )}
                  {s.country && (
                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{s.country}</span>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function EntityAnalysisTab({ selectedEntity }: { selectedEntity?: SelectedEntity | null }) {
  const [nameQuery, setNameQuery]               = useState('');
  const [suggestions, setSuggestions]           = useState<any[]>([]);
  const [entityImages, setEntityImages]             = useState<Array<{filename: string; data: string}>>([]);
  const [entityImageLoading, setEntityImageLoading] = useState(false);
  const [sugLoading, setSugLoading]             = useState(false);
  const [showDrop, setShowDrop]                 = useState(false);
  const [reportData, setReportData]             = useState<any>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [isEnsLoading, setIsEnsLoading]         = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [displayName, setDisplayName]           = useState<string | null>(null);
  const [lastIdentifier, setLastIdentifier]     = useState('');
  const [activeTab, setActiveTab]               = useState<'generic' | 'procurement' | 'location360'>('generic');
  const [savedLocations, setSavedLocations]     = useState<string[]>([]);
  const [cvCr, setCvCr]                         = useState(0);
  const [category, setCategory]                 = useState('Raw Materials / APIs');
  const [duration, setDuration]                 = useState(12);
  const [sourcing, setSourcing]                 = useState('Single source');
  // Separate state per brief type so they never overwrite each other
  const [genericBriefText, setGenericBriefText] = useState('');
  const [procBriefText, setProcBriefText]       = useState('');
  const [briefLoading, setBriefLoading]         = useState(false);

  const inputRef = useRef<HTMLDivElement | null>(null);
  // ENS submodal data (from screened entities)
  const [ensFindings, setEnsFindings] = useState<any>(null);
  const [ensProfile, setEnsProfile]   = useState<any>(null);
  const dropRef  = useRef<HTMLDivElement | null>(null);
  const debRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Domestic / International / Both search toggle ─────────────────────────
  const [searchMode, setSearchMode] = useState<'domestic' | 'international' | 'both'>('domestic');
  // Which pipeline the currently-displayed report came from — drives which
  // report layout renders below (Probe42's bespoke report vs the Orbis
  // theme-based one). Kept separate from searchMode so switching the toggle
  // doesn't blank out an already-open report.
  const [reportSource, setReportSource] = useState<'domestic' | 'international'>('domestic');
  // International report state — kept separate from reportData/ensFindings
  // (which are Probe42-shaped) since Orbis's schema is genuinely different
  // (see compile_company_findings: profile + 6 theme-based ratings/findings,
  // confirmed against coe-ens-application-backend-orbis/app/core/supplier/graph.py).
  const [intlLoading, setIntlLoading]     = useState(false);
  const [intlError, setIntlError]         = useState<string | null>(null);
  const [intlDisplayName, setIntlDisplayName] = useState<string | null>(null);
  const [intlSearchResult, setIntlSearchResult] = useState<any>(null); // raw suggestion picked (name/country/address/bvdId)
  const [intlEnsId, setIntlEnsId]         = useState<string | null>(null);
  const [intlSessionId, setIntlSessionId] = useState<string | null>(null);
  const [intlProfile, setIntlProfile]     = useState<any>(null);
  const [intlFindings, setIntlFindings]   = useState<any>(null);
  const [intlNotScreened, setIntlNotScreened] = useState(false);
  const [intlFinancials, setIntlFinancials] = useState<any>(null);
  const [intlImages, setIntlImages] = useState<Array<{ filename: string; data: string; content_type?: string }>>([]);
  const [intlImagesLoading, setIntlImagesLoading] = useState(false);
  const [intlBriefText, setIntlBriefText] = useState('');
  const [intlBriefLoading, setIntlBriefLoading] = useState(false);
  // Only 2 tabs for international (no Procurement/SCM — nothing in that
  // domain ports from Probe42's GST/MSME/CIRP concepts; can be added later
  // if needed). 'generic' mirrors domestic's Generic Profiling tab —
  // everything stacked in one tab, matching domestic's own structure.
  const [intlActiveTab, setIntlActiveTab] = useState<'generic' | 'location360'>('generic');
  const [intlSavedLocations, setIntlSavedLocations] = useState<string[]>([]);

  // Auto-search when entity clicked from Overview table
  useEffect(() => {
    if (selectedEntity?.identifier) {
      setReportSource('domestic');
      setDisplayName(selectedEntity.name);
      setNameQuery('');
      setSuggestions([]);
      setEnsFindings(null);
      setEnsProfile(null);
      fetchCompany(selectedEntity.identifier, selectedEntity.identifierType || 'cin', selectedEntity.entityType || 'company');
      // Fetch ENS submodal data in parallel if entity was screened
      if (selectedEntity.ensId && selectedEntity.sessionId) {
        fetchSubmodal(selectedEntity.ensId, selectedEntity.sessionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetches whichever pipeline(s) searchMode calls for, tags each result
  // with its source so pickSuggestion knows which report to load, and
  // merges them for "both" mode. A failed/empty call on either side just
  // contributes zero results — no error shown, matching how a plain
  // no-match already looks (same reasoning as the international name
  // search endpoint's cache-miss-then-dead-live-API path).
  const handleNameInput = (v: string) => {
    setNameQuery(v);
    setShowDrop(true);
    setSuggestions([]);
    if (debRef.current) clearTimeout(debRef.current);
    if (v.trim().length < 3) return;
    debRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const q = encodeURIComponent(v.trim());
        const wantDomestic = searchMode === 'domestic' || searchMode === 'both';
        const wantIntl     = searchMode === 'international' || searchMode === 'both';

        const [domesticResults, intlResults] = await Promise.all([
          wantDomestic
            ? fetch(getApiUrl(`/api/probe42-name-search?orgName=${q}`))
                .then(r => r.json())
                .then(j => (j?.data?.results ?? j?.results ?? []).map((s: any) => ({ ...s, source: 'domestic' as const })))
                .catch(() => [])
            : Promise.resolve([]),
          wantIntl
            ? fetch(getApiUrl(`/api/moodys-name-search?orgName=${q}`))
                .then(r => r.json())
                .then(j => (j?.data?.results ?? j?.results ?? []).map((s: any) => ({ ...s, source: 'international' as const })))
                .catch(() => [])
            : Promise.resolve([]),
        ]);

        setSuggestions([...domesticResults, ...intlResults].slice(0, 10));
        setShowDrop(true);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 350);
  };

  const pickSuggestion = (s: any) => {
    setShowDrop(false);
    setSuggestions([]);
    setNameQuery('');
    if (s.source === 'international') {
      setReportSource('international');
      fetchInternationalCompany(s);
      return;
    }
    setReportSource('domestic');
    const id = s.cin ?? s.llpin ?? s.identifier ?? nameQuery.trim();
    const it = s.identifier_type ?? (s.cin ? 'cin' : s.llpin ? 'llpin' : 'cin');
    setDisplayName(s.name);
    fetchCompany(id, it, s.entity_type ?? 'company');
  };

  /**
   * International counterpart of fetchCompany. Unlike Probe42, there's no
   * ad-hoc "pull everything on this company" endpoint — Orbis's report data
   * (compile_company_profile/findings, six theme-based ratings — see
   * coe-ens-application-backend-orbis/app/core/supplier/graph.py) only
   * exists for entities that have actually been screened (have an ens_id).
   * So: look up whether this bvd_id has been screened; if yes, load the
   * full theme-based report; if no, fall back to showing the raw
   * cache/live search result fields as a clearly-labeled "not yet
   * screened" reference card instead of a fake/empty report.
   */
  const fetchInternationalCompany = async (s: any) => {
    setIntlLoading(true);
    setIntlError(null);
    setIntlDisplayName(s.name ?? null);
    setIntlSearchResult(s);
    setIntlEnsId(null);
    setIntlSessionId(null);
    setIntlProfile(null);
    setIntlFindings(null);
    setIntlFinancials(null);
    setIntlImages([]);
    setIntlImagesLoading(false);
    setIntlBriefText('');
    setIntlBriefLoading(false);
    setIntlNotScreened(false);
    setIntlActiveTab('generic');

    const bvdId = s.identifier;
    if (!bvdId) {
      setIntlError('No BVD ID available for this result.');
      setIntlLoading(false);
      return;
    }

    try {
      const lookupRes = await fetch(getApiUrl(`/api/moodys-entity-lookup?bvdId=${encodeURIComponent(bvdId)}`));
      const lookup = await lookupRes.json();

      if (!lookup?.found) {
        setIntlNotScreened(true);
        setIntlLoading(false);
        return;
      }

      setIntlEnsId(lookup.ensId);
      setIntlSessionId(lookup.sessionId);

      const [profile, findings, financials] = await Promise.all([
        apiService.getEntityProfile(lookup.ensId, 'international').catch(() => null),
        apiService.getEntityFindings(lookup.ensId, 'international').catch(() => null),
        apiService.getEntityFinancials(lookup.ensId, 'international').catch(() => null),
      ]);
      setIntlProfile(profile);
      setIntlFindings(findings);
      setIntlFinancials(financials);

      // Location photos — mirrors domestic's fetchSubmodal image-fetch step.
      // findings.google_image_name only exists after the graph.py fix
      // (compile_company_findings now includes it, same as Probe42's
      // universe.py already did).
      if (findings?.google_image_name) {
        setIntlImagesLoading(true);
        try {
          const imageData = await apiService.getEntityImage(findings.google_image_name, 'international');
          let allImages: Array<{ filename: string; data: string; content_type?: string }> = [];
          if (Array.isArray(imageData)) {
            allImages = imageData.filter((img: any) => img?.data);
          } else if (imageData?.images && Array.isArray(imageData.images)) {
            allImages = imageData.images.filter((img: any) => img?.data);
          }
          setIntlImages(dedupeImages(allImages));
        } catch {
          setIntlImages([]);
        } finally {
          setIntlImagesLoading(false);
        }
      }
    } catch (e: any) {
      setIntlError(e?.message ?? 'Failed to load international entity data.');
    } finally {
      setIntlLoading(false);
    }
  };

  // International counterpart of generateBrief — calls
  // generate_orbis_ai_brief() on coe-ens-application-backend-orbis directly
  // (no proxy route needed, unlike domestic's /api/vendor-risk/ai-brief,
  // since that endpoint already lives on the same BACKEND getEntityFindings/
  // getEntityFinancials call).
  const generateIntlBrief = async () => {
    if (!intlEnsId) return;
    setIntlBriefLoading(true);
    setIntlBriefText('');
    try {
      const data = await apiService.getEntityAiBrief(intlEnsId);
      setIntlBriefText(data?.brief ?? 'No brief generated.');
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? 'AI brief request failed';
      setIntlBriefText(`Error: ${detail}`);
    } finally {
      setIntlBriefLoading(false);
    }
  };

  // Per-bvdId saved locations for the international Location Risk tab —
  // mirrors the domestic savedLocations effect below, keyed separately.
  useEffect(() => {
    const bvdId = intlSearchResult?.identifier;
    if (!bvdId) return;
    try {
      const raw = localStorage.getItem(`location360.saved.intl.${bvdId}`);
      const arr = raw ? JSON.parse(raw) : [];
      setIntlSavedLocations(Array.isArray(arr) ? arr : []);
    } catch {
      setIntlSavedLocations([]);
    }
  }, [intlSearchResult]);

  const fetchCompany = async (identifier: string, identifierType: string, entityType: string) => {
    setIsLoading(true);
    setReportData(null);
    setError(null);
    setLastIdentifier(identifier);
    setEntityImages([]);
    setEntityImageLoading(false);
    setGenericBriefText('');
    setProcBriefText('');
    setEnsFindings(null);   
    setEnsProfile(null);
    console.log('[EntityAnalysis] fetchCompany →', { identifier, identifierType, entityType });
    try {
      // ── Step 1: Fetch Probe42 data from orchestration ──────────────────────────
      console.log('[EntityAnalysis] Step 1: calling /api/get-complete-company-data');
      const r = await fetch(getApiUrl('/api/get-complete-company-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, identifier_type: identifierType, entity_type: entityType }),
      });
      const ct = r.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) throw new Error(`Server returned ${r.status}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? j?.detail?.message ?? 'Request failed');
      const record = j?.data?.data?.[0] ?? j?.data;
      if (!record) throw new Error('No data returned.');
      console.log('[EntityAnalysis] Step 1 ✅ Probe42 data received for:', record?.name);
      setReportData(record);

      // ── Step 2: Look up entity_universe by identifier ──────────────────────────
      // Even for manual searches, check if this entity was previously screened.
      // If found → auto-load ENS findings (Cyber, Z-Altman, Sanctions, EPFO etc.)
      console.log('[EntityAnalysis] Step 2: looking up entity_universe for identifier:', identifier);
      setIsEnsLoading(true);
      await tryAutoLoadENS(identifier);
    } catch (e: any) {
      console.error('[EntityAnalysis] fetchCompany failed:', e.message);
      setError(e.message ?? 'Something went wrong');
      setIsEnsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2 — Look up entity_universe table by identifier.
   * If a row exists → we have ens_id + last_session_id → call fetchSubmodal.
   * If no row → entity has not been screened → ENS sections show empty state.
   */
  const tryAutoLoadENS = async (identifier: string) => {
    console.log('[EntityAnalysis] tryAutoLoadENS: querying entity_universe for identifier =', identifier);
    try {
      const r = await fetch(
        getApiUrl(`/api/entity-universe-lookup?identifier=${encodeURIComponent(identifier)}`)
      );
      const j = await r.json();
      console.log('[EntityAnalysis] entity_universe lookup result:', j);

      if (!j?.found) {
        console.log('[EntityAnalysis] ℹ️  No row in entity_universe for this identifier → ENS data unavailable.');
        setIsEnsLoading(false);
        return;
      }

      console.log(`[EntityAnalysis] ✅ Found in entity_universe: ensId=${j.ensId}, sessionId=${j.sessionId}`);
      await fetchSubmodal(j.ensId, j.sessionId);
    } catch (e: any) {
      console.warn('[EntityAnalysis] tryAutoLoadENS error (non-fatal):', e.message);
      setIsEnsLoading(false);
    }
  };

  /**
   * Step 3 — Use apiService (axios + auth interceptors) to call:
   *   apiService.getEntityFindings(ensId)  → /universe/get-submodal-findings
   *   apiService.getEntityProfile(ensId)   → /universe/get-submodal-profile
   *
   * Findings payload drives these sections:
   *   entity_existence_data  → Section 08: name/address/domain validation
   *   financial_data         → Section 11: Z-Altman (FSTB9A), EPFO (FSTB13A)
   *   cyber_esg_data         → Section 10: Cyber risk (CYB1A)
   *   legal_data             → Section 09: Sanctions (LEG3A, LEG3B)
   *   adverse_media_data     → Section 12: Google rating (NWS2A)
   */
  const fetchSubmodal = async (ensId: string, sessionId: string) => {
    console.log('[EntityAnalysis] ── fetchSubmodal START ──────────────────────────');
    setIsEnsLoading(true);
    console.log('[EntityAnalysis] ensId    :', ensId);
    console.log('[EntityAnalysis] sessionId:', sessionId, '(stored, not sent — api.ts uses ensId only)');
    console.log('[EntityAnalysis] Calling apiService.getEntityFindings(ensId)...');

    // ── Findings (primary — populates all ENS sections) ──────────────────
    try {
      const findings = await apiService.getEntityFindings(ensId);
      console.log('[EntityAnalysis] ✅ getEntityFindings response received');
      console.log('[EntityAnalysis]   Top-level keys          :', Object.keys(findings ?? {}));
      console.log('[EntityAnalysis]   entity_existence_findings:', findings?.entity_existence_findings);
      console.log('[EntityAnalysis]   entity_existence_data    :', findings?.entity_existence_data?.length, 'items',
                  findings?.entity_existence_data?.map((k: any) => k.kpi_code));
      console.log('[EntityAnalysis]   financial_data kpi_codes :', findings?.financial_data?.map((k: any) => k.kpi_code));
      console.log('[EntityAnalysis]   cyber_esg_data kpi_codes :', findings?.cyber_esg_data?.map((k: any) => k.kpi_code));
      console.log('[EntityAnalysis]   legal_data kpi_codes     :', findings?.legal_data?.map((k: any) => k.kpi_code));
      console.log('[EntityAnalysis]   adverse_media kpi_codes  :', findings?.adverse_media_data?.map((k: any) => k.kpi_code));
      console.log('[EntityAnalysis]   risk_level               :', findings?.risk_level);
      console.log('[EntityAnalysis]   entity_existence_rating  :', findings?.entity_existence_rating);

      if (!findings) {
        console.warn('[EntityAnalysis] ⚠ getEntityFindings returned null/undefined');
      } else {
        setEnsFindings(findings);
        // Fetch entity image if google_image_name is present
        if (findings?.google_image_name) {
          console.log('[EntityAnalysis] Fetching entity images for:', findings.google_image_name);
          setEntityImageLoading(true);
          try {
            console.log('[EntityAnalysis] Fetching entity images for:', findings.google_image_name);
            const imageData = await apiService.getEntityImage(findings.google_image_name);
            console.log('[EntityAnalysis] getEntityImage response keys:', Object.keys(imageData ?? {}));
            console.log('[EntityAnalysis] getEntityImage response:', imageData);
            
            // Handle array response from backend - store ALL images
            let allImages: Array<{filename: string; data: string}> = [];
            
            // Case 1: Backend returns array of images
            if (Array.isArray(imageData)) {
              console.log('[EntityAnalysis] Response is array with', imageData.length, 'images');
              allImages = imageData
                .filter((img: any) => img?.data)
                .map((img: any) => ({
                  filename: img.filename || 'image',
                  data: img.data
                }));
            }
            // Case 2: Backend returns object with images array
            else if (imageData?.images && Array.isArray(imageData.images)) {
              console.log('[EntityAnalysis] Response has images array with', imageData.images.length, 'items');
              allImages = imageData.images
                .filter((img: any) => img?.data)
                .map((img: any) => ({
                  filename: img.filename || 'image',
                  data: img.data
                }));
            }
            // Case 3: Single image object (fallback)
            else {
              const base64 =
                  imageData?.image_base64 ??
                  imageData?.image ??
                  imageData?.data ??
                  imageData?.base64 ??
                  (typeof imageData === 'string' ? imageData : null);
              if (base64) {
                allImages = [{ filename: 'image', data: base64 }];
              }
            }
            
            if (allImages.length > 0) {
              setEntityImages(dedupeImages(allImages));
              console.log('[EntityAnalysis] ✅ All', allImages.length, 'entity images loaded');
            } else {
              console.warn('[EntityAnalysis] ⚠ No valid images found in response');
            }
          } catch (e: any) {
            console.warn('[EntityAnalysis] getEntityImage failed (non-critical):', e?.message);
          } finally {
            setEntityImageLoading(false);
          }
        }
        console.log('[EntityAnalysis] ✅ ensFindings state updated');
      }

    } catch (e: any) {
      console.error('[EntityAnalysis] ❌ getEntityFindings failed:', e?.message ?? e);
      console.error('[EntityAnalysis]    status:', e?.status, '| details:', e?.details);
    }

    // ── Profile (secondary — non-critical, for header display) ────────────
    console.log('[EntityAnalysis] Calling apiService.getEntityProfile(ensId)...');
    try {
      const profile = await apiService.getEntityProfile(ensId);
      console.log('[EntityAnalysis] ✅ getEntityProfile response received');
      console.log('[EntityAnalysis]   Profile name    :', profile?.name ?? profile?.uploaded_name);
      console.log('[EntityAnalysis]   Profile location:', profile?.location);
      console.log('[EntityAnalysis]   risk_level      :', profile?.risk_level);
      console.log('[EntityAnalysis]   Profile keys    :', Object.keys(profile ?? {}));
      if (profile) setEnsProfile(profile);
    } catch (e: any) {
      console.warn('[EntityAnalysis] ⚠ getEntityProfile failed (non-critical):', e?.message ?? e);
    }

    setIsEnsLoading(false);
    console.log('[EntityAnalysis] ── fetchSubmodal END ────────────────────────────');
  };

  const generateBrief = async (type: 'generic' | 'procurement') => {
    if (!reportData || !lastIdentifier) return;
    setBriefLoading(true);
    // Clear only the brief being regenerated
    if (type === 'generic') setGenericBriefText('');
    else setProcBriefText('');
    try {
      const r = await fetch(getApiUrl('/api/vendor-risk/ai-brief'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: lastIdentifier,
          brief_type: type,
          procurement_context: type === 'procurement'
            ? { category, contract_value_cr: cvCr, duration_months: duration, sourcing_strategy: sourcing }
            : null,
        }),
      });
      const ct = r.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) throw new Error(`Server returned ${r.status}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? j?.detail?.message ?? 'AI brief request failed');
      const text = j?.data?.brief ?? j?.brief ?? 'No brief generated.';
      if (type === 'generic') setGenericBriefText(text);
      else setProcBriefText(text);
    } catch (e: any) {
      const msg = `Error: ${(e as any).message}`;
      if (type === 'generic') setGenericBriefText(msg);
      else setProcBriefText(msg);
    } finally {
      setBriefLoading(false);
    }
  };

  // ─── Derived display data ───────────────────────────────────────────────────
  const isLLP  = !!reportData?.probe42_data?.llp;
  const d      = isLLP
    ? { ...reportData?.probe42_data, company: { ...reportData?.probe42_data?.llp, cin: reportData?.probe42_data?.llp?.llpin } }
    : (reportData?.probe42_data ?? {});
  const co      = d.company ?? {};
  const fin     = d.financials ?? [];
  const gst     = d.gst_details ?? [];
  const dirs    = d.authorized_signatories ?? d.directors ?? [];
  const pfs     = d.probe_financial_score;
  const ki      = d.key_indicators ?? {};
  const charges = d.open_charges ?? [];
  const lat     = getLatest(fin);
  const peer    = d.peer_comparison?.[0]?.benchMarks?.[0];
  const name    = displayName ?? reportData?.name ?? '';

  // Default location to use for Location360 card: prefer ENS profile location,
  // then probe42 registered city, then registered_address full address.
  const defaultLocation = (
    ensProfile?.location?.district ?? ensProfile?.location?.city ??
    d.company?.registered_address?.city ?? d.company?.registered_address?.full_address ?? null
  );

  // Load per-entity saved locations from localStorage when identifier changes
  useEffect(() => {
    if (!lastIdentifier) return;
    try {
      const key = `location360.saved.${lastIdentifier}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSavedLocations(arr);
        else setSavedLocations([]);
      } else setSavedLocations([]);
    } catch (e) {
      setSavedLocations([]);
    }
  }, [lastIdentifier]);

  const standalone = fin.filter((f: any) => f.nature === 'STANDALONE');
  const ratioTrend = (standalone.length ? standalone : fin)
    .sort((a: any, b: any) => a.year?.localeCompare(b.year))
    .slice(-5)
    .map((f: any) => ({
      year: f.year?.slice(0, 4),
      'EBITDA Margin %': f.ratios?.ebitda_margin ?? null,
      'Net Margin %':    f.ratios?.net_margin ?? null,
      'Rev Growth %':    f.ratios?.revenue_growth ?? null,
    }));

  const radarData = pfs ? [
    { subject: 'Growth',        value: pfs.growth_score,        fullMark: 5 },
    { subject: 'Profitability', value: pfs.profitability_score, fullMark: 5 },
    { subject: 'Liquidity',     value: pfs.liquidity_score,     fullMark: 5 },
    { subject: 'Solvency',      value: pfs.solvency_score,      fullMark: 5 },
    { subject: 'Efficiency',    value: pfs.efficiency_score,    fullMark: 5 },
  ] : [];

  const tier       = reportData ? computeTier(d, cvCr) : null;
  const itcRisk    = gst.length ? computeITCRisk(gst) : null;
  const pymtTerms  = reportData ? computePaymentTerms(d, cvCr) : null;
  const continuity = reportData ? computeContinuity(d) : null;
  const safeguards = reportData ? computeSafeguards(d, cvCr) : null;

  // ── ENS-derived helpers (from submodal endpoints) ───────────────────────────
  const getKpi = (area: any[], code: string) =>
    area?.find((k: any) => k.kpi_code === code);
  const parseKpiJson = (kpi: any) => {
    if (!kpi) return null;
    try { return typeof kpi.kpi_details === 'string' ? JSON.parse(kpi.kpi_details) : kpi.kpi_details; }
    catch { return kpi.kpi_details; }
  };

  // ── Map actual response shape: findings.* not *_data ──────────────────
  const finData         = ensFindings?.findings?.financials    ?? ensFindings?.financial_data    ?? [];
  const cyberData       = ensFindings?.findings?.cyber_esg     ?? ensFindings?.cyber_esg_data   ?? [];
  const legalData       = ensFindings?.findings?.legal         ?? ensFindings?.legal_data        ?? [];
  const mediaData       = ensFindings?.findings?.adverse_media ?? ensFindings?.adverse_media_data ?? [];
  const existenceData   = ensFindings?.findings?.entity_existence ?? ensFindings?.entity_existence_data ?? [];
  const ensRatings      = ensFindings?.ratings ?? {};
  const existenceRating = ensRatings?.entity_existence ?? ensFindings?.entity_existence_rating ?? null;
  const ensMetadata     = ensFindings?.metadata ?? null;

  const zaltman    = parseKpiJson(getKpi(finData, 'FSTB9A'));   // Z-Altman score
  const epfo       = parseKpiJson(getKpi(finData, 'FSTB13A'));  // EPFO
  const cyberKpi   = parseKpiJson(getKpi(cyberData, 'CYB1A')); // Cyber risk
  const sanctionsCoKpi  = getKpi(legalData, 'LEG3A');           // Company sanctions
  const sanctionsEmpKpi = getKpi(legalData, 'LEG3B');           // Employee sanctions
  const googleRating    = parseKpiJson(getKpi(mediaData, 'NWS2A')); // Google rating
  const chargesKpi      = parseKpiJson(getKpi(legalData, 'LEG2A')); // Open charges (ENS)
  const sanctionsCo  = sanctionsCoKpi  ? (typeof sanctionsCoKpi.kpi_details === 'string'  ? (() => { try { return JSON.parse(sanctionsCoKpi.kpi_details);  } catch { return null; } })() : sanctionsCoKpi.kpi_details)  : null;
  const sanctionsEmp = sanctionsEmpKpi ? (typeof sanctionsEmpKpi.kpi_details === 'string' ? (() => { try { return JSON.parse(sanctionsEmpKpi.kpi_details); } catch { return null; } })() : sanctionsEmpKpi.kpi_details) : null;


  const tierColors: Record<TierType, string> = {
    RESTRICTED: '#dc2626', CONDITIONAL: '#ea580c',
    APPROVED: '#ca8a04', PREFERRED: '#16a34a', STRATEGIC: '#2563eb',
  };

  // ─── International report (Orbis) ───────────────────────────────────────────
  // Genuinely separate render path from the Probe42 report below — Orbis's
  // schema is theme-based (six fixed themes: sanctions, government_political,
  // bribery_corruption_overall, financials, other_adverse_media,
  // additional_indicator; each with a rating + a list of KPI findings),
  // confirmed against coe-ens-application-backend-orbis/app/core/supplier/
  // graph.py's compile_company_findings(). None of Probe42's GST/MSME/CIRP/
  // procurement-tier logic applies here, so this doesn't try to reuse it.
  if (reportSource === 'international') {
    const searchBarEl = (
      <SearchBar nameQuery={nameQuery} handleNameInput={handleNameInput} sugLoading={sugLoading} suggestions={suggestions} showDrop={showDrop} pickSuggestion={pickSuggestion} inputRef={inputRef} dropRef={dropRef} searchMode={searchMode} onSearchModeChange={setSearchMode} />
    );

    if (!intlSearchResult && !intlLoading) {
      return (
        <div style={{ maxWidth: '860px' }}>
          <div style={{ textAlign: 'center', paddingTop: '24px', marginBottom: '32px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '14px', margin: '0 auto 18px', background: 'rgba(255,230,0,0.1)', border: '1px solid rgba(255,230,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={24} style={{ color: ACCENT }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>Entity Analysis</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.65, maxWidth: '420px', margin: '0 auto' }}>
              Search any international company for sanctions, ownership, ESG, and adverse-media findings.
            </p>
          </div>
          {searchBarEl}
        </div>
      );
    }

    if (intlLoading) {
      return (
        <div style={{ maxWidth: '860px' }}>
          {searchBarEl}
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: ACCENT }} />
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Fetching intelligence for <strong style={{ color: 'var(--foreground)' }}>{intlDisplayName}</strong>…</p>
          </div>
        </div>
      );
    }

    if (intlError) {
      return (
        <div style={{ maxWidth: '860px' }}>
          {searchBarEl}
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '14px 18px', color: '#ef4444', fontSize: '13px', marginTop: '16px' }}>{intlError}</div>
        </div>
      );
    }

    if (intlNotScreened) {
      const s = intlSearchResult ?? {};
      return (
        <div style={{ maxWidth: '860px' }}>
          {searchBarEl}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#93c5fd' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>{s.name ?? intlDisplayName}</h2>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#93c5fd', background: 'rgba(147,197,253,0.12)', border: '1px solid rgba(147,197,253,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                Not Yet Screened
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: '16px' }}>
              This company hasn't been through a screening run yet, so no rated findings exist for it.
              Showing the cached reference data on file instead — run it through the screening
              pipeline for a full risk report.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div><span style={{ color: 'var(--muted-foreground)' }}>BVD ID</span><div style={{ fontFamily: 'monospace', color: 'var(--foreground)' }}>{s.identifier ?? '—'}</div></div>
              <div><span style={{ color: 'var(--muted-foreground)' }}>Country</span><div style={{ color: 'var(--foreground)' }}>{s.country ?? '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--muted-foreground)' }}>Address</span><div style={{ color: 'var(--foreground)' }}>{s.address ?? '—'}</div></div>
            </div>
          </div>
        </div>
      );
    }

    // ── Full report — genuinely schema-driven, not hardcoded ──
    // profile: whatever fields the API returned (company_profile table,
    // minus internal linkage columns). ratings: whatever kpi_codes are
    // active for this entity in ovar (server already excludes
    // "Deactivated" ones) — 'supplier' is the overall/headline rating,
    // everything else is a theme rating. findings: whatever theme keys
    // pull_kpis() grouped this entity's flagged KPIs into. financials:
    // whatever metrics compile_company_financials() found non-empty for
    // this entity (verified against real data: often only 2 of 13
    // possible metrics are populated). None of these are hardcoded lists
    // — a company with a different set of active ratings, theme keys, or
    // populated financial metrics renders correctly with no code change.
    const profile = intlProfile?.profile ?? {};
    const ratings = intlFindings?.ratings ?? intlProfile?.ratings ?? {};
    const findings = intlFindings?.findings ?? {};
    const financialsMap = intlFinancials?.financials ?? {};
    const overallRating = ratings?.supplier;
    const themeRatingColor = (rating?: string) => {
      const r = (rating ?? '').toLowerCase();
      if (r.includes('high')) return '#ef4444';
      if (r.includes('medium')) return '#eab308';
      // "No Alerts" is a neutral "nothing flagged" status, not the same
      // affirmative signal as a verified "Low" rating — the report doc's
      // own Executive Summary table draws it gray, not green, so this
      // matches that instead of conflating the two.
      if (r.includes('no alert')) return '#6b7280';
      if (r.includes('low')) return '#22c55e';
      return '#6b7280';
    };
    const toLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    // Source-text polish only (never touches underlying data): fixes the
    // "PeP" casing typo and the dangling "- )" / "- :" left behind when a
    // role/detail field the backend returned was blank.
    const cleanFindingText = (s: string) => s
      .replace(/\bPeP\b/g, 'PEP')
      .replace(/-\s*\)/g, ')')
      .replace(/-\s*:/g, ':');
    // Icon per theme, matched by keyword against whatever theme key the API
    // returns — not a lookup table keyed to specific expected theme names,
    // so an unrecognized future theme still gets a sensible icon (FileText)
    // instead of breaking.
    const themeIcon = (key: string) => {
      const k = key.toLowerCase();
      if (k.includes('sanction')) return Shield;
      if (k.includes('government') || k.includes('political') || k.includes('bribery') || k.includes('corruption')) return Landmark;
      if (k.includes('financial')) return Banknote;
      if (k.includes('adverse') || k.includes('media') || k.includes('news')) return Newspaper;
      if (k.includes('cyber') || k.includes('additional') || k.includes('indicator')) return Activity;
      if (k.includes('entity') || k.includes('existence')) return Building2;
      return FileText;
    };

    // 'name' and 'address' get dedicated prominent placement in the header;
    // key_executives/shareholders get their own Board & Ownership section
    // (multi-line text reads badly crammed into a 2-column field grid).
    const PROFILE_HIDDEN_KEYS = new Set([
      'ens_id', 'session_id', 'create_time', 'update_time', 'id',
      // Shown directly in the header instead (name/title, quick-fact row,
      // address line, or the status/revenue/employee/website pill row).
      'name', 'address', 'national_identifier', 'incorporation_date', 'legal_status',
      'active_status', 'revenue', 'employee', 'website',
      // Board & Ownership gets these two in their own dedicated section.
      'key_executives', 'shareholders',
    ]);
    const profileEntries = Object.entries(profile).filter(
      ([k, v]) => !PROFILE_HIDDEN_KEYS.has(k) && v != null && v !== '',
    );
    const ratingEntries = Object.entries(ratings).filter(([k]) => k !== 'supplier');
    const findingsThemeKeys = Object.keys(findings);

    // Group financial metrics by whatever "category" the backend assigned
    // (e.g. "PROFIT & LOSS ACCOUNT", "STRUCTURE RATIOS") — categories and
    // which metrics exist within them both come from the API response,
    // nothing fixed locally. compile_company_financials() always returns
    // all 13 possible metric keys, with data: [] for ones that have no
    // actual values (confirmed against real data) — those are dropped
    // here rather than rendered as empty "—" cards, since showing a card
    // for a metric that has literally zero data points isn't useful, it's
    // just clutter (this is a display filter on real absence of data, not
    // an assumption about which metrics matter).
    const financialsByCategory: Record<string, any[]> = {};
    Object.entries(financialsMap).forEach(([metricKey, metric]: [string, any]) => {
      if (!Array.isArray(metric?.data) || metric.data.length === 0) return;
      const cat = metric?.category ?? 'OTHER';
      (financialsByCategory[cat] ??= []).push({ key: metricKey, ...metric });
    });
    const financialCategories = Object.keys(financialsByCategory);

    // Generic kpi_details renderer — detects shape at runtime instead of
    // hardcoding per-theme/per-KPI-code assumptions (verified real
    // examples vary: a plain sentence for SAN3A, a JSON array of
    // {factor, value} pairs for CYB1A, a pre-formatted multi-line string
    // for FIN1A). Any KPI whose kpi_details happens to be a factor/value
    // array gets the table treatment, regardless of which theme it's in.
    // All patterns below are detected by SHAPE (regex/structure), not by
    // theme name or kpi_code — so any KPI whose kpi_details happens to
    // match, in any theme, gets the nicer treatment automatically.
    const renderKpiDetails = (details: any) => {
      let parsed: any = details;
      if (typeof details === 'string') {
        try { parsed = JSON.parse(details); } catch { parsed = details; }
      }

      // Factor/value array (confirmed real shapes: CYB1A uses lowercase
      // "factor"/"value" keys, DOM1A-style entity-existence KPIs use
      // capitalized "Factor"/"Value" — normalize casing so both render as
      // the colored grid instead of one of them falling through to a raw
      // JSON dump) — colored grid, not a plain table, with semantic
      // coloring for common threat-flag vocabulary (YES/NO/PASS/FAIL/etc.),
      // falling back to plain color when the value doesn't match.
      const asFactorValue = (p: any) => {
        if (!p || typeof p !== 'object') return null;
        const factor = p.factor ?? p.Factor ?? p.Parameter ?? p.parameter;
        const value = p.value ?? p.Value;
        return factor != null && value != null ? { factor, value } : null;
      };
      const factorValueRows = Array.isArray(parsed) ? parsed.map(asFactorValue) : null;
      if (factorValueRows && factorValueRows.length > 0 && factorValueRows.every(Boolean)) {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {factorValueRows.map((p, i) => {
              const v = String(p!.value ?? '').trim().toUpperCase();
              const isNegative = ['YES', 'FAIL', 'HIGH', 'ACTIVE', 'TRUE'].includes(v);
              const isPositive = ['NO', 'PASS', 'CLEAR', 'LOW', 'FALSE'].includes(v);
              const color = isNegative ? '#ef4444' : isPositive ? '#22c55e' : 'var(--foreground)';
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', marginBottom: '4px' }}>{String(p!.factor)}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color, wordBreak: 'break-word' }}>{String(p!.value)}</div>
                </div>
              );
            })}
          </div>
        );
      }

      if (typeof parsed === 'string') {
        const text = cleanFindingText(parsed);

        // Google-review-style text (confirmed real shape: NWS2A) —
        // "Name: X\nRating: Y\nNumber of Reviews: Z\n\n\nReviews:\n1. Name: A | Rating: B\n<text>\n\n2. ..."
        const reviewHeader = text.match(/^Name:\s*(.+?)\nRating:\s*([\d.]+)\nNumber of Reviews:\s*(\d+)/);
        if (reviewHeader) {
          const [, bizName, ratingStr, reviewCount] = reviewHeader;
          const rating = parseFloat(ratingStr);
          const reviewsBlock = text.split(/Reviews:\s*\n/)[1] ?? '';
          const reviewEntries = [...reviewsBlock.matchAll(/\d+\.\s*Name:\s*(.+?)\s*\|\s*Rating:\s*([\d.]+)\n([\s\S]*?)(?=\n\s*\d+\.\s*Name:|$)/g)];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: reviewEntries.length ? '10px' : 0 }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: ACCENT }}>{ratingStr}</span>
                <div>
                  <div style={{ color: '#f59e0b', fontSize: '13px', letterSpacing: '1px' }}>
                    {'★'.repeat(Math.round(rating))}{'☆'.repeat(Math.max(0, 5 - Math.round(rating)))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{bizName.trim()} · {reviewCount} reviews</div>
                </div>
              </div>
              {reviewEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewEntries.slice(0, 3).map((m, i) => {
                    const reviewText = m[3].trim();
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{m[1].trim()}</span>
                          <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(parseFloat(m[2])))))}</span>
                        </div>
                        <div style={{ color: 'var(--muted-foreground)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                          {reviewText.length > 220 ? `${reviewText.slice(0, 220)}…` : reviewText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Multi-year trend text (confirmed real shape: FIN1A/FIN2A) —
        // "[2026-12-31]: 125M\n[2024-03-31]: 127M\n..." — mini chart.
        const trendMatches = [...text.matchAll(/\[(\d{4}-\d{2}-\d{2})\]:\s*([\d.,]+[A-Za-z%]*)/g)];
        if (trendMatches.length >= 2) {
          const chartPoints = trendMatches
            .map((m) => ({ date: m[1], raw: m[2], value: parseFloat(m[2].replace(/[^\d.-]/g, '')) }))
            .filter((p) => !isNaN(p.value))
            .sort((a, b) => a.date.localeCompare(b.date));
          if (chartPoints.length >= 2) {
            return (
              <div>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={chartPoints}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={(d: string) => d.slice(0, 7)} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} formatter={(_v: any, _n: any, p: any) => [p?.payload?.raw, 'Value']} />
                    <Line dataKey="value" stroke={ACCENT} dot={{ r: 3 }} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                  {chartPoints.map((p) => `${p.date.slice(0, 7)}: ${p.raw}`).join('  ·  ')}
                </div>
              </div>
            );
          }
        }

        // Numbered-list-of-entries text (confirmed real shape: PEP findings
        // — "Following PeP findings :\n1. Mr X (role): description\n2. ...")
        const numberedEntries = text.split(/\n(?=\d+\.\s)/).filter((s) => /^\d+\.\s/.test(s.trim()));
        if (numberedEntries.length > 1) {
          const firstIdx = text.search(/\n?\d+\.\s/);
          const preamble = firstIdx > 0 ? text.slice(0, firstIdx).trim() : '';
          return (
            <div>
              {preamble && <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>{preamble}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {numberedEntries.map((entry, i) => {
                  const clean = entry.replace(/^\d+\.\s*/, '').trim();
                  const nameMatch = clean.match(/^([^(:]+)[:(]/);
                  const name = nameMatch ? nameMatch[1].trim() : clean.split(':')[0];
                  const rest = nameMatch ? clean.slice(nameMatch[0].length - 1) : clean.slice(name.length);
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{name}</div>
                      <div style={{ color: 'var(--muted-foreground)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{rest.trim()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{text}</p>;
      }

      return <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', whiteSpace: 'pre-line' }}>{JSON.stringify(parsed, null, 2)}</p>;
    };

    const keyExecutivesText = profile.key_executives as string | undefined;
    const shareholdersText = profile.shareholders as string | undefined;
    const locationForRisk = profile.location || profile.address || null;
    const bvdIdForLocation = intlSearchResult?.identifier ?? null;

    return (
      <div style={{ maxWidth: '860px' }}>
        {searchBarEl}

        {/* Entity header */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginBottom: '4px', marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: ACCENT }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>{profile.name ?? intlDisplayName}</h2>
            {overallRating && (
              <span style={{
                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: themeRatingColor(overallRating),
                background: `${themeRatingColor(overallRating)}1a`,
                border: `1px solid ${themeRatingColor(overallRating)}55`,
                padding: '4px 14px', borderRadius: '999px',
              }}>
                Overall: {overallRating}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            {profile.national_identifier && <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>ID <span style={{ color: ACCENT }}>{profile.national_identifier}</span></span>}
            {profile.incorporation_date && <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>INC <span style={{ color: 'var(--foreground)' }}>{fmtDate(String(profile.incorporation_date))}</span></span>}
            {profile.legal_status && <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{profile.legal_status}</span>}
          </div>
          {profile.address && (
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              <Globe size={11} style={{ flexShrink: 0, marginTop: '2px' }} />{profile.address}
            </div>
          )}
          {(profile.revenue || profile.employee || profile.active_status || profile.website) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {profile.active_status && (() => {
                const isActive = /^active$/i.test(String(profile.active_status).trim());
                return (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isActive ? '#22c55e' : '#ef4444' }}>{String(profile.active_status)}</span>
                );
              })()}
              {[profile.revenue, profile.employee].filter(Boolean).map((v, i) => (
                <span key={i} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}>{String(v)}</span>
              ))}
              {profile.website && (
                <a href={String(profile.website)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                  Website<ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
          {/* Remaining profile fields — everything the API returned that
              isn't already shown above (name/address/national_identifier/
              incorporation_date/legal_status/active_status/revenue/
              employee/website), rendered generically so nothing is lost. */}
          {profileEntries.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: '11px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {profileEntries.map(([key, value]) => (
                <div key={key}>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{toLabel(key)}</div>
                  <div style={{ color: 'var(--foreground)', whiteSpace: 'pre-line' }}>{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tab switcher — always visible, matches domestic's tab card ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginTop: '12px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['generic', 'location360'] as const).map(key => (
              <button key={key} onClick={() => setIntlActiveTab(key)}
                style={{ padding: '12px 20px', fontSize: '12px', fontWeight: intlActiveTab === key ? 700 : 400, color: intlActiveTab === key ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'none', border: 'none', borderBottom: intlActiveTab === key ? `2px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {intlActiveTab === key && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT }} />}
                {key === 'generic' ? 'Generic Profiling' : 'Location Risk'}
              </button>
            ))}
          </div>

          {/* AI summary — powered by generate_orbis_ai_brief() on
              coe-ens-application-backend-orbis, mirroring domestic's own
              AI brief block below (same BriefOutput renderer, same
              RISK TIER / KEY RISK FLAGS / etc. section format). */}
          {intlActiveTab === 'generic' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#111' }}>AI</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>AI Risk Intelligence Brief</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Synthesised from profile + theme ratings + findings </div>
                  </div>
                </div>
                <button onClick={generateIntlBrief} disabled={intlBriefLoading || !intlEnsId}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '7px', background: intlBriefLoading ? 'rgba(255,230,0,0.4)' : ACCENT, color: '#111', border: 'none', cursor: intlBriefLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  {intlBriefLoading
                    ? <><Loader2 size={12} className="animate-spin" />Generating…</>
                    : <><RefreshCw size={12} />{intlBriefText ? 'Regenerate' : 'Generate Brief'}</>}
                </button>
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '5px', padding: '6px 10px', marginBottom: '12px' }}>
                Click &apos;Generate Brief&apos; to synthesise a structured risk assessment
                
              </div>
              {!intlBriefText && !intlBriefLoading && (
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}> Click to generate a summary of the findings. The Ai brief is generated on demand may take a few seconds to generate.</div>
              )}
              {intlBriefLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                  <Loader2 size={14} className="animate-spin" />Generating…
                </div>
              )}
              {intlBriefText && <BriefOutput text={intlBriefText} />}
            </div>
          )}

          {/* Location Risk tab — Location360Client is fully generic (just a
              location string + entity id), reused as-is. */}
          {intlActiveTab === 'location360' && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Location360</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Default: registered address · add more locations</div>
              </div>
              <Location360Client
                initialLocation={locationForRisk}
                initialLocations={intlSavedLocations}
                entityId={bvdIdForLocation}
                title="Location Risk"
                onLocationsChange={(locs) => {
                  setIntlSavedLocations(locs);
                  if (bvdIdForLocation) {
                    try { localStorage.setItem(`location360.saved.intl.${bvdIdForLocation}`, JSON.stringify(locs)); } catch { /* ignore */ }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* ══ Generic Profiling sections — everything stacked in one tab,
            mirroring domestic's own structure ══ */}
        {intlActiveTab === 'generic' && (
          <>
            {/* SECTION 01: RISK OVERVIEW — mirrors domestic's Financial
                Score + Key Risk Flags layout, but built entirely from real
                Orbis KPI data rather than Probe42's financial-ratio score
                (which Orbis has no equivalent of): a gauge+radar derived
                from the same theme ratings the old table showed, plus a
                Key Risk Flags box grid of specific atomic findings
                (sanctions hits, PEP matches, cyber rating, adverse media
                count, domain validation, a financial ratio) pulled
                straight from the per-KPI findings records — no invented
                numbers. */}
            <SectionHeader n="01" title="RISK OVERVIEW" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
              {/* Financial Score — same concept as domestic's card (gauge +
                  per-axis bars + radar), but built from Orbis's own real
                  financial ratios (compile_company_financials — the same
                  data Section 02 charts below), since Orbis has no
                  pre-computed 1-5 score the way Probe42 does. Each axis's
                  raw percentage/ratio is shown next to its bar so the
                  underlying real number is never hidden behind just a
                  bucketed 1-5 label. */}
              <Card title="Financial Score" icon={BarChart3} accent="rgba(255,230,0,0.4)">
                {(() => {
                  const latestOf = (key: string) => {
                    const data = financialsMap[key]?.data;
                    if (!Array.isArray(data) || data.length === 0) return null;
                    return [...data].sort((a: any, b: any) => (a.closing_date ?? '').localeCompare(b.closing_date ?? '')).slice(-1)[0];
                  };
                  const revenueSeries = Array.isArray(financialsMap['operating_revenue']?.data)
                    ? [...financialsMap['operating_revenue'].data].sort((a: any, b: any) => (a.closing_date ?? '').localeCompare(b.closing_date ?? ''))
                    : [];
                  const latestRev = revenueSeries.slice(-1)[0];
                  const prevRev = revenueSeries.slice(-2)[0];
                  const growthPct = (latestRev?.raw_value != null && prevRev?.raw_value)
                    ? ((latestRev.raw_value - prevRev.raw_value) / Math.abs(prevRev.raw_value)) * 100
                    : null;

                  const profitMargin  = latestOf('profit_margin');
                  const currentRatio  = latestOf('current_ratio');
                  const solvencyRatio = latestOf('solvency_ratio');
                  const roce          = latestOf('roce_before_tax');

                  // Standard finance rule-of-thumb thresholds — the raw
                  // percentage/ratio shown is always real; only this
                  // 1-5 bucket is a derived judgment call (Orbis doesn't
                  // supply a pre-scored equivalent to Probe42's).
                  const bucketPercent = (v: number) => (v < 0 ? 1 : v < 5 ? 2 : v < 10 ? 3 : v < 20 ? 4 : 5);
                  const bucketRatio   = (v: number) => (v < 1.0 ? 1 : v < 1.2 ? 2 : v < 1.5 ? 3 : v < 2.0 ? 4 : 5);

                  const axes = [
                    growthPct != null && { label: 'Growth', score: bucketPercent(growthPct), display: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%` },
                    profitMargin  && { label: 'Profitability', score: bucketPercent(profitMargin.raw_value), display: profitMargin.display_value },
                    currentRatio  && { label: 'Liquidity',     score: bucketRatio(currentRatio.raw_value),   display: currentRatio.display_value },
                    solvencyRatio && { label: 'Solvency',      score: bucketPercent(solvencyRatio.raw_value), display: solvencyRatio.display_value },
                    roce          && { label: 'Efficiency',    score: bucketPercent(roce.raw_value),          display: roce.display_value },
                  ].filter(Boolean) as { label: string; score: number; display: string }[];

                  if (axes.length === 0) {
                    return <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Financial score not available.</p>;
                  }

                  const overallScore = axes.reduce((sum, a) => sum + a.score, 0) / axes.length;
                  const roundedScore = Math.round(overallScore * 10) / 10;
                  const radarData = axes.map((a) => ({ subject: a.label, value: a.score }));

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `conic-gradient(${scoreTheme(roundedScore).color} ${(roundedScore / 5) * 360}deg, rgba(255,255,255,0.08) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '22px', fontWeight: 800, color: scoreTheme(roundedScore).color, lineHeight: 1 }}>{roundedScore}</span>
                            <span style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>out of 5</span>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {axes.map((a) => (
                            <ScoreBar key={a.label} label={`${a.label} (${a.display})`} score={a.score} />
                          ))}
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} />
                          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </Card>

              {/* Key Risk Flags — the report doc's exact 7 canonical Risk
                  Areas (Entity Existence, Sanctions, Anti-Bribery and
                  Anti-Corruption, Government Ownership and Political
                  Affiliations, Financial Indicators, Other Adverse Media,
                  Additional Indicators), not the 9 raw theme-rating keys
                  our backend returns and not atomic per-KPI findings.
                  Our backend splits Cyber and ESG out as their own theme
                  ratings, but the doc folds both (plus the generic
                  "additional_indicator") into one "Additional Indicators"
                  row — combined here via worst-case severity, not
                  averaging, so a single High anywhere in that group still
                  reads as High overall. */}
              <Card title="Key Risk Flags" icon={Shield} accent="rgba(239,68,68,0.4)">
                {(() => {
                  const severityRank = (rating?: string): number => {
                    const r = (rating ?? '').toLowerCase();
                    if (r.includes('high')) return 3;
                    if (r.includes('medium')) return 2;
                    if (r.includes('low')) return 1;
                    return 0; // No Alerts / unknown
                  };
                  const worstOf = (...vals: (string | undefined)[]): string | undefined => {
                    const present = vals.filter((v): v is string => v != null);
                    if (present.length === 0) return undefined;
                    return present.reduce((worst, v) => (severityRank(v) > severityRank(worst) ? v : worst));
                  };
                  const riskAreas: { label: string; rating?: string }[] = [
                    { label: 'Entity Existence', rating: ratings.entity_existence },
                    { label: 'Sanctions', rating: ratings.sanctions },
                    { label: 'Anti-Bribery and Anti-Corruption', rating: ratings.bribery_corruption_overall },
                    { label: 'Government Ownership and Political Affiliations', rating: ratings.government_political },
                    { label: 'Financial Indicators', rating: ratings.financials },
                    { label: 'Other Adverse Media', rating: ratings.other_adverse_media },
                    { label: 'Additional Indicators', rating: worstOf(ratings.additional_indicator, ratings.cyber, ratings.esg) },
                  ].filter((row) => row.rating != null);

                  if (riskAreas.length === 0) {
                    return <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No ratings available.</p>;
                  }
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}>Risk Area</th>
                          <th style={{ textAlign: 'center', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', width: '120px' }}>Risk Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskAreas.map(({ label, rating }) => {
                          const color = themeRatingColor(rating);
                          const textColor = color === '#eab308' ? '#111' : '#fff';
                          return (
                            <tr key={label}>
                              <td style={{ fontSize: '12px', color: 'var(--foreground)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{label}</td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ background: color, color: textColor, textAlign: 'center', fontSize: '11px', fontWeight: 700, borderRadius: '6px', padding: '5px 8px' }}>{String(rating)}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </Card>
            </div>

            {/* SECTION 02: FINANCIAL PERFORMANCE — one combined multi-line
                chart per category (was one small single-line chart per
                metric, which meant Operating Revenue, EBITDA, Cash Flow,
                PL Before/After Tax each got their own 2-column card even
                though they share the same date axis and are directly
                comparable). Metrics with zero data points are filtered out
                upstream (financialsByCategory), so every category here has
                something real to plot — categories/metrics are still fully
                schema-driven, nothing hardcoded to Toyota or any entity. */}
            {financialCategories.length > 0 && (
              <>
                <SectionHeader n="02" title="FINANCIAL PERFORMANCE" />
                {financialCategories.map((cat) => {
                  const catIcon = /ratio/i.test(cat) ? BarChart3 : /balance/i.test(cat) ? Landmark : Banknote;
                  const isRatioCategory = /ratio/i.test(cat);
                  const LINE_COLORS = [ACCENT, '#60a5fa', '#f472b6', '#34d399', '#f97316', '#a78bfa', '#22d3ee'];
                  const metrics = financialsByCategory[cat].map((metric) => ({
                    ...metric,
                    title: metric.title ?? toLabel(metric.key),
                    series: [...(metric.data ?? [])]
                      .sort((a: any, b: any) => (a.closing_date ?? '').localeCompare(b.closing_date ?? ''))
                      .map((d: any) => ({ date: (d.closing_date ?? '').slice(0, 10), value: d.raw_value, display: d.display_value })),
                  }));
                  const metricByTitle = Object.fromEntries(metrics.map((m) => [m.title, m]));

                  // Merge every metric's series onto one shared date axis.
                  const allDates = Array.from(new Set(metrics.flatMap((m) => m.series.map((p: any) => p.date)))).sort();
                  const chartData = allDates.map((date) => {
                    const row: Record<string, any> = { date };
                    metrics.forEach((m) => {
                      const point = m.series.find((p: any) => p.date === date);
                      if (point) {
                        row[m.key] = point.value;
                        row[`${m.key}__display`] = point.display;
                      }
                    });
                    return row;
                  });
                  const maxPoints = Math.max(0, ...metrics.map((m) => m.series.length));

                  // A single linear axis squashes small series flat next to
                  // a much bigger one (e.g. Operating Revenue vs. EBITDA) —
                  // split onto two axes when the latest values are more
                  // than ~4x apart, grouped around their geometric mean.
                  const latestAbs: Record<string, number> = Object.fromEntries(
                    metrics.map((m): [string, number] => [m.key, Math.abs(m.series[m.series.length - 1]?.value ?? 0)]),
                  );
                  const nonZero = Object.values(latestAbs).filter((v) => v > 0);
                  const spread = nonZero.length > 1 ? Math.max(...nonZero) / Math.min(...nonZero) : 1;
                  const useDualAxis = metrics.length > 1 && spread > 4;
                  const splitThreshold = useDualAxis ? Math.sqrt(Math.max(...nonZero) * Math.min(...nonZero)) : 0;
                  const axisForMetric = (key: string) => (useDualAxis && latestAbs[key] < splitThreshold ? 'right' : 'left');
                  const axisFormatter = (v: number) => (isRatioCategory ? `${v.toFixed(1)}%` : fmtCompactUSD(v));

                  return (
                    <div key={cat} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{cat}</div>
                      <Card icon={catIcon} accent="rgba(255,230,0,0.4)">
                        {/* Latest-value chips — keeps the at-a-glance big
                            number for each metric even though the chart
                            below is now shared. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginBottom: '14px' }}>
                          {metrics.map((m, i) => {
                            const latest = m.series[m.series.length - 1];
                            const color = LINE_COLORS[i % LINE_COLORS.length];
                            return (
                              <div key={m.key}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '9px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.title}</span>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color }}>{latest?.display ?? '—'}</div>
                              </div>
                            );
                          })}
                        </div>

                        {maxPoints > 1 ? (
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 4, right: useDualAxis ? 4 : 12, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={axisFormatter} width={52} />
                              {useDualAxis && (
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={axisFormatter} width={52} />
                              )}
                              <Tooltip
                                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }}
                                formatter={(value: any, name: any, p: any) => {
                                  const m = metricByTitle[name as string];
                                  return [m ? p?.payload?.[`${m.key}__display`] ?? value : value, name];
                                }}
                              />
                              {metrics.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
                              {metrics.map((m, i) => (
                                <Line
                                  key={m.key}
                                  yAxisId={axisForMetric(m.key)}
                                  dataKey={m.key}
                                  name={m.title}
                                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                  dot={{ r: 2 }}
                                  strokeWidth={2}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Not enough historical data points for a trend chart.</p>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </>
            )}

            {/* SECTION 04: BOARD, SHAREHOLDERS & OWNERSHIP */}
            {(keyExecutivesText || shareholdersText) && (
              <>
                <SectionHeader n="03" title="BOARD, SHAREHOLDERS & OWNERSHIP" />
                {keyExecutivesText && (() => {
                  // key_executives arrives as one text blob, not a structured
                  // list — try splitting on blank lines into individual
                  // entries (matches real observed format: "Name (Role)\n\n
                  // Next entry..."); falls back to one plain-text card if it
                  // doesn't look like a list.
                  const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
                  const entries = keyExecutivesText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
                  // Trailing "& 141 more key executives" / "& 5 previous key
                  // executives" summary lines aren't a real person — giving
                  // them a fake avatar with "&1" initials reads as broken,
                  // so render those as a plain note spanning both columns.
                  const MORE_NOTE = /^&\s*\d+\s+(more|previous|additional)/i;
                  if (entries.length > 1) {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: shareholdersText ? '12px' : 0, maxHeight: '420px', overflowY: 'auto', paddingRight: '2px' }}>
                        {entries.map((entry, i) => {
                          if (MORE_NOTE.test(entry)) {
                            return (
                              <div key={i} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '10px', fontSize: '11px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                {entry.trim()}
                              </div>
                            );
                          }
                          const nameMatch = entry.match(/^([^(\n]+)\(?([^)]*)\)?/);
                          const name = (nameMatch?.[1] ?? entry.split('\n')[0]).trim();
                          const role = nameMatch?.[2]?.trim();
                          const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                          return (
                            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${color}33`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{initials || '—'}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                {role && <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{role}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <Card title="Key Executives" icon={Users} accent="rgba(255,230,0,0.4)">
                      <p style={{ fontSize: '12px', color: 'var(--foreground)', whiteSpace: 'pre-line', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', margin: 0 }}>{keyExecutivesText}</p>
                    </Card>
                  );
                })()}
                {shareholdersText && (
                  <Card title="Shareholders" icon={Landmark} accent="rgba(255,230,0,0.4)">
                    <p style={{ fontSize: '12px', color: 'var(--foreground)', whiteSpace: 'pre-line', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', margin: 0 }}>{shareholdersText}</p>
                  </Card>
                )}
              </>
            )}

            {/* SECTIONS 05+: one per findings theme key the API returned, in
                the order it returned them — not a hardcoded local list */}
            {findingsThemeKeys.map((key, idx) => {
              const label = toLabel(key);
              const rating = ratings?.[key];
              const rawItems: any[] = findings?.[key] ?? [];
              // The "financials" theme's FIN-coded items (FIN1A/FIN2A, etc.)
              // are a coarser, pre-rounded text summary of the exact same
              // external_supplier_data columns Section 02's combined chart
              // already plots (verified against real data: e.g. FIN1A's
              // "125M" vs the chart's $125.45M — same row, same year). Once
              // Section 02 has that category, showing it again here as
              // single-line mini-charts is pure duplication — drop just the
              // FIN-coded items, keeping anything else this theme carries
              // (e.g. BKR bankruptcy findings share the "financials" theme
              // but aren't covered by Section 02 at all).
              const isFinancialsTheme = /financial/i.test(key);
              const dedupeFin = isFinancialsTheme && financialCategories.length > 0;
              const items = dedupeFin
                ? rawItems.filter((it) => !String(it?.kpi_area ?? it?.kpi_code ?? '').toUpperCase().startsWith('FIN'))
                : rawItems;
              const dedupedAway = dedupeFin && items.length === 0 && rawItems.length > 0;
              const Icon = themeIcon(key);
              return (
                <div key={key}>
                  <SectionHeader n={String(idx + 4).padStart(2, '0')} title={label.toUpperCase()} />
                  {/* Location photos live alongside entity-existence findings,
                      same placement as domestic's Section 08 — sourced from
                      google_image_name (now included in the findings
                      response after the graph.py fix), not part of the
                      per-KPI findings list itself. */}
                  {key === 'entity_existence' && (intlImagesLoading || intlImages.length > 0) && (
                    <div style={{ marginBottom: '12px' }}>
                      <Card title="Entity Location Images" icon={Building2} accent="rgba(255,230,0,0.4)">
                        {intlImagesLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                            <Loader2 size={14} className="animate-spin" />Loading images…
                          </div>
                        ) : (
                          // A single image fills the full card width as a
                          // banner; two or more lay out as fixed-width
                          // thumbnail tiles instead of stretching (with
                          // only 1-2 images, `repeat(N, 1fr)` used to blow
                          // each one up to a wide, oversized banner).
                          intlImages.length === 1 ? (
                            <img src={`data:${intlImages[0].content_type ?? 'image/jpeg'};base64,${intlImages[0].data}`} alt={intlImages[0].filename}
                              style={{ width: '100%', height: '360px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', display: 'block' }} />
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                              {intlImages.map((img, i) => (
                                <img key={i} src={`data:${img.content_type ?? 'image/jpeg'};base64,${img.data}`} alt={img.filename}
                                  style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                              ))}
                            </div>
                          )
                        )}
                      </Card>
                    </div>
                  )}
                  {items.length === 0 ? (
                    <Card title={label} icon={Icon}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <AlertTriangle size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                          {dedupedAway
                            ? 'Trend detail for this theme is shown in the Financial Performance section above.'
                            : `No flagged findings${rating ? ` — theme rating: ${rating}` : ''}.`}
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {items.map((item: any, i: number) => {
                        const color = themeRatingColor(item.kpi_rating);
                        return (
                          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                            {item.kpi_rating && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                              <Icon size={13} style={{ color: '#ca8a04', flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)', flex: 1 }}>{cleanFindingText(String(item.kpi_definition ?? item.kpi_code ?? ''))}</span>
                              {item.kpi_rating && (
                                <span style={{ fontSize: '10px', fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}55`, padding: '1px 8px', borderRadius: '999px', flexShrink: 0 }}>{item.kpi_rating}</span>
                              )}
                            </div>
                            {/* Findings vary wildly in length — a long news
                                excerpt or PEP list used to stretch the card
                                (and the whole grid row) to match; capping
                                height and scrolling internally keeps every
                                card in the grid a predictable size. */}
                            <div style={{ padding: '14px 16px', maxHeight: '300px', overflowY: 'auto' }}>
                              {renderKpiDetails(item.kpi_details)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {intlEnsId && (
              <div style={{ marginTop: '16px' }}>
                <DownloadDropdown
                  sessionId={intlSessionId ?? ''}
                  ensId={intlEnsId}
                  fileName={profile.name ?? intlDisplayName ?? 'report'}
                  variant="outline"
                  showLabel={true}
                  screeningType="international"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── No data yet ─────────────────────────────────────────────────────────────
  if (!reportData && !isLoading && !error) {
    return (
      <div style={{ maxWidth: '860px' }}>
        <div style={{ textAlign: 'center', paddingTop: '24px', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '14px', margin: '0 auto 18px', background: 'rgba(255,230,0,0.1)', border: '1px solid rgba(255,230,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={24} style={{ color: ACCENT }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>Entity Analysis</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.65, maxWidth: '420px', margin: '0 auto' }}>
            Search any company or LLP for a full intelligence dossier — financials, ratios, risk flags, and procurement analytics.
          </p>
        </div>
        <SearchBar nameQuery={nameQuery} handleNameInput={handleNameInput} sugLoading={sugLoading} suggestions={suggestions} showDrop={showDrop} pickSuggestion={pickSuggestion} inputRef={inputRef} dropRef={dropRef} searchMode={searchMode} onSearchModeChange={setSearchMode} />
      </div>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading || isEnsLoading) {
    return (
      <div style={{ maxWidth: '860px' }}>
        <SearchBar nameQuery={nameQuery} handleNameInput={handleNameInput} sugLoading={sugLoading} suggestions={suggestions} showDrop={showDrop} pickSuggestion={pickSuggestion} inputRef={inputRef} dropRef={dropRef} searchMode={searchMode} onSearchModeChange={setSearchMode} />
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: ACCENT }} />
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Fetching intelligence for <strong style={{ color: 'var(--foreground)' }}>{name}</strong>…</p>
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ maxWidth: '860px' }}>
        <SearchBar nameQuery={nameQuery} handleNameInput={handleNameInput} sugLoading={sugLoading} suggestions={suggestions} showDrop={showDrop} pickSuggestion={pickSuggestion} inputRef={inputRef} dropRef={dropRef} searchMode={searchMode} onSearchModeChange={setSearchMode} />
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '14px 18px', color: '#ef4444', fontSize: '13px', marginTop: '16px' }}>{error}</div>
      </div>
    );
  }

  // ─── Full report ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '860px' }}>
      <SearchBar nameQuery={nameQuery} handleNameInput={handleNameInput} sugLoading={sugLoading} suggestions={suggestions} showDrop={showDrop} pickSuggestion={pickSuggestion} inputRef={inputRef} dropRef={dropRef} searchMode={searchMode} onSearchModeChange={setSearchMode} />

      {/* ── Entity header ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginBottom: '4px', marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: ACCENT }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>{name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              {co.cin && <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>{isLLP ? 'LLPIN' : 'CIN'} <span style={{ color: ACCENT }}>{co.cin}</span></span>}
              {co.pan && <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>PAN <span style={{ color: 'var(--foreground)' }}>{co.pan}</span></span>}
              {co.incorporation_date && <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>INC <span style={{ color: 'var(--foreground)' }}>{fmtDate(co.incorporation_date)}</span></span>}
            </div>
            {co.registered_address?.full_address && (
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                <Globe size={11} style={{ flexShrink: 0, marginTop: '2px' }} />{co.registered_address.full_address}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            {co.efiling_status && <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>{co.efiling_status}</span>}
            {co.active_compliance && <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', fontWeight: 500 }}>{co.active_compliance} compliant</span>}
            {co.classification && <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{co.classification}</span>}
            {co.website && <a href={co.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: ACCENT, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>Website<ExternalLink size={10} /></a>}
          </div>
        </div>
        {ki.revenue && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {ki.revenue && <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}>Revenue: {ki.revenue}</span>}
            {ki.employee_count && <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}>Employees: {ki.employee_count}</span>}
            {d.filing_dates?.aoc_4 && <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}>AOC-4: {fmtDate(d.filing_dates.aoc_4.filing_date)}</span>}
            {d.filing_dates?.mgt_7 && <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}>MGT-7: {fmtDate(d.filing_dates.mgt_7.filing_date)}</span>}
          </div>
        )}
      </div>

      {/* Description */}
      {d.description?.desc_thousand_char && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 18px', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.7, margin: '8px 0' }}>
          {d.description.desc_thousand_char}
        </div>
      )}

      {/* ── Tab switcher — always visible ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginTop: '12px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['generic', 'procurement', 'location360'] as const).map(key => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: '12px 20px', fontSize: '12px', fontWeight: activeTab === key ? 700 : 400, color: activeTab === key ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'none', border: 'none', borderBottom: activeTab === key ? `2px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeTab === key && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT }} />}
              {key === 'generic' ? 'Generic Profiling' : key === 'procurement' ? 'Procurement / SCM' : 'Location Risk'}
            </button>
          ))}
        </div>

        {/* ── Generic AI brief (inside tab card, only on generic tab) ── */}
        {activeTab === 'generic' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#111' }}>AI</span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>AI Risk Intelligence Brief</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Synthesised from computed display values · Claude Sonnet</div>
                </div>
              </div>
              <button onClick={() => generateBrief('generic')} disabled={briefLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '7px', background: briefLoading ? 'rgba(255,230,0,0.4)' : ACCENT, color: '#111', border: 'none', cursor: briefLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}>
                {briefLoading
                  ? <><Loader2 size={12} className="animate-spin" />Generating…</>
                  : <><RefreshCw size={12} />{genericBriefText ? 'Regenerate' : 'Generate Brief'}</>}
              </button>
            </div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '5px', padding: '6px 10px', marginBottom: '12px' }}>
              Extraction: Sends probe_financial_scores + risk_flags + credit_ratings + legal_counts + charges + MSME + GST summary (~300 tokens). Full JSON not sent.
            </div>
            {!genericBriefText && !briefLoading && (
              <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>// Click &apos;Generate Brief&apos; to synthesise a structured risk assessment</div>
            )}
            {briefLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                <Loader2 size={14} className="animate-spin" />Generating…
              </div>
            )}
            {genericBriefText && <BriefOutput text={genericBriefText} />}
          </div>
        )}

        {/* ── Procurement tab placeholder inside card ── */}
        {activeTab === 'procurement' && (
          <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
            Scroll down to see Vendor Tier Recommendation, ITC Risk, Payment Terms, and more.
          </div>
        )}

        {/* ── Location360 tab content ── */}
        {activeTab === 'location360' && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Location360</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Default: head office · add more locations</div>
            </div>
            <Location360Client
              initialLocation={defaultLocation}
              initialLocations={savedLocations}
              entityId={lastIdentifier}
              title="Location Risk"
              onLocationsChange={(locs) => {
                setSavedLocations(locs);
                try { localStorage.setItem(`location360.saved.${lastIdentifier}`, JSON.stringify(locs)); } catch { /* ignore */ }
              }}
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          GENERIC PROFILING SECTIONS (01–07)
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'generic' && (
        <>
          {/* SECTION 01: RISK OVERVIEW */}
          <SectionHeader n="01" title="RISK OVERVIEW" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Financial score */}
            <Card title="Financial Score" icon={BarChart3} accent="rgba(255,230,0,0.4)">
              {pfs ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `conic-gradient(${scoreTheme(pfs.overall_financial_score).color} ${(pfs.overall_financial_score / 5) * 360}deg, rgba(255,255,255,0.08) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: scoreTheme(pfs.overall_financial_score).color, lineHeight: 1 }}>{pfs.overall_financial_score}</span>
                        <span style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>out of 5</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {[['Growth', pfs.growth_score], ['Profitability', pfs.profitability_score], ['Liquidity', pfs.liquidity_score], ['Solvency', pfs.solvency_score], ['Efficiency', pfs.efficiency_score]].map(([l, s]) => (
                        <ScoreBar key={l as string} label={l as string} score={s as number} />
                      ))}
                    </div>
                  </div>
                  {radarData.length > 0 && (
                    <ResponsiveContainer width="100%" height={160}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} />
                        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </>
              ) : <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Financial score not available.</p>}
            </Card>

            {/* Key risk flags */}
            <Card title="Key Risk Flags" icon={Shield} accent="rgba(239,68,68,0.4)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'PENDING CASES',    value: ki.pending_cases_filed_against_this_corporate ? 'YES' : 'NO', level: ki.pending_cases_filed_against_this_corporate ? 'red' : 'green' },
                  { label: 'BUREAU DEFAULTS',  value: ki.bureau_defaults ? 'YES' : 'NO', level: ki.bureau_defaults ? 'red' : 'green' },
                  { label: 'GST FILING DELAY', value: ki.gst_filing_delay ? 'DELAYED' : 'ON TIME', level: ki.gst_filing_delay ? 'amber' : 'green' },
                  { label: 'EPF DELAY',        value: ki.epf_payment_delay ? 'YES' : 'NO', level: ki.epf_payment_delay ? 'amber' : 'green' },
                  { label: 'OPEN CHARGES',     value: String(charges.length || 0), level: charges.length > 5 ? 'amber' : 'gray' },
                  { label: 'REVENUE SCALE',    value: ki.revenue ?? '—', level: 'gray' },
                ].map(({ label, value, level }) => {
                  const bgMap:    Record<string, string> = { red: 'rgba(239,68,68,0.1)', amber: 'rgba(234,179,8,0.1)', green: 'rgba(34,197,94,0.08)', gray: 'rgba(255,255,255,0.05)' };
                  const borderMap: Record<string, string> = { red: 'rgba(239,68,68,0.3)', amber: 'rgba(234,179,8,0.3)', green: 'rgba(34,197,94,0.2)', gray: 'rgba(255,255,255,0.1)' };
                  const colorMap:  Record<string, string> = { red: '#ef4444', amber: '#eab308', green: '#22c55e', gray: 'var(--muted-foreground)' };
                  return (
                    <div key={label} style={{ background: bgMap[level], border: `1px solid ${borderMap[level]}`, borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: colorMap[level] }}>{value}</div>
                    </div>
                  );
                })}
              </div>
              {(Array.isArray(d.legal_history) ? d.legal_history.length : (d.legal_history ?? 0)) > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={12} style={{ flexShrink: 0 }} /><strong style={{ color: 'var(--foreground)' }}>{Array.isArray(d.legal_history) ? d.legal_history.length : d.legal_history}</strong> total cases in legal history
                </div>
              )}
              {charges.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={12} style={{ flexShrink: 0 }} /><strong style={{ color: 'var(--foreground)' }}>{charges.length} open charges</strong> · Total {fmtCr(co.sum_of_charges)}
                </div>
              )}
            </Card>
          </div>

          {/* SECTION 02: FINANCIAL PERFORMANCE */}
          {lat && (
            <>
              <SectionHeader n="02" title="FINANCIAL PERFORMANCE" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Revenue Growth', value: fmtPct(lat.ratios?.revenue_growth), peer: peer?.median_revenue_growth, color: (lat.ratios?.revenue_growth ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Net Margin',     value: fmtPct(lat.ratios?.net_margin),     peer: peer?.median_net_margin,     color: '#60a5fa' },
                  { label: 'EBITDA Margin',  value: fmtPct(lat.ratios?.ebitda_margin),  peer: peer?.median_ebitda_margin,  color: '#f97316' },
                  { label: 'Return on Equity', value: fmtPct(lat.ratios?.return_on_equity), peer: peer?.median_return_on_equity, color: '#a78bfa' },
                ].map(({ label, value, peer: p, color }) => (
                  <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1, marginBottom: '6px' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: p != null ? '4px' : '0' }}>{label}</div>
                    {p != null && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>peer: {fmtPct(p)}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card title="Ratio Trend" icon={TrendingUp}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={ratioTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line dataKey="EBITDA Margin %" stroke="#f97316" dot={{ r: 3 }} strokeWidth={2} />
                      <Line dataKey="Net Margin %"    stroke="#60a5fa" dot={{ r: 3 }} strokeWidth={2} />
                      <Line dataKey="Rev Growth %"    stroke="#f59e0b" dot={{ r: 3 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Ratio History · Standalone" icon={BarChart3}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Year', 'Rev Gw%', 'Net Mg%', 'EBITDA%', 'RoE%', 'D/E'].map(h => (
                          <th key={h} style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '10px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(standalone.length ? standalone : fin)
                        .sort((a: any, b: any) => a.year?.localeCompare(b.year))
                        .slice(-5)
                        .map((f: any, i: number) => {
                          const r = f.ratios ?? {};
                          return (
                            <tr key={`${f.year}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: f.year === lat?.year ? 700 : 400 }}>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--foreground)' }}>{f.year?.slice(0, 4)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: (r.revenue_growth ?? 0) >= 0 ? '#f97316' : '#ef4444' }}>{r.revenue_growth?.toFixed(1) ?? '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--foreground)' }}>{r.net_margin?.toFixed(1) ?? '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: (r.ebitda_margin ?? 0) > 15 ? '#f97316' : 'var(--foreground)' }}>{r.ebitda_margin?.toFixed(1) ?? '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--foreground)' }}>{r.return_on_equity?.toFixed(1) ?? '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--foreground)' }}>{r.debt_by_equity?.toFixed(2) ?? '—'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </Card>
              </div>
            </>
          )}

          {/* SECTION 03: DEBT EXPOSURE */}
          {charges.length > 0 && (
            <>
              <SectionHeader n="03" title="DEBT EXPOSURE & CHARGES" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                <Card title={`Open Charges · ${charges.length} Active`} icon={CreditCard}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Charge Holder', 'Type', 'Date', 'Amount (Cr)', 'Rate'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '10px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {charges.slice(0, 8).map((c: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '7px 8px', color: 'var(--foreground)' }}>{c.holder_name ?? '—'}</td>
                          <td style={{ padding: '7px 8px' }}>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: c.type?.toLowerCase() === 'creation' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: c.type?.toLowerCase() === 'creation' ? '#22c55e' : '#eab308', fontWeight: 600 }}>{c.type}</span>
                          </td>
                          <td style={{ padding: '7px 8px', color: 'var(--muted-foreground)' }}>{fmtDate(c.date)}</td>
                          <td style={{ padding: '7px 8px', color: 'var(--foreground)', fontFamily: 'monospace' }}>{fmtCr(c.amount)}</td>
                          <td style={{ padding: '7px 8px', color: 'var(--muted-foreground)' }}>{c.rate_of_interest ?? '—'}</td>
                        </tr>
                      ))}
                      {charges.length > 8 && <tr><td colSpan={5} style={{ padding: '8px', color: 'var(--muted-foreground)', fontSize: '11px' }}>+ {charges.length - 8} more charges</td></tr>}
                    </tbody>
                  </table>
                </Card>
                <Card title="Concentration" icon={AlertTriangle}>
                  <div style={{ textAlign: 'center', padding: '8px 0', minWidth: '180px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
                      {co.sum_of_charges && charges[0]?.amount ? `${(charges[0].amount / co.sum_of_charges * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>held by {charges[0]?.holder_name ?? '—'}</div>
                    {[{ l: 'Open charges', v: charges.length }, { l: 'Sum ALL charges', v: fmtCr(co.sum_of_charges) }].map(({ l, v }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>{l}</span><span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* SECTION 04: LEGAL RISK */}
          <SectionHeader n="04" title="LEGAL RISK" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Card title="Case Volume" icon={Scale}>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--foreground)' }}>{Array.isArray(d.legal_history) ? d.legal_history.length : (d.legal_history ?? 0)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Total legal history</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>{d.legal_cases_of_financial_disputes?.payable?.length ?? 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Financial disputes</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Cases against corp.</span>
                <span style={{ color: ki.pending_cases_filed_against_this_corporate ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{ki.pending_cases_filed_against_this_corporate ? 'ACTIVE (pending)' : 'None on record'}</span>
              </div>
              <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Bureau defaults</span>
                <span style={{ color: ki.bureau_defaults ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{ki.bureau_defaults ? 'YES' : 'NO'}</span>
              </div>
            </Card>
            <Card title="Financial Dispute Cases" icon={Banknote}>
              {(d.legal_cases_of_financial_disputes?.payable?.length ?? 0) === 0
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '13px' }}><CheckCircle2 size={16} />No financial disputes on record</div>
                : <div>{d.legal_cases_of_financial_disputes.payable.slice(0, 4).map((c: any, i: number) => <div key={i} style={{ fontSize: '11px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>{c.court} · {c.case_no}</div>)}</div>}
            </Card>
          </div>

          {/* SECTION 05: GST & MSME */}
          <SectionHeader n="05" title="COMPLIANCE · GST & MSME" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Card title={`GST Registration Health · ${gst.length} Registrations`} icon={Shield}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '11px' }}>
                {[{ c: '#22c55e', l: 'On Time' }, { c: '#ef4444', l: 'Delayed' }, { c: 'rgba(255,255,255,0.25)', l: 'No Data' }].map(({ c, l }) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--muted-foreground)' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
                {gst.map((g: any, i: number) => {
                  const onTime = g.filing_timeliness?.toLowerCase().includes('time');
                  const noData = !g.filing_timeliness;
                  const dotColor = noData ? 'rgba(255,255,255,0.25)' : onTime ? '#22c55e' : '#ef4444';
                  const bg = noData ? 'rgba(255,255,255,0.03)' : onTime ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                  return (
                    <div key={i} style={{ background: bg, borderRadius: '6px', padding: '5px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '3px' }}>{g.state?.slice(0, 2)?.toUpperCase() ?? '—'}</div>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, margin: '0 auto' }} />
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="MSME Payment Delays" icon={Activity}>
              {d.msme_supplier_payment_delays?.delays_for_period ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: ACCENT }}>
                      ₹{((d.msme_supplier_payment_delays.delays_for_period.total_amount_due_for_period ?? 0) / 1e5).toFixed(1)}L
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                      Current period · {d.msme_supplier_payment_delays.delays_for_period.latest_period} · {d.msme_supplier_payment_delays.delays_for_period.delays?.length ?? 0} suppliers
                    </div>
                  </div>
                  {d.msme_supplier_payment_delays.trend?.slice(-4).map((t: any, i: number, arr: any[]) => {
                    const max = Math.max(...arr.map((x: any) => x.amount));
                    return (
                      <div key={i} style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted-foreground)', marginBottom: '3px' }}>
                          <span>{t.period}</span><span>₹{(t.amount / 1e5).toFixed(1)}L</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: ACCENT, borderRadius: '3px', width: `${(t.amount / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No MSME delay data available.</p>}
            </Card>
          </div>

          {/* SECTION 06: CREDIT RATINGS */}
          {(d.credit_ratings?.length > 0) && (
            <>
              <SectionHeader n="06" title="CREDIT RATINGS" />
              <Card title="" icon={undefined}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Agency', 'Rating', 'Outlook', 'Action', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.credit_ratings.map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--muted-foreground)' }}>{r.credit_rating_agency ?? r.agency ?? '—'}</td>
                        <td style={{ padding: '7px 10px' }}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontWeight: 600 }}>{r.rating ?? '—'}</span></td>
                        <td style={{ padding: '7px 10px', color: 'var(--muted-foreground)' }}>{r.outlook ?? '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--muted-foreground)' }}>{r.rating_action ?? '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--muted-foreground)' }}>{fmtDate(r.rating_date ?? r.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {/* SECTION 07: BOARD */}
          {dirs.length > 0 && (
            <>
              <SectionHeader n="07" title={`BOARD & SIGNATORIES · ${dirs.length} TOTAL`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
                {dirs.filter((dir: any) => !dir.date_of_cessation).slice(0, 12).map((dir: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `hsl(${i * 40},40%,30%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: ACCENT }}>
                      {initials(dir.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)' }}>{dir.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{dir.designation ?? ''}{dir.age ? ` · Age ${dir.age}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              SECTIONS 08-12: ENS SCREENING DATA
              Source: apiService.getEntityFindings(ensId)
              Response shape: { findings: { entity_existence, legal, financials, adverse_media, cyber_esg }, ratings, metadata }
          ══════════════════════════════════════════════════════ */}

          {/* ════ SECTION 08: ENTITY EXISTENCE VALIDATION ════ */}
          {/* ADD1A=Address  B2B1A=IndiaMart  DOM1A=Domain — only present when screened */}
          <SectionHeader n="08" title="ENTITY EXISTENCE VALIDATION" />
          {/* Entity Location Image — from google_image_name via /universe/get-image */}
          {(entityImages.length > 0 || entityImageLoading) && (
              <div style={{ marginBottom: '12px' }}>
                <Card title="Entity Location Images" icon={Building2} accent="rgba(255,230,0,0.35)">
                  {entityImageLoading ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        color: 'var(--muted-foreground)', fontSize: '12px'
                      }}>
                        <Loader2 size={14} className="animate-spin" style={{ color: ACCENT }} />
                        Loading entity images…
                      </div>
                  ) : entityImages.length === 1 ? (
                      // A single image fills the full card width as a banner.
                      <div>
                        <img
                            src={`data:image/jpeg;base64,${entityImages[0].data}`}
                            alt={entityImages[0].filename}
                            style={{ width: '100%', height: '360px', borderRadius: '8px', display: 'block', objectFit: 'cover', marginBottom: '6px' }}
                        />
                        <div style={{
                          fontSize: '10px', color: 'var(--muted-foreground)',
                          fontFamily: 'monospace', textAlign: 'center',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {entityImages[0].filename}
                        </div>
                      </div>
                  ) : entityImages.length > 0 ? (
                      // Two or more lay out as fixed-width thumbnail tiles.
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {entityImages.map((img, idx) => (
                          <div key={idx}>
                            <img
                                src={`data:image/jpeg;base64,${img.data}`}
                                alt={img.filename}
                                style={{
                                  width: '140px',
                                  height: '140px',
                                  borderRadius: '8px',
                                  display: 'block',
                                  objectFit: 'cover',
                                  marginBottom: '6px'
                                }}
                            />
                            <div style={{
                              fontSize: '10px', color: 'var(--muted-foreground)',
                              fontFamily: 'monospace', textAlign: 'center',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {img.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                  ) : null}
                </Card>
              </div>
          )}
          {(() => {
            const add  = getKpi(existenceData, 'ADD1A');
            const b2b  = getKpi(existenceData, 'B2B1A');
            const dom  = getKpi(existenceData, 'DOM1A');
          
            const hasAny = add || b2b || dom;

            const parseDetails = (kpi: any): any[] => {
              if (!kpi) return [];
              let raw = kpi.kpi_details ?? kpi.kpi_value ?? '';
              if (typeof raw !== 'string') return Array.isArray(raw) ? raw : [];
              try { raw = JSON.parse(raw); } catch { return []; }
              return Array.isArray(raw) ? raw : [raw];
            };
            const fv = (row: any) => ({ f: row.factor ?? row.Factor ?? row.Parameter ?? '', v: row.value ?? row.Value ?? '' });
            const ratingColor = (r?: string) =>
              r === 'Low' ? '#22c55e' : r === 'Medium' ? '#eab308' : r === 'High' ? '#ef4444' : 'var(--muted-foreground)';
            const ratingBg = (r?: string) =>
              r === 'Low' ? 'rgba(34,197,94,0.1)' : r === 'Medium' ? 'rgba(234,179,8,0.1)' : r === 'High' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)';

            if (!hasAny) return (
              <Card title="Entity Existence" icon={Building2}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Building2 size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '3px' }}>No entity existence data — company not yet screened.</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Select from Vendor Intelligence overview to load ENS results.</div>
                  </div>
                </div>
              </Card>
            );

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>

                {/* ADD1A — Google Address Validation */}
                {add && (() => {
                  const rows = parseDetails(add);
                  const address = rows.find(r => (r.factor ?? r.Factor) === 'Address')?.value ?? '';
                  const zone    = rows.find(r => (r.factor ?? r.Factor) === 'Zone')?.value ?? '';
                  const reason  = rows.find(r => (r.factor ?? r.Factor) === 'Reason')?.value ?? '';
                  return (
                    <Card title="Google Address Validation" icon={Globe} accent={ratingBg(add.kpi_rating).replace('0.1', '0.5')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ADD1A</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: '4px', background: ratingBg(add.kpi_rating), color: ratingColor(add.kpi_rating) }}>{add.kpi_rating}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--foreground)', marginBottom: '8px', lineHeight: 1.5 }}>{address}</div>
                      {zone && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Zone</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: zone === 'Commercial' ? '#22c55e' : zone === 'Residential' ? '#f59e0b' : '#60a5fa' }}>{zone}</span>
                        </div>
                      )}
                      {reason && <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.5, margin: 0, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>{reason}</p>}
                    </Card>
                  );
                })()}

                {/* B2B1A — IndiaMart Validation */}
                {b2b && (() => {
                  const rows = parseDetails(b2b);
                  const url  = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase() === 'url')?.value ?? '';
                  const gstMatch = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase().includes('gst match'))?.value;
                  const score    = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase().includes('match score'))?.value;
                  const city     = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase() === 'city')?.value ?? '';
                  const state    = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase() === 'state')?.value ?? '';
                  const since    = rows.find(r => (r.factor ?? r.Factor)?.toLowerCase().includes('member'))?.value ?? '';
                  return (
                    <Card title="IndiaMart B2B Validation" icon={Globe} accent={ratingBg(b2b.kpi_rating).replace('0.1', '0.5')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>B2B1A</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: '4px', background: ratingBg(b2b.kpi_rating), color: ratingColor(b2b.kpi_rating) }}>{b2b.kpi_rating}</span>
                      </div>
                      {url && <a href={String(url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#FFE600', wordBreak: 'break-all', display: 'block', marginBottom: '10px', textDecoration: 'none' }}>{String(url)}</a>}
                      {[
                        { l: 'Location', v: [city, state].filter(Boolean).join(', ') || '—' },
                        { l: 'GST Match', v: gstMatch === true || gstMatch === 'true' ? '✓ Matched' : '✗ No match' },
                        { l: 'Match Score', v: score != null ? `${score}%` : '—' },
                        { l: 'Member Since', v: since ? new Date(String(since)).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : '—' },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted-foreground)' }}>{l}</span>
                          <span style={{ color: l === 'GST Match' ? (v.startsWith('✓') ? '#22c55e' : '#ef4444') : 'var(--foreground)', fontWeight: l === 'Match Score' ? 600 : 400 }}>{v}</span>
                        </div>
                      ))}
                    </Card>
                  );
                })()}

                {/* DOM1A — Domain Validation */}
                {dom && (() => {
                  const rows = parseDetails(dom);
                  const get = (label: string) => rows.find(r => (r.Factor ?? r.factor ?? r.Parameter ?? '').toLowerCase().includes(label.toLowerCase()))?.Value ?? rows.find(r => (r.Factor ?? r.factor ?? r.Parameter ?? '').toLowerCase().includes(label.toLowerCase()))?.value ?? '';
                  const domainName = String(get('domain name'));
                  const created    = String(get('creation'));
                  const expires    = String(get('expiration'));
                  const emails     = String(get('email'));
                  const registrar  = String(get('registrar') || '').split('\n')[0];
                  return (
                    <Card title="Domain Validation" icon={Globe} accent={ratingBg(dom.kpi_rating).replace('0.1', '0.5')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DOM1A</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: '4px', background: ratingBg(dom.kpi_rating), color: ratingColor(dom.kpi_rating) }}>{dom.kpi_rating}</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa', marginBottom: '12px', fontFamily: 'monospace' }}>{domainName || '—'}</div>
                      {[
                        { l: 'Created',    v: created   || '—' },
                        { l: 'Expires',    v: expires   || '—' },
                        { l: 'Registrar',  v: registrar ? registrar.slice(0, 40) + (registrar.length > 40 ? '…' : '') : '—' },
                        { l: 'Email',      v: emails ? emails.split(',')[0].trim().slice(0, 36) + '…' : '—' },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted-foreground)' }}>{l}</span>
                          <span style={{ color: 'var(--foreground)', fontFamily: l === 'Email' ? 'monospace' : undefined }}>{v}</span>
                        </div>
                      ))}
                    </Card>
                  );
                })()}
              </div>
            );
          })()}

          {/* ════ SECTION 09: SANCTIONS & SCREENING ════ */}
          {/* LEG3A=Company sanctions  LEG3B=Employee/Director sanctions */}
          <SectionHeader n="09" title="SANCTIONS & SCREENING" />
          {(() => {
            const s3a = getKpi(legalData, 'LEG3A');
            const s3b = getKpi(legalData, 'LEG3B');
            const parseSanctions = (kpi: any) => {
              if (!kpi) return null;
              let d = kpi.kpi_details ?? '';
              if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return null; } }
              return d;
            };
            const co  = parseSanctions(s3a);
            const emp = parseSanctions(s3b);

            if (!s3a && !s3b) return (
              <Card title="Sanctions Screening" icon={AlertTriangle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <AlertTriangle size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No sanctions data — company not yet screened.</div>
                </div>
              </Card>
            );

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* LEG3A — Company sanctions */}
                {s3a && (
                  <Card title="Company Sanctions (LEG3A)" icon={AlertTriangle} accent={co?.isMatch ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.4)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ padding: '4px 14px', borderRadius: '999px', fontWeight: 800, fontSize: '13px', background: co?.isMatch ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: co?.isMatch ? '#ef4444' : '#22c55e' }}>
                        {co?.isMatch ? '⚠ MATCH FOUND' : '✓ CLEAR'}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{s3a.kpi_rating} risk</span>
                    </div>
                    {co?.topics?.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Topics</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {(co.topics as string[]).map((t: string) => (
                            <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, textTransform: 'capitalize' }}>{t.replace(/\./g, ' ')}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {[
                      { l: 'First Seen',   v: co?.first_seen?.slice(0, 10) ?? '—' },
                      { l: 'Last Seen',    v: co?.last_seen?.slice(0, 10)  ?? '—' },
                      { l: 'Last Change',  v: co?.last_change?.slice(0, 10) ?? '—' },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>{l}</span><span style={{ color: 'var(--foreground)' }}>{v}</span>
                      </div>
                    ))}
                    {(() => {
                      // Try multiple possible property names for URLs
                      const urls = co?.sourceUrl || co?.source_url || co?.sourceUrls || co?.urls || [];
                      const urlArray = Array.isArray(urls) ? urls : typeof urls === 'string' ? [urls] : [];
                      return urlArray?.length > 0 ? (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Source URLs</div>
                          {urlArray.slice(0, 3).map((url: string, i: number) => {
                            let host = url; try { host = new URL(url).hostname; } catch {}
                            return <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '11px', color: '#FFE600', textDecoration: 'none', marginBottom: '3px' }}>{host}</a>;
                          })}
                        </div>
                      ) : null;
                    })()}
                  </Card>
                )}

                {/* LEG3B — Employee/Director sanctions */}
                {s3b && Array.isArray(emp) && (
                  <Card title="Director Sanctions (LEG3B)" icon={AlertTriangle} accent="rgba(239,68,68,0.4)">
                    {(emp as any[]).length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} />No director sanctions found</div>
                    ) : (
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {['Director', 'Match', 'Datasets', 'Topics', 'Last Seen'].map(h => <th key={h} style={{ textAlign: 'left', padding: '5px 6px', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '10px' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{(emp as any[]).map((s: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '7px 6px', color: 'var(--foreground)', fontWeight: 600 }}>{s.director ?? '—'}</td>
                            <td style={{ padding: '7px 6px', color: '#f59e0b' }}>{s.matchName ?? '—'}</td>
                            <td style={{ padding: '7px 6px', color: 'var(--muted-foreground)', fontSize: '10px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.datasets ?? '—'}</td>
                            <td style={{ padding: '7px 6px' }}><span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{s.topics ?? '—'}</span></td>
                            <td style={{ padding: '7px 6px', color: 'var(--muted-foreground)' }}>{s.last_seen?.slice(0, 10) ?? '—'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </Card>
                )}
              </div>
            );
          })()}

          {/* ════ SECTION 10: CYBER RISK ════ */}
          {/* CYB1A — factor/value pairs, isPass=NO/PASS/CLEAR, isFail=YES/FAIL/HIGH/ACTIVE */}
          <SectionHeader n="10" title="CYBER & DOMAIN RISK" />
          {(() => {
            const cyb = getKpi(cyberData, 'CYB1A');
            if (!cyb) return (
              <Card title="Cyber Risk Validation" icon={Shield}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Shield size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No cyber screening data — company not yet screened.</div>
                </div>
              </Card>
            );
            let items: any[] = [];
            try { const d = cyb.kpi_details; items = typeof d === 'string' ? JSON.parse(d) : d; } catch {}
            const resolvedIP = items.find((i: any) => i.factor?.toLowerCase().includes('resolved ip'))?.value ?? null;
            const threats    = items.filter((i: any) => !i.factor?.toLowerCase().includes('resolved ip') && !i.factor?.toLowerCase().includes('overall'));
            const overall    = items.find((i: any) => i.factor?.toLowerCase().includes('overall'));
            return (
              <Card title="Cyber Risk Validation (CYB1A)" icon={Shield} accent={cyb.kpi_rating === 'Low' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.5)'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: cyb.kpi_rating === 'Low' ? '#22c55e' : '#ef4444' }}>{cyb.kpi_rating}</span>
                    {overall && <span style={{ fontSize: '11px', color: overall.value === 'NO' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>Overall: {overall.value}</span>}
                  </div>
                  {resolvedIP && <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(96,165,250,0.08)', padding: '3px 10px', borderRadius: '6px' }}>IP: {resolvedIP}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: '8px' }}>
                  {threats.map((item: any, i: number) => {
                    const isPass = ['NO', 'PASS', 'CLEAR'].includes(String(item.value ?? '').toUpperCase());
                    const isFail = ['YES', 'FAIL', 'HIGH', 'ACTIVE'].includes(String(item.value ?? '').toUpperCase());
                    const color  = isFail ? '#ef4444' : isPass ? '#22c55e' : 'var(--foreground)';
                    const bg     = isFail ? 'rgba(239,68,68,0.08)' : isPass ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.04)';
                    return (
                      <div key={i} style={{ background: bg, border: `1px solid ${isFail ? 'rgba(239,68,68,0.2)' : isPass ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.factor}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}

          {/* ════ SECTION 11: FINANCIAL RISK INTELLIGENCE ════ */}
          {/* FSTB9A=Z-Altman  FSTB13A=EPFO */}
          <SectionHeader n="11" title="FINANCIAL RISK INTELLIGENCE" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Z-Altman */}
            {(() => {
              const kpi = getKpi(finData, 'FSTB9A');
              if (!kpi) return (
                <Card title="Altman Z-Score (FSTB9A)" icon={TrendingUp}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <TrendingUp size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No Z-Altman data available.</div>
                  </div>
                </Card>
              );
              let scores: any[] = [];
              try { const d = kpi.kpi_details; scores = typeof d === 'string' ? JSON.parse(d) : d; } catch {}
              // [{"parameter": "Altman Z Score (trading)", "calculation": -3.01}, {"parameter": "Altman Z Score (manufacturing)", "calculation": 0.59}]
              const zoneLabel = (s: number) => s >= 2.99 ? 'Safe Zone' : s >= 1.81 ? 'Grey Zone' : 'Distress Zone';
              const zoneColor = (s: number) => s >= 2.99 ? '#22c55e' : s >= 1.81 ? '#eab308' : '#ef4444';
              return (
                <Card title="Altman Z-Score Analysis (FSTB9A)" icon={TrendingUp} accent={scores[0] ? zoneColor(scores[0].calculation) + '66' : undefined}>
                  {scores.map((s: any, i: number) => {
                    const score = s.calculation ?? s.value ?? null;
                    const label = s.parameter ?? s.factor ?? `Score ${i+1}`;
                    const color = score != null ? zoneColor(score) : '#6b7280';
                    const zone  = score != null ? zoneLabel(score) : 'Unknown';
                    return (
                      <div key={i} style={{ textAlign: 'center', padding: i > 0 ? '16px 0 0' : '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '6px', textTransform: 'capitalize' }}>{label}</div>
                        <div style={{ fontSize: '42px', fontWeight: 800, color, lineHeight: 1, fontFamily: 'monospace', marginBottom: '4px' }}>{score != null ? score.toFixed(2) : '—'}</div>
                        <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 12px', borderRadius: '999px', background: color + '20', color }}>{zone}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '10px', color: 'var(--muted-foreground)', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#ef4444', fontWeight: 700 }}>{'< 1.81'}</div><div>Distress</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#eab308', fontWeight: 700 }}>1.81–2.99</div><div>Grey Zone</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 700 }}>{'> 2.99'}</div><div>Safe Zone</div></div>
                  </div>
                </Card>
              );
            })()}

            {/* EPFO */}
            {(() => {
              const kpi = getKpi(finData, 'FSTB13A');
              if (!kpi) return (
                <Card title="EPFO Registration (FSTB13A)" icon={FileText}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <FileText size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No EPFO data available.</div>
                  </div>
                </Card>
              );
              let rows: any[] = [];
              try { const d = kpi.kpi_details; rows = typeof d === 'string' ? JSON.parse(d) : d; } catch {}
              // [{Parameter: "...", Value: "..."}, ...]
              const SHOW = ['Establishment Name','Working Status','No Of Employees','Latest Wage Month','Payment Timeliness','Principal Business Activities','City','Establishment Id'];
              const filtered = rows.filter((r: any) => SHOW.includes(r.Parameter));
              return (
                <Card title="EPFO Registration (FSTB13A)" icon={FileText}>
                  {filtered.map((r: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--muted-foreground)' }}>{r.Parameter}</span>
                      <span style={{
                        textAlign: 'right', maxWidth: '55%',
                        color: r.Parameter === 'Payment Timeliness' && String(r.Value ?? '').toLowerCase().includes('after') ? '#f59e0b' :
                               r.Parameter === 'Working Status' && String(r.Value ?? '').toLowerCase().includes('live') ? '#22c55e' : 'var(--foreground)',
                        fontWeight: ['Payment Timeliness','Working Status'].includes(r.Parameter) ? 600 : 400,
                      }}>{String(r.Value ?? '—')}</span>
                    </div>
                  ))}
                </Card>
              );
            })()}
          </div>

          {/* ════ SECTION 12: ADVERSE MEDIA & REPUTATION ════ */}
          {/* NWS2A=Google Rating (text format)  NWS1A=Google News */}
          <SectionHeader n="12" title="ADVERSE MEDIA & REPUTATION" />
          {(() => {
            const nws2 = getKpi(mediaData, 'NWS2A');
            const nws1 = getKpi(mediaData, 'NWS1A');
            if (!nws2 && !nws1) return (
              <Card title="Adverse Media" icon={Globe}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Globe size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>No adverse media data — company not yet screened.</div>
                </div>
              </Card>
            );

            // Parse NWS2A plain text: "Name: X\nRating: 3.9\nNumber of Reviews: 14\n\nReviews:\n\t1. Name: Y | Rating: 1\n..."
            const parseGoogleRating = (rawText: string) => {
              const lines = rawText.split('\n');
              const get = (prefix: string) => lines.find(l => l.startsWith(prefix))?.replace(prefix, '').trim() ?? '';
              const name    = get('Name: ');
              const rating  = parseFloat(get('Rating: ') || '0');
              const reviews = parseInt(get('Number of Reviews: ') || '0', 10);
              const reviewStart = lines.findIndex(l => l.trim().startsWith('Reviews:'));
              const reviewLines: Array<{name:string;rating:number;text:string}> = [];
              if (reviewStart !== -1) {
                let current: {name:string;rating:number;text:string}|null = null;
                for (const line of lines.slice(reviewStart + 1)) {
                  const m = line.match(/^\s+\d+\.\s+Name:\s+(.+?)\s+\|\s+Rating:\s+(\d)/);
                  if (m) {
                    if (current) reviewLines.push(current);
                    current = { name: m[1], rating: parseInt(m[2], 10), text: '' };
                  } else if (current && line.trim()) {
                    current.text += (current.text ? ' ' : '') + line.trim();
                  }
                }
                if (current) reviewLines.push(current);
              }
              return { name, rating, reviews, reviewLines };
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: nws1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                {nws2 && (() => {
                  const raw = typeof nws2.kpi_details === 'string' ? nws2.kpi_details : '';
                  const { name, rating, reviews, reviewLines } = parseGoogleRating(raw);
                  const rColor = rating >= 4 ? '#22c55e' : rating >= 3 ? '#f59e0b' : '#ef4444';
                  return (
                    <Card title="Google Rating Validation (NWS2A)" icon={Globe} accent={rColor + '55'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '44px', fontWeight: 800, color: rColor, lineHeight: 1, fontFamily: 'monospace' }}>{rating.toFixed(1)}</div>
                          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} style={{ fontSize: '16px', color: i < Math.round(rating) ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>★</span>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '3px' }}>{reviews} reviews</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>{name}</div>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', background: nws2.kpi_rating === 'Low' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', color: nws2.kpi_rating === 'Low' ? '#22c55e' : '#eab308' }}>{nws2.kpi_rating} Risk</span>
                        </div>
                      </div>
                      {reviewLines.length > 0 && (
                        <>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Recent Reviews</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {reviewLines.slice(0, 5).map((r, i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground)' }}>{r.name}</span>
                                  <span style={{ fontSize: '11px', color: r.rating >= 4 ? '#22c55e' : r.rating >= 3 ? '#f59e0b' : '#ef4444' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                                </div>
                                {r.text && <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.text}</p>}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </Card>
                  );
                })()}

                {nws1 && (() => {
                  let articles: any[] = [];
                  try { const d = nws1.kpi_details; articles = typeof d === 'string' ? JSON.parse(d) : d; } catch {}
                  return (
                    <Card title="Google News (NWS1A)" icon={FileText} accent="rgba(96,165,250,0.4)">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{articles.length} articles found</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '4px', background: nws1.kpi_rating === 'Low' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: nws1.kpi_rating === 'Low' ? '#22c55e' : '#ef4444' }}>{nws1.kpi_rating}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                        {articles.slice(0, 8).map((a: any, i: number) => (
                          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--foreground)', fontWeight: 500, marginBottom: '3px', lineHeight: 1.4 }}>{a.title ?? a.headline ?? a.text?.slice(0, 100) ?? '—'}</div>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--muted-foreground)' }}>
                              {a.source && <span>{a.source}</span>}
                              {a.date && <span>{a.date}</span>}
                              {a.sentiment && <span style={{ color: a.sentiment === 'negative' ? '#ef4444' : a.sentiment === 'positive' ? '#22c55e' : '#eab308' }}>{a.sentiment}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}
              </div>
            );
          })()}

        </>
      )}

      {/* ══════════════════════════════════════════════════════
          PROCUREMENT / SCM SECTIONS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'procurement' && reportData && tier && (
        <>
          <SectionHeader n="P1" title="VENDOR TIER RECOMMENDATION" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Tier card */}
            <Card title="Vendor Tier Recommendation" icon={Shield}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {TIERS.map(t => {
                  const active = t === tier.tier;
                  return (
                    <div key={t} style={{ flex: 1, padding: '4px 0', borderRadius: '4px', background: active ? `${tierColors[t]}22` : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${tierColors[t]}66` : '1px solid transparent', textAlign: 'center', fontSize: '8px', color: active ? tierColors[t] : 'var(--muted-foreground)', fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>
                      {t.slice(0, 4)}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: tierColors[tier.tier], marginBottom: '4px' }}>{tier.tier}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>{tier.signals}</div>
              {tier.conditions.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: '6px' }}>Conditions to Proceed</div>
                  {tier.conditions.map((c, i) => (
                    <div key={i} style={{ fontSize: '11px', color: 'var(--foreground)', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ color: ACCENT, flexShrink: 0 }}>›</span>{c}
                    </div>
                  ))}
                </>
              )}
            </Card>

            {/* ITC risk card */}
            {itcRisk && (
              <Card title="ITC / GST Risk Assessment" icon={Shield}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: { LOW: '#22c55e', MODERATE: '#eab308', HIGH: '#ef4444' }[itcRisk.level], marginBottom: '4px' }}>{itcRisk.level}</div>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{itcRisk.delayed}</div><div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Delayed GSTINs</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--muted-foreground)' }}>{itcRisk.noData}</div><div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>No Data</div></div>
                  </div>
                  <div style={{ height: '6px', background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)', borderRadius: '3px', position: 'relative', marginBottom: '4px' }}>
                    <div style={{ position: 'absolute', top: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: 'white', border: '2px solid #333', transform: 'translateX(-50%)', left: `${itcRisk.meter}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}><span>LOW</span><span>MODERATE</span><span>HIGH</span></div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>{itcRisk.impact}</div>
                <div style={{ fontSize: '12px', color: 'var(--foreground)', marginTop: '8px' }}>GSTINs on time: <strong>{itcRisk.onTime} / {itcRisk.total}</strong></div>
              </Card>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Payment terms */}
            {pymtTerms && (
              <Card title="Payment Terms Advisory" icon={CreditCard}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Contract Value (₹ Cr)</label>
                  <input type="number" value={cvCr || ''} onChange={e => setCvCr(Number(e.target.value))} placeholder="e.g. 50"
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '0 10px' }} />
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '4px' }}>Recommended Payment Terms</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: ACCENT, fontFamily: 'monospace' }}>{pymtTerms.terms}</div>
                </div>
                {[
                  { l: 'Current Ratio',   v: pymtTerms.cr != null ? `${pymtTerms.cr.toFixed(2)}x` : '—' },
                  { l: 'Quick Ratio',     v: pymtTerms.qr != null ? `${pymtTerms.qr.toFixed(2)}x` : '—' },
                  { l: 'Credit Rating',   v: pymtTerms.rating ?? '—' },
                  { l: 'BG / LC Required?', v: pymtTerms.bgRequired ? 'Recommended' : 'Optional' },
                ].map(({ l, v }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>{l}</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--foreground)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {pymtTerms.reasons.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--muted-foreground)', padding: '4px 0', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ color: ACCENT, flexShrink: 0 }}>›</span>{r}
                  </div>
                ))}
              </Card>
            )}

            {/* Continuity */}
            {continuity && (
              <Card title="Supplier Continuity Risk" icon={Activity}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: continuity.filter(s => s.status === 'Risk').length > 1 ? '#ef4444' : continuity.filter(s => s.status === 'Watch').length > 2 ? '#eab308' : '#22c55e', marginBottom: '3px' }}>
                    {continuity.filter(s => s.status === 'Risk').length > 1 ? 'HIGH' : continuity.filter(s => s.status === 'Watch').length > 2 ? 'MODERATE' : 'LOW'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{duration}-month horizon</div>
                </div>
                {continuity.map(s => <StatusRow key={s.label} {...s} />)}
              </Card>
            )}
          </div>

          {/* Safeguards */}
          <SectionHeader n="P2" title="CONTRACT SAFEGUARD CLAUSE RECOMMENDATIONS" />
          <Card title="" icon={undefined}>
            {safeguards?.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '3px' }}>{s.clause}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{s.detail}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 10px', borderRadius: '4px', fontWeight: 700, flexShrink: 0, background: PRIORITY_COLORS[s.priority], border: `1px solid ${PRIORITY_BORDER[s.priority]}`, color: PRIORITY_TEXT[s.priority] }}>{s.priority}</span>
              </div>
            ))}
          </Card>

          {/* Procurement AI brief */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#111' }}>AI</span>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>Procurement-Specific AI Brief</div>
                <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Context-aware · Payload includes vendor signals + your procurement parameters</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {[
                { label: 'Category', el: (
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '0 8px' }}>
                    {['Raw Materials / APIs', 'Excipients', 'Packaging', 'Solvents & Reagents', 'Contract Manufacturing', 'IT Services', 'Facility & Maintenance', 'Logistics & Freight', 'Capital Equipment', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                )},
                { label: 'Contract Value (₹ Cr)', el: (
                  <input type="number" value={cvCr || ''} onChange={e => setCvCr(Number(e.target.value))} placeholder="e.g. 50"
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '0 10px' }} />
                )},
                { label: 'Duration (months)', el: (
                  <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '0 10px' }} />
                )},
                { label: 'Sourcing Strategy', el: (
                  <select value={sourcing} onChange={e => setSourcing(e.target.value)}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '0 8px' }}>
                    {['Single source', 'Dual source', 'Multi-source', 'Strategic partnership'].map(o => <option key={o}>{o}</option>)}
                  </select>
                )},
              ].map(({ label, el }) => (
                <div key={label}>
                  <label style={{ fontSize: '10px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
            <button onClick={() => generateBrief('procurement')} disabled={briefLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '7px', background: briefLoading ? 'rgba(255,230,0,0.5)' : ACCENT, color: '#111', border: 'none', cursor: briefLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
              {briefLoading
                ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                : <><span>⚡</span>{procBriefText ? 'Regenerate' : 'Generate'}</>}
            </button>
            {briefLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)', fontSize: '12px', marginBottom: '8px' }}>
                <Loader2 size={13} className="animate-spin" />Generating…
              </div>
            )}
            {procBriefText && <BriefOutput text={procBriefText} />}
          </div>
        </>
      )}
    </div>
  );
}