import PeriodicMonitoringConfiguration from '@/components/periodic-monitoring/configuration';
import {
  getAssociatedEntitiesCount,
  getGroupConfig,
} from '@/actions/periodic-monitoring';

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const config = await getGroupConfig(groupId);
  const count = await getAssociatedEntitiesCount(groupId);

  return (
    <PeriodicMonitoringConfiguration
      config={config}
      groupId={groupId}
      count={count}
    />
  );
}
