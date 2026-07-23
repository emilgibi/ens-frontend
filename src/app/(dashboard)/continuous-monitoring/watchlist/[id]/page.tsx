import { notFound } from 'next/navigation';
import Link from 'next/link';
import { vendors } from '@/data/ccm-dummy/vendors';
import { riskHistory } from '@/data/ccm-dummy/risk-history';
import { seedAlerts } from '@/data/ccm-dummy/alerts';
import RiskTimeline from '@/components/continuous-monitoring/risk-timeline';
import RiskGauge from '@/components/continuous-monitoring/risk-gauge';
import RiskTrendChart from '@/components/continuous-monitoring/risk-trend-chart';
import AlertFeed from '@/components/continuous-monitoring/alert-feed';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { vendorRiskScore, monthlyRiskTrend, monthlyPortfolioTrend } from '@/lib/ccm-metrics';

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = vendors.find((v) => v.id === id);
  if (!vendor) notFound();

  const snapshots = riskHistory.filter((s) => s.vendorId === id);
  const alerts = seedAlerts.filter((a) => a.vendorId === id);
  const score = vendorRiskScore(vendor);
  const trend = monthlyRiskTrend(vendor);
  const portfolioTrend = monthlyPortfolioTrend(vendors);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/continuous-monitoring/watchlist"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Watchlist
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold mb-1">{vendor.name}</h1>
          <p className="text-muted-foreground">{vendor.industry} · {vendor.country}</p>
        </div>
        <RiskBadge tier={vendor.currentTier} />
      </div>

      <p className="text-sm text-muted-foreground italic">{vendor.scenario}</p>

      <Separator className="my-1" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center border rounded-xl p-6 bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-3">Current Risk Score</p>
          <RiskGauge score={score} tier={vendor.currentTier} size={140} />
        </div>
        <div className="lg:col-span-2">
          <RiskTrendChart data={trend} alerts={alerts} portfolioTrend={portfolioTrend} />
        </div>
      </div>

      <RiskTimeline snapshots={snapshots} />
      <AlertFeed alerts={alerts} title="Vendor Alert History" />
    </div>
  );
}
