'use client';

import { Suspense } from 'react';
import { Building2, Calendar, Clock, Edit, Download } from 'lucide-react';
import { PeriodicMonitoringInfo } from '@/components/shared/periodic-monitoring-info';
import RatingCard from '@/components/entity-universe/rating-card-3';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import PeriodicMonitoringResultTable from '@/components/periodic-monitoring/result-table';
import { usePeriodicGroupKpis, useGroupBulkDownload } from '@/hooks/use-api';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ToastMessage } from '@/components/shared/toast-message';
import { formatDateToUserTimezone } from '@/lib/utils';

function ResultsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = searchParams.get('groupId');
  const { data: kpiData, isLoading } = usePeriodicGroupKpis(groupId as string);
  const { mutate: download, isPending: isDownloading } = useGroupBulkDownload();

  if (isLoading || !kpiData) {
    return <ResultsViewSkeleton />;
  }

  const ratings = [
    { label: 'High', value: kpiData.ratings.High },
    { label: 'Medium', value: kpiData.ratings.Medium },
    { label: 'Low', value: kpiData.ratings.Low },
  ];

  return (
    <div>
      <GroupInfo
        name={kpiData.groupInfo.groupName}
        description={kpiData.groupInfo.groupDescription}
        periodicity={kpiData.groupInfo.periodicity}
        groupId={groupId}
        onEdit={() =>
          router.push(`/periodic-monitoring/configuration/${groupId}`)
        }
        onDownload={() => {
          if (groupId && kpiData.groupInfo.groupName) {
            toast.custom(() => (
              <ToastMessage
                variant="info"
                title="Bulk Download"
                message="Bulk download started. This may take a few minutes."
              />
            ));
            download({
              groupId,
              groupName: kpiData.groupInfo.groupName,
            });
          }
        }}
        isDownloading={isDownloading}
      />
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Entities Screened"
          value={kpiData.totalEntities}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          description="Number of entities screened under this group"
        />
        <RatingCard ratings={ratings} />
        <Card>
          <CardContent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-md font-semibold ml-1">
                  Last Screened On
                </span>
              </div>
              <p className="text-muted-foreground ml-6 mt-2">
                {kpiData.groupInfo.lastScreenedOn
                  ? new Date().getTime() -
                    new Date(kpiData.groupInfo.lastScreenedOn).getTime() <
                    60 * 60 * 1000
                    ? 'Within the next hour'
                    : formatDateToUserTimezone(kpiData.groupInfo.lastScreenedOn)
                  : 'N/A'}
              </p>
            </div>
            <div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-md font-semibold ml-1">
                  Next Scheduled Screening
                </span>
                <PeriodicMonitoringInfo />
              </div>
              <p className="text-muted-foreground ml-6 mt-2">
                {formatDateToUserTimezone(kpiData.groupInfo.nextRunDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="my-6 pt-2">
        <h4 className="text-lg font-semibold mb-4">Associated Entities</h4>
        {groupId && <PeriodicMonitoringResultTable groupId={groupId} />}
      </div>
    </div>
  );
}

function ResultsViewSkeleton() {
  return (
    <div>
      <div>
        <Skeleton className="h-7 w-56 mb-2" />
        <Skeleton className="h-4 w-80 mb-6" />
        <Separator className="my-6" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="my-6 pt-2">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<ResultsViewSkeleton />}>
      <ResultsView />
    </Suspense>
  );
}

const GroupInfo = ({
  name,
  description,
  periodicity,
  groupId,
  onEdit,
  onDownload,
  isDownloading,
}: {
  name?: string | null;
  description?: string | null;
  periodicity?: string | null;
  groupId?: string | null;
  onEdit?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}) => {
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-xl font-semibold mb-1">
            {name || 'Group Name'}
            {periodicity && (
              <Badge className="ml-2" variant="secondary">
                {periodicity}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {description || 'Group description.'}
          </p>
        </div>
        {groupId && (
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2"
                onClick={onDownload}
                disabled={isDownloading}
              >
                <Download className="h-4" />
                <span className="ml-1.5 text-sm">
                  {isDownloading ? 'Downloading...' : 'Download All'}
                </span>
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2"
                onClick={onEdit}
              >
                <Edit className="h-4" />
                <span className="ml-1.5 text-sm">Edit</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator className="my-6" />
    </>
  );
};