'use client';

import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/shared/stat-card';
import { AlertTriangle, ShieldAlert, FolderOpen, CheckCircle2, Clock } from 'lucide-react';
import { useAlertSimulator } from '@/lib/alert-simulator';
import { vendors } from '@/data/ccm-dummy/vendors';
import { actionTrackerItems } from '@/data/ccm-dummy/action-tracker';
import { alertSummary, parameterBreakdown, parameterTrend, monitoringReportRows, portfolioRiskScore, scoreToTier } from '@/lib/ccm-metrics';
import VendorTable from '@/components/continuous-monitoring/vendor-table';
import AlertTable from '@/components/continuous-monitoring/alert-table';
import RiskGauge from '@/components/continuous-monitoring/risk-gauge';
import ParameterDonut from '@/components/continuous-monitoring/parameter-donut';
import ParameterTrendBars from '@/components/continuous-monitoring/parameter-trend-bars';
import ActionTracker from '@/components/continuous-monitoring/action-tracker';
import EscalationMatrix from '@/components/continuous-monitoring/escalation-matrix';
import MonitoringReport from '@/components/continuous-monitoring/monitoring-report';

export default function ContinuousMonitoringOverviewPage() {
  const alerts = useAlertSimulator();
  const summary = alertSummary(alerts);
  const slices = parameterBreakdown(alerts);
  const trendRows = parameterTrend(alerts);
  const reportRows = monitoringReportRows(alerts);
  const portfolioScore = portfolioRiskScore(vendors);
  const portfolioTier = scoreToTier(portfolioScore);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Continuous Control Monitoring</h1>
        <p className="text-muted-foreground">
          Unified view of vendors, monitoring status, and risk alerts across news, sanctions, and legal databases.
        </p>
      </div>

      <Separator className="my-1" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="High Risk Alerts" value={summary.highRisk} icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard title="Medium Risk Alerts" value={summary.mediumRisk} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard title="Open Alerts" value={summary.open} icon={<FolderOpen className="h-4 w-4" />} />
        <StatCard title="Closed Alerts" value={summary.closed} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard title="Pending Review" value={summary.pendingReview} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        <div className="flex flex-col items-center justify-center border rounded-xl p-6 bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-3">Portfolio Risk Score</p>
          <RiskGauge score={portfolioScore} tier={portfolioTier} size={150} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Average across {vendors.length} monitored vendors
          </p>
        </div>
        <div className="lg:col-span-2">
          <ParameterDonut slices={slices} />
        </div>
      </div>

      <ParameterTrendBars rows={trendRows} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VendorTable vendors={vendors} />
        <MonitoringReport rows={reportRows} />
      </div>

      <AlertTable alerts={alerts} limit={8} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActionTracker items={actionTrackerItems} />
        <EscalationMatrix />
      </div>
    </div>
  );
}
