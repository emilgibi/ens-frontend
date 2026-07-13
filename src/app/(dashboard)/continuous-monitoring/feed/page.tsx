'use client';

import { StatCard } from '@/components/shared/stat-card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Loader2, AlertTriangle, ArrowUpDown, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeedTimeline from '@/components/shared/feed-timeline';
import { useFeedData, useFeedKpi, useDownloadNotificationCsv } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback, useEffect } from 'react';
import { FeedItem } from '@/types';
import DateRangePickerComponent from '@/components/shared/date-range';

const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const StatCardSkeleton = () => (
  <Card className="w-full shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent className="h-full flex flex-col justify-center items-start">
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

        {Array(5)
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
                  <div>
                    <div className="flex absolute top-[-1rem]">
                      <Skeleton className="h-8 w-32 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-3/4 mt-4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
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

export default function ContinuousMonitoringFeedPage() {
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | null>(getDefaultDateRange());
  const { data: kpiData, isLoading: isLoadingKpi } = useFeedKpi({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { mutate: downloadCsv, isPending: isDownloadingCsv } = useDownloadNotificationCsv();

  const setDateRangeAndUpdateQueries = (range: { startDate: string; endDate: string }) => {
    const newRange = range.startDate && range.endDate ? range : null;
    setDateRange(newRange);
    queryClient.invalidateQueries({ queryKey: ['feedData'] });
    queryClient.invalidateQueries({ queryKey: ['feedKpi'] });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      setDateRange(getDefaultDateRange());
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['feedData'] }),
        queryClient.refetchQueries({ queryKey: ['feedKpi'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadCsv = () => {
    if (dateRange) {
      downloadCsv({ startDate: dateRange.startDate, endDate: dateRange.endDate });
    }
  };

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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold mb-1">Real-Time Alerts & Updates</h1>
          <p className="text-muted-foreground">
            Track alerts and updates identified through continous monitoring and periodic screening
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <DateRangePickerComponent value={dateRange} onChange={setDateRangeAndUpdateQueries} />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-2"
            onClick={handleDownloadCsv}
            disabled={isDownloadingCsv || !dateRange}
          >
            {isDownloadingCsv ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator className="my-1" />
      <div className="flex gap-4">
        {isLoadingKpi
          ? Array(3).fill(0).map((_, index) => <StatCardSkeleton key={`skeleton-${index}`} />)
          : statCards.map((card, index) => (
            <StatCard
              key={`stat-card-${index}`}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
            />
          ))
        }
      </div>

      <h1 className="text-lg font-bold mt-4">Feed Details</h1>

      <FeedTabs dateRange={dateRange} />
    </div>
  );
}

const FeedTabs = ({ dateRange }: { dateRange: { startDate: string; endDate: string } | null }) => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedData({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const [activeTab, setActiveTab] = useState('alerts');

  const allLoaderRef = useRef<HTMLDivElement>(null);
  const alertsLoaderRef = useRef<HTMLDivElement>(null);
  const updatesLoaderRef = useRef<HTMLDivElement>(null);

  const allItems = data?.pages?.flatMap(page => page.data) || [];

  // Append external vendor id to supplier display name
  const itemsWithVendorId = allItems.map(item => ({
    ...item,
    supplierName: item.externalVendorId
      ? `${item.supplierName || ''} (${item.externalVendorId})`
      : item.supplierName,
  }));

  const getFilteredItems = useCallback((items: FeedItem[], tabValue: string) => {
    if (tabValue === 'all') {
      return items;
    } else if (tabValue === 'alerts') {
      return items.filter(item => item.type.toLowerCase() === 'alert');
    } else if (tabValue === 'updates') {
      return items.filter(item => item.type.toLowerCase() === 'update');
    }
    return items;
  }, []);

  const getCurrentLoaderRef = useCallback(() => {
    switch (activeTab) {
      case 'all': return allLoaderRef;
      case 'alerts': return alertsLoaderRef;
      case 'updates': return updatesLoaderRef;
      default: return allLoaderRef;
    }
  }, [activeTab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    const currentLoaderRef = getCurrentLoaderRef().current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, activeTab, getCurrentLoaderRef]);

  return (
    <Tabs defaultValue="alerts" onValueChange={setActiveTab}>
      <TabsList className="h-auto rounded-none border-b bg-transparent p-0 w-full">
        <TabsTrigger
          value="alerts"
          className="data-[state=active]:after:bg-primary relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Continuous Monitoring Alerts
        </TabsTrigger>
        <TabsTrigger
          value="updates"
          className="data-[state=active]:after:bg-primary relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Periodic Monitoring Updates
        </TabsTrigger>
        <TabsTrigger
          value="all"
          className="data-[state=active]:after:bg-primary relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          All
        </TabsTrigger>
      </TabsList>

      {isLoading && (
        <div className="mt-4">
          <FeedTimelineSkeleton />
        </div>
      )}

      {isError && (
        <div className="flex justify-center items-center py-12 text-destructive mt-4">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>Error loading feed data. Please try again later.</span>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <TabsContent value="alerts" className="mt-4">
            <FeedTimeline
              data={getFilteredItems(itemsWithVendorId, 'alerts')}
              showSupplier
              title="Alerts & Risks"
            />
            <div ref={alertsLoaderRef} className="h-10 flex justify-center items-center mt-4">
              {isFetchingNextPage && activeTab === 'alerts' && <Loader2 className="h-6 w-6 animate-spin" />}
              {!hasNextPage && getFilteredItems(itemsWithVendorId, 'alerts').length > 0 &&
                <p className="text-sm text-muted-foreground">No more items to load</p>}
            </div>
          </TabsContent>
          <TabsContent value="updates" className="mt-4">
            <FeedTimeline
              data={getFilteredItems(itemsWithVendorId, 'updates')}
              showSupplier
              title="Updates"
            />
            <div ref={updatesLoaderRef} className="h-10 flex justify-center items-center mt-4">
              {isFetchingNextPage && activeTab === 'updates' && <Loader2 className="h-6 w-6 animate-spin" />}
              {!hasNextPage && getFilteredItems(itemsWithVendorId, 'updates').length > 0 &&
                <p className="text-sm text-muted-foreground">No more items to load</p>}
            </div>
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <FeedTimeline
              data={getFilteredItems(itemsWithVendorId, 'all')}
              showSupplier
            />
            <div ref={allLoaderRef} className="h-10 flex justify-center items-center mt-4">
              {isFetchingNextPage && activeTab === 'all' && <Loader2 className="h-6 w-6 animate-spin" />}
              {!hasNextPage && itemsWithVendorId.length > 0 && <p className="text-sm text-muted-foreground">No more items to load</p>}
            </div>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
};