import { RiskTier } from '@/components/shared/risk-badge';
import { CcmParameterType } from '@/components/continuous-monitoring/parameter-badge';
import { AlertEvent, MonitoringReportRow, RiskTrendPoint, Vendor } from '@/types/ccm';

export const TIER_SCORE: Record<RiskTier, number> = {
  LOW: 20,
  MODERATE: 45,
  HIGH: 72,
  CRITICAL: 92,
};

export function vendorRiskScore(vendor: Vendor): number {
  return TIER_SCORE[vendor.currentTier];
}

export function portfolioRiskScore(vendors: Vendor[]): number {
  if (vendors.length === 0) return 0;
  const total = vendors.reduce((sum, v) => sum + vendorRiskScore(v), 0);
  return Math.round(total / vendors.length);
}

export function scoreToTier(score: number): RiskTier {
  if (score < 30) return 'LOW';
  if (score < 55) return 'MODERATE';
  if (score < 80) return 'HIGH';
  return 'CRITICAL';
}

export interface AlertSummary {
  highRisk: number;
  mediumRisk: number;
  open: number;
  closed: number;
  pendingReview: number;
  total: number;
}

export function alertSummary(alerts: AlertEvent[]): AlertSummary {
  return {
    highRisk: alerts.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
    mediumRisk: alerts.filter((a) => a.severity === 'MODERATE').length,
    open: alerts.filter((a) => a.status === 'OPEN').length,
    closed: alerts.filter((a) => a.status === 'CLOSED').length,
    pendingReview: alerts.filter((a) => a.status === 'PENDING_REVIEW' || a.status === 'UNDER_REVIEW').length,
    total: alerts.length,
  };
}

export interface ParameterSlice {
  source: CcmParameterType;
  count: number;
  percent: number;
}

const ALL_SOURCES: CcmParameterType[] = [
  'LITIGATION',
  'SANCTIONS',
  'NEGATIVE_MEDIA',
  'GST_COMPLIANCE',
  'CYBER_RISK',
  'FINANCIAL_DISTRESS',
];

export function parameterBreakdown(alerts: AlertEvent[]): ParameterSlice[] {
  const total = alerts.length || 1;
  return ALL_SOURCES.map((source) => {
    const count = alerts.filter((a) => a.source === source).length;
    return { source, count, percent: Math.round((count / total) * 100) };
  });
}

export function monitoringReportRows(alerts: AlertEvent[]): MonitoringReportRow[] {
  return ALL_SOURCES.map((source) => {
    const sourceAlerts = alerts.filter((a) => a.source === source);
    return {
      parameter: source,
      alertsRaised: sourceAlerts.length,
      high: sourceAlerts.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
      medium: sourceAlerts.filter((a) => a.severity === 'MODERATE').length,
      low: sourceAlerts.filter((a) => a.severity === 'LOW').length,
    };
  });
}

// Deterministic pseudo-random walk for a 12-month trend, seeded by vendor id
// so the same vendor always produces the same chart (no backend, no real history).
function seededFraction(input: string, salt: number): number {
  let hash = 0;
  const str = input + salt;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

export function monthlyRiskTrend(vendor: Vendor): RiskTrendPoint[] {
  const target = vendorRiskScore(vendor);
  const start = Math.max(10, target - 35);

  return MONTHS.map((month, idx) => {
    const progress = idx / (MONTHS.length - 1);
    const base = start + (target - start) * progress;
    const noise = (seededFraction(vendor.id, idx) - 0.5) * 14;
    const score = Math.max(5, Math.min(98, Math.round(base + noise)));
    return { month, score };
  });
}

// Average trend across all vendors, month by month - used as a comparison
// line so a single vendor's trajectory can be read against the portfolio.
export function monthlyPortfolioTrend(vendors: Vendor[]): RiskTrendPoint[] {
  if (vendors.length === 0) return MONTHS.map((month) => ({ month, score: 0 }));
  const perVendor = vendors.map((v) => monthlyRiskTrend(v));

  return MONTHS.map((month, idx) => {
    const avg = perVendor.reduce((sum, trend) => sum + trend[idx].score, 0) / perVendor.length;
    return { month, score: Math.round(avg) };
  });
}

export interface ParameterTrendRow {
  source: CcmParameterType;
  count: number;
  previousCount: number;
  delta: number;
}

// Deterministic "previous period" count per parameter, so the delta arrow
// is stable across reloads instead of flickering randomly (no backend history yet).
export function parameterTrend(alerts: AlertEvent[]): ParameterTrendRow[] {
  return ALL_SOURCES.map((source) => {
    const count = alerts.filter((a) => a.source === source).length;
    const swing = Math.round((seededFraction(source, count) - 0.5) * 6); // -3..+3
    const previousCount = Math.max(0, count - swing);
    return { source, count, previousCount, delta: count - previousCount };
  });
}
