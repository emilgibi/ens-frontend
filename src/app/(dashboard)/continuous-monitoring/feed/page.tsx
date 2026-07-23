'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlertSimulator } from '@/lib/alert-simulator';
import AlertFeed from '@/components/continuous-monitoring/alert-feed';
import { CcmParameterType } from '@/components/continuous-monitoring/parameter-badge';

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'LITIGATION', label: 'Litigation' },
  { value: 'SANCTIONS', label: 'Sanctions' },
  { value: 'NEGATIVE_MEDIA', label: 'Negative Media' },
  { value: 'GST_COMPLIANCE', label: 'GST Compliance' },
  { value: 'CYBER_RISK', label: 'Cyber Risk' },
  { value: 'FINANCIAL_DISTRESS', label: 'Financial Distress' },
];

export default function ContinuousMonitoringFeedPage() {
  const alerts = useAlertSimulator();
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? alerts : alerts.filter((a) => a.source === (tab as CcmParameterType));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Real-Time Alerts & Updates</h1>
        <p className="text-muted-foreground">
          Live feed of adverse events detected across litigation, sanctions, negative media, GST compliance,
          cyber risk, and financial distress parameters.
        </p>
      </div>
      <Separator className="my-1" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <AlertFeed alerts={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
