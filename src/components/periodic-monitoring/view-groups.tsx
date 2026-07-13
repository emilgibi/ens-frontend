'use client';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Edit,
  ChevronRight,
  History,
  CalendarClock,
  Clock,
  Building,
  Plus,
} from 'lucide-react';
import { Separator } from '../ui/separator';
import { StatusBadge, StatusType } from '../shared/status-badge';
import { PeriodicMonitoringInfo } from '../shared/periodic-monitoring-info';
import { useRouter } from 'next/navigation';
import { usePeriodicGroups } from '@/hooks/use-api';
import type { PeriodicGroup } from '@/types/periodicMonitoring';
import { formatDateToUserTimezone } from '@/lib/utils';

export default function PeriodicGroups() {
  const { data, isLoading: loading, isError, isFetching } = usePeriodicGroups();
  const groupsData: PeriodicGroup[] = data || [];
  const router = useRouter();
  const isLoading = loading || isFetching;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Entity Groups</h1>
            <div className="flex items-center text-muted-foreground">
              <p>Manage and monitor entity groups for periodic monitoring</p>
              <PeriodicMonitoringInfo />
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              router.push('/periodic-monitoring/configuration/new')
            }
          >
            <Plus className="h-4 w-4" />
            Add New Group
          </Button>
        </div>

        <Separator className="my-6" />

        {isError && (
          <div className="text-red-500 font-medium text-sm text-center my-4">
            Error loading group data. Please try again later.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array(12)
              .fill(0)
              .map((_, i) => (
                <Card key={`skeleton-${i}`} className="h-52 p-6 animate-pulse">
                  <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 mb-4 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 mb-2 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 mb-6 rounded" />
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </Card>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {groupsData.map((item) => (
              <Card
                key={item.id}
                className="relative h-full border-gray-200 transition-colors duration-400 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <CardContent className="px-6">
                  <div className="flex justify-between items-start mb-6">
                    <StatusBadge status={item.status as StatusType} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer text-gray-400 hover:text-gray-600"
                      onClick={() =>
                        router.push(
                          `/periodic-monitoring/configuration/${item.groupId}`,
                        )
                      }
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-3 w-full">
                    <p
                      className="font-semibold truncate text-sm leading-tight"
                      title={item.groupName}
                    >
                      {item.groupName}
                    </p>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">
                          {item.frequency} {item.interval.toLowerCase()}
                          {item.frequency > 1 && 's'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{item.entities} entities</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <History className="h-3 w-3" />
                        <span>
                          Last Run:{' '}
                          {formatDateToUserTimezone(item.lastScheduledDate, 'Not Yet Run')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        <span>
                          Next Run:{' '}
                          {item.nextRunDate
                            ? formatDateToUserTimezone(item.nextRunDate)
                            : 'Not Scheduled'}
                        </span>
                      </div>

                      <Separator className="my-4" />
                      <p className="leading-relaxed text-muted-foreground text-sm line-clamp-2">
                        {item.groupDescription}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter
                  className="text-center mt-4"
                  onClick={() => {
                    router.push(
                      `/periodic-monitoring/results-view?groupId=${
                        item.groupId ?? ''
                      }`,
                    );
                  }}
                >
                  <div className="absolute inset-x-0 bottom-0 bg-gray-50 dark:bg-sidebar-accent rounded-b-xl px-4 py-4 sm:px-6">
                    <p className="text-sm">
                      View Latest Results
                      <ChevronRight className="inline h-3 w-3 ml-1" />
                    </p>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
