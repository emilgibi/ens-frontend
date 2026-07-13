'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Building, Calendar, Clock, Info, Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { StatusBadge, StatusType } from '../shared/status-badge';
import { Skeleton } from '../ui/skeleton';
import { formatDate } from '@/lib/utils';
import { updateEntityGroupMappings } from '@/actions/periodic-monitoring';
import { ToastMessage } from '../shared/toast-message';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/use-api';

interface MonitoringItem {
  groupId: string;
  title: string;
  totalEntities: number;
  lastScheduledDate: string;
  groupDescription: string;
  status: string;
  checked: boolean;
  frequency: number;
  interval: string;
}

interface PeriodicMonitoringCardProps {
  monitoringData: MonitoringItem[];
  isLoading: boolean;
  ensId: string;
}

export default function PeriodicMonitoringCard({
  monitoringData,
  isLoading,
  ensId,
}: PeriodicMonitoringCardProps) {
  const [groupIdStatus, setGroupIdStatus] = useState<{
    [key: string]: boolean;
  }>({});
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const handleCheckboxChange = (groupId: string, checked: boolean) => {
    if (groupId in groupIdStatus) {
      setGroupIdStatus((prev: { [key: string]: boolean }) => {
        const { [groupId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setGroupIdStatus((prev: { [key: string]: boolean }) => ({
        ...prev,
        [groupId]: checked as boolean,
      }));
    }
  };

  const isFormDirty = Object.values(groupIdStatus).length > 0;

  const handleSave = () => {
    startTransition(async () => {
      const response = await updateEntityGroupMappings(ensId, groupIdStatus);
      if (response.success) {
        toast.custom(() => (
          <ToastMessage
            variant="success"
            title="Success"
            message="Group mappings updated successfully."
          />
        ));
        queryClient.invalidateQueries({
          queryKey: queryKeys.periodicGroupsByEnsId(ensId),
        });
        setGroupIdStatus({});
      } else {
        toast.custom(() => (
          <ToastMessage
            variant="error"
            title="Error"
            message={response.error}
          />
        ));
      }
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Periodic Monitoring
          </CardTitle>
        </CardHeader>

        <CardContent className="px-8">
          {isLoading ? (
            <div className="flex space-x-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="w-1/3">
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-5 w-5" />
                      </div>
                      <div className="space-y-3 w-full">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Separator className="my-4" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : monitoringData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No Periodic Monitoring Groups Found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                The current entity is not added in any periodic monitoring
                group.
                <br />
                To do so, please visit the{' '}
                <Link
                  href="/periodic-monitoring/view-groups"
                  className="text-primary underline"
                >
                  Periodic Configuration
                </Link>{' '}
                page.
              </p>
            </div>
          ) : (
            <Carousel
              opts={{
                align: 'start',
                slidesToScroll: 1,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4 my-2">
                {monitoringData.map((item) => (
                  <CarouselItem
                    key={item.groupId}
                    className="md:basis-1/3 lg:basis-1/3"
                  >
                    <Card
                      className={`h-full  border-2 cursor-pointer transition-colors duration-400 hover:-translate-y-0.5 hover:shadow-md`}
                    >
                      <CardContent className="px-6">
                        <div className="flex justify-between items-start mb-6">
                          <StatusBadge status={item.status as StatusType} />
                          <Checkbox
                            checked={
                              item.groupId in groupIdStatus
                                ? groupIdStatus[item.groupId]
                                : item.checked
                            }
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                item.groupId,
                                checked as boolean,
                              )
                            }
                            className="h-5 w-5"
                          />
                        </div>

                        <div className="space-y-3 w-full">
                          <p
                            className="font-semibold truncate text-sm leading-tight"
                            title={item.title}
                          >
                            {item.title}
                          </p>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            {/* Frequency */}
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>
                                {item.frequency} {item.interval}
                              </span>
                            </div>

                            {/* Entity Count */}
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Building className="h-3 w-3" />
                              <span>{item.totalEntities} entities</span>
                            </div>

                            {/* Last Run */}
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Last Run: {formatDate(item.lastScheduledDate)}
                              </span>
                            </div>

                            <Separator className="my-4" />

                            <p className="leading-relaxed text-muted-foreground text-sm">
                              {item.groupDescription}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="h-8 w-8 -left-4 border-2 cursor-pointer" />
              <CarouselNext className="h-8 w-8 -right-4 border-2 cursor-pointer" />
            </Carousel>
          )}
          {monitoringData.length > 0 && (
            <div className="flex justify-end gap-4 mt-8">
              <Button disabled={!isFormDirty || isPending} onClick={handleSave}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
