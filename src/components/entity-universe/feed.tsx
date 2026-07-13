'use client';

import { AlertCircle, RefreshCw, Info, AlertTriangle, ArrowUpDown } from 'lucide-react';
import FeedTimeline from '../shared/feed-timeline';
import { StatCard } from '../shared/stat-card';
import { useFeedData, useFeedKpi } from '@/hooks/use-api';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const StatCardSkeleton = () => (
  <Card className="w-full shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-3" />
      <Skeleton className="h-4 w-40" />
    </CardContent>
  </Card>
);

const FeedTimelineSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <div className="absolute left-24 top-0 bottom-0 w-0.5 bg-border" />
        {Array(3)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="relative flex items-start pb-4 last:mb-0 mb-8"
            >
              <div className="w-20 flex-shrink-0 text-right pr-4">
                <Skeleton className="h-4 w-16 ml-auto mb-1" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
              <div className="relative flex-shrink-0 mx-4">
                <Skeleton className="w-6 h-6 rounded-full -translate-x-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-card border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
      </div>
    </CardContent>
  </Card>
);

export default function CombinedFeed({ ensId }: { ensId: string }) {
  const { data: kpiData, isLoading: isLoadingKpi } = useFeedKpi({ ensId });
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    isError: isErrorFeed,
  } = useFeedData({ ensId });

  return (
    <div className="max-w-7xl mx-auto my-4">
      <div>
        <Metrics kpiData={kpiData} isLoading={isLoadingKpi} />

        {isLoadingFeed && <FeedTimelineSkeleton />}
        {isErrorFeed && (
          <div className="flex justify-center items-center py-12 text-destructive mt-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Error loading feed data. Please try again later.</span>
          </div>
        )}
        {!isLoadingFeed && !isErrorFeed && feedData?.pages && (
          <FeedTimeline data={feedData.pages.flatMap(page => page.data)} />
        )}
      </div>
    </div>
  );
}

function Metrics({
  kpiData,
  isLoading,
}: {
  kpiData: any;
  isLoading: boolean;
}) {
  const statCards = [
    {
      title: "Continuous Monitoring Alert",
      value: kpiData?.kpi?.totalAlerts || 0,
      icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
      description: "Real-time Alerts and changes to reports identified through continuous monitoring within date range"
    },
    {
      title: "Periodic Monitoring Updates",
      value: kpiData?.kpi?.totalUpdates || 0,
      icon: <RefreshCw className="h-4 w-4 text-muted-foreground" />,
      description: "Updates to reports found through periodic monitoring within date range"
    },
    {
      title: "Ratings Change",
      value: kpiData?.kpi?.totalRatingsChange || 0,
      icon: <ArrowUpDown className="h-4 w-4 text-muted-foreground" />,
      description: "Changes to entity ratings within date range"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto mb-4">
      <div className="flex w-full gap-4">
        {isLoading
          ? Array(3)
            .fill(0)
            .map((_, index) => <StatCardSkeleton key={index} />)
          : statCards.map((card, index) => (
            <StatCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
            />
          ))}
      </div>
    </div>
  );
}