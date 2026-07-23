import { RiskTier } from '@/components/shared/risk-badge';
import { CcmParameterType } from '@/components/continuous-monitoring/parameter-badge';

export type { RiskTier };

export interface Vendor {
  id: string;
  name: string;
  industry: string;
  country: string;
  currentTier: RiskTier;
  trend: 'up' | 'down' | 'flat';
  lastEventDate: string;
  scenario: string;
}

export interface RiskSnapshot {
  vendorId: string;
  quarter: string; // e.g. "Q2 2025"
  tier: RiskTier;
  signals: string[];
}

export type AlertStatus = 'OPEN' | 'UNDER_REVIEW' | 'PENDING_REVIEW' | 'CLOSED';

export interface AlertEvent {
  id: string;
  vendorId: string;
  vendorName: string;
  source: CcmParameterType;
  severity: RiskTier;
  title: string;
  description: string;
  timestamp: string; // ISO
  status: AlertStatus;
  assignedTo: string;
}

export interface ActionTrackerItem {
  id: string;
  alertId: string;
  action: string;
  assignedTo: string;
  dueDate: string; // ISO date
  status: 'IN_PROGRESS' | 'PENDING' | 'COMPLETED';
}

export interface EscalationStage {
  level: number;
  label: string;
  slaLabel: string;
  slaTier: 'ON_TIME' | 'AT_RISK' | 'BREACHED';
}

export interface MonitoringReportRow {
  parameter: CcmParameterType;
  alertsRaised: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskTrendPoint {
  month: string; // e.g. "Jun 2025"
  score: number; // 0-100
}
