'use client';

import {
  // DownloadIcon,
  Eye,
  // FileSignature,
  FileText,
  // FileTextIcon,
  // History,
  Loader2,
  // Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// import { Label } from '@/components/ui/label';
// import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { RiskLevel } from '@/types';

import {
  useEntityProfile,
  // useMonitoringStatus,
  // useUpdateContinuousMonitoring,
  queryKeys,
  // usePeriodicGroupsByEnsId,
  // useGenerateOnDemandScreening,
} from '@/hooks/use-api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ToastMessage } from '../shared/toast-message';
import { DownloadDropdown } from '../shared/download-button';
// import PeriodicMonitoringCard from './configuration';
// import CombinedFeed from './feed';
import Findings from './findings';
import EntityUniverseOverview from './overview';
import { RiskBadge } from './risk-badge';

export default function EntityInfoDialog({
                                           open,
                                           onOpenChange,
                                           ensId,
                                           lastSessionId,
                                         }: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ensId: string;
  lastSessionId: string;
}>) {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useEntityProfile(ensId);
  // const { data: monitoringStatus } = useMonitoringStatus(ensId);
  // const { data: monitoringData, isPending: isMonitoringDataPending } =
  //   usePeriodicGroupsByEnsId(ensId);
  // const { mutate: generateOnDemandScreening, isPending: isGeneratingReport } =
  //   useGenerateOnDemandScreening({
  //     onSuccess: () => {
  //       toast.custom(() => (
  //         <ToastMessage
  //           variant="success"
  //           title="Success"
  //           message="Report generation has been initiated."
  //         />
  //       ));
  //       queryClient.invalidateQueries({
  //         queryKey: queryKeys.entityProfile(ensId),
  //       });
  //     },
  //     onError: (error: any) => {
  //       if (error.status === 429) {
  //         toast.custom(() => (
  //           <ToastMessage
  //             variant="error"
  //             title="Quota Exceeded"
  //             message={
  //               error.details?.detail ||
  //               'You have reached your quota of reports for this entity for today.'
  //             }
  //           />
  //         ));
  //       } else if (error.status === 423) {
  //         toast.custom(() => (
  //           <ToastMessage
  //             variant="warning"
  //             title="Request in Progress"
  //             message={
  //               error.details?.detail ||
  //               'This entity is already queued for screening. Please try again later.'
  //             }
  //           />
  //         ));
  //       } else {
  //         toast.custom(() => (
  //           <ToastMessage
  //             variant="error"
  //             title="Error"
  //             message={error.message || 'Failed to generate report. Please try again.'}
  //           />
  //         ));
  //       }
  //     },
  //   });

  // const { mutate: updateMonitoringStatus } = useUpdateContinuousMonitoring({
  //   onMutate: async (newData) => {
  //     await queryClient.cancelQueries({
  //       queryKey: queryKeys.monitoringStatus(ensId),
  //     });
  //     const previousStatus = queryClient.getQueryData(
  //       queryKeys.monitoringStatus(ensId),
  //     );
  //     queryClient.setQueryData(
  //       queryKeys.monitoringStatus(ensId),
  //       (old: any) => ({
  //         ...old,
  //         status: newData.data[0].status ? 'ACTIVE' : 'PAUSED',
  //       }),
  //     );
  //     return { previousStatus };
  //   },
  //   onSuccess: () => {
  //     toast.custom(() => (
  //       <ToastMessage
  //         variant="success"
  //         title="Success"
  //         message="Monitoring status updated successfully."
  //       />
  //     ));
  //   },
  //   onError: (err, newData, context) => {
  //     const { previousStatus } = context as { previousStatus: any };
  //     if (previousStatus) {
  //       queryClient.setQueryData(
  //         queryKeys.monitoringStatus(ensId),
  //         previousStatus,
  //       );
  //     }
  //     toast.custom(() => (
  //       <ToastMessage
  //         variant="error"
  //         title="Error"
  //         message="Failed to update monitoring status."
  //       />
  //     ));
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries({
  //       queryKey: queryKeys.monitoringStatus(ensId),
  //     });
  //   },
  // });

  if (isError) {
    toast.custom(() => (
        <ToastMessage
            variant={'error'}
            title="Failed to fetch data"
            message="Please try again."
        />
    ));
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-6xl overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="flex items-center justify-between mb-1">
                  <div className="flex gap-4">
                    {data && !isPending && (
                        <>
                          <h4 className="text-lg">{data?.profile.name}</h4>
                          <div className="flex items-center gap-2">
                            <RiskBadge
                                risk={data?.ratings.supplier as RiskLevel}
                                size="small"
                            />
                          </div>
                        </>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {data && !isPending ? data?.profile.address : ''}
                </DialogDescription>
              </div>
              <div className="mr-8">
                <DownloadDropdown
                    sessionId={lastSessionId}
                    ensId={ensId}
                    fileName={data?.profile.name || 'report'}
                    variant="outline"
                    showLabel={true}
                />
              </div>
            </div>
          </DialogHeader>
          {ensId && (
              <div className="space-y-6 overflow-y-auto">
                <Tabs
                    defaultValue="overview"
                    className="w-full pr-1 h-[80vh] max-h-[80vh]"
                >
                  <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 border-b flex-shrink-0">
                    <TabsTrigger
                        value="overview"
                        className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Overview
                    </TabsTrigger>

                    {/* <TabsTrigger
                  value="feed"
                  className="flex items-center gap-2"
                  disabled={isPending}
                >
                  <History className="w-4 h-4" />
                  Monitoring Feed
                </TabsTrigger> */}

                    <TabsTrigger
                        value="findings"
                        className="flex items-center gap-2"
                        disabled={isPending}
                    >
                      <FileText className="w-4 h-4" />
                      Detailed Findings
                    </TabsTrigger>

                    {/* <TabsTrigger
                  value="configuration"
                  className="flex items-center gap-2"
                  disabled={isPending}
                >
                  <Settings className="w-4 h-4" />
                  Configuration
                </TabsTrigger> */}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 my-4">
                    {data && !isPending ? (
                        <EntityUniverseOverview profileData={data} />
                    ) : (
                        <div className="flex items-center justify-center gap-2 h-full">
                          <Loader2 className="animate-spin h-6 w-6" />
                          <span className="ml-1 text-md font-normal">
                      Getting details...
                    </span>
                        </div>
                    )}
                  </TabsContent>

                  {/* <TabsContent value="feed">
                <CombinedFeed ensId={ensId} />
              </TabsContent> */}

                  <TabsContent value="findings">
                    <Findings ensId={ensId} />
                  </TabsContent>

                  {/* <TabsContent value="configuration">
                <div className="flex gap-4 items-stretch my-4">
                  <Card className="max-w-sm transition-colors flex flex-col">
                    <CardContent className="flex-grow flex flex-col">
                      <div>
                        <h3 className="font-semibold mb-2">
                          Generate New Report
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Perform screening on-demand for this entity to
                          generate a new report
                        </p>
                        {data && (
                          <p className="text-xs text-muted-foreground mb-4">
                            Last screened:{' '}
                            {new Date(
                              data.metadata.last_screened_date,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full gap-2 cursor-pointer mt-auto"
                        onClick={() => generateOnDemandScreening([ensId])}
                        disabled={isGeneratingReport}
                      >
                        {isGeneratingReport ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Request New Report
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="max-w-sm transition-colors min-w-sm gap-4">
                    <CardHeader>
                      <h3 className="font-semibold">Continuous Monitoring</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Activate continuous monitoring for this entity to screen
                        for real-time alerts and updates
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="inline-flex items-center gap-2">
                        <Label htmlFor={ensId} className="text-sm font-medium">
                          Active
                        </Label>
                        <Switch
                          id={ensId}
                          checked={monitoringStatus?.status === 'ACTIVE'}
                          onCheckedChange={(checked) => {
                            updateMonitoringStatus({
                              data: [
                                {
                                  ens_id: ensId,
                                  status: checked,
                                },
                              ],
                            });
                          }}
                          aria-label="Toggle switch"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <PeriodicMonitoringCard
                  monitoringData={monitoringData || []}
                  isLoading={isMonitoringDataPending}
                  ensId={ensId}
                />
              </TabsContent> */}

                </Tabs>
              </div>
          )}
        </DialogContent>
      </Dialog>
  );
}