import { apiService } from '@/services/api';
import { PeriodicGroup } from '@/types/periodicMonitoring';
import { ScreeningType } from '@/types';
import {
  useMutation,
  useQuery,
  UseMutationOptions,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Status } from '@/types';

export const queryKeys = {
  entityProfile: (ensId: string) => ['entityProfile', ensId],
  entityFindings: (ensId: string) => ['entityFindings', ensId],
  monitoringStatus: (ensId: string) => ['monitoringStatus', ensId],
  validationCount: (sessionId: string) => ['validationCount', sessionId],
  periodicGroupsByEnsId: (ensId: string) => ['periodicGroupsByEnsId', ensId],
  sessionInfo: (sessionId: string) => ['sessionInfo', sessionId],
  sessionEvents: (sessionId: string) => ['sessionEvents', sessionId],
  sessionStatus: (sessionId: string) => ['sessionStatus', sessionId],
} as const;

export function normalizeStatus(status?: string | null): Status | string | undefined {
  if (!status) return undefined;
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'INPROGRESS') return 'IN_PROGRESS';
  if (normalized === 'NOTSTARTED') return 'NOT_STARTED';
  return normalized;
}

export function useLogin() {
  return useMutation({ mutationFn: apiService.login });
}

export function useEntityProfile(ensId: string) {
  return useQuery({
    queryKey: queryKeys.entityProfile(ensId),
    queryFn: () => apiService.getEntityProfile(ensId),
    enabled: !!ensId,
  });
}

export function useEntityFindings(ensId: string) {
  return useQuery({
    queryKey: queryKeys.entityFindings(ensId),
    queryFn: () => apiService.getEntityFindings(ensId),
    enabled: !!ensId,
  });
}

export function useExcelFileUpload(screeningType: ScreeningType) {
  return useMutation({
    mutationFn: (file: File) => apiService.uploadFile(file, screeningType),
  });
}

export function useTriggerSupplierValidation(
  sessionId: string,
  screeningType: ScreeningType,
) {
  return useMutation({
    mutationFn: () =>
      apiService.triggerSupplierValidation(sessionId, screeningType),
  });
}

export function useValidationCount(
  sessionId: string,
  screeningType: ScreeningType = 'domestic',
) {
  return useQuery({
    queryKey: queryKeys.validationCount(sessionId),
    queryFn: () => apiService.getValidationCount(sessionId, screeningType),
    enabled: !!sessionId,
  });
}

export function useUpdateBulkSuggestions(
  sessionId: string,
  screeningType: ScreeningType = 'domestic',
) {
  return useMutation({
    mutationFn: (status: 'accept' | 'reject') =>
        apiService.updateBulkSuggestions(sessionId, status, screeningType),
  });
}

export function useUpdateSingleSuggestion(
  sessionId: string,
  screeningType: ScreeningType = 'domestic',
) {
  return useMutation({
    mutationFn: (data: { ens_id: string; status: 'accept' | 'reject' }[]) =>
        apiService.updateSingleSuggestion(sessionId, data, screeningType),
  });
}

export function useTriggerAnalysis(
  sessionId: string,
  screeningType: ScreeningType,
) {
  return useMutation({
    mutationFn: () => apiService.triggerAnalysis(sessionId, screeningType),
  });
}

export function useSessionInfo(sessionId?: string | null) {
  const safeSessionId = sessionId ?? '';
  return useQuery({
    queryKey: queryKeys.sessionInfo(safeSessionId),
    queryFn: () => apiService.getSessionInfoById(safeSessionId),
    enabled: !!safeSessionId,
  });
}

export function useFeedData(options: {
  ensId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { ensId, startDate, endDate } = options;
  return useInfiniteQuery({
    queryKey: ['feedData', { ensId, startDate, endDate }],
    queryFn: ({ pageParam = 0 }) =>
        apiService.getFeedData({ ensId, startDate, endDate, offset: pageParam, limit: 10 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      return lastPage.pagination?.hasMore
          ? lastPageParam + Number(lastPage.pagination.limit)
          : null;
    },
    enabled: false,
  });
}

export function useFeedKpi(options?: {
  ensId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { ensId, startDate, endDate } = options || {};
  return useQuery({
    queryKey: ['feedKpi', { ensId, startDate, endDate }],
    queryFn: () => apiService.getFeedKpi({ ensId, startDate, endDate }),
    enabled: false,
  });
}

export function useMonitoringStatus(ensId: string) {
  return useQuery({
    queryKey: ['monitoringStatus', ensId],
    queryFn: () => apiService.getMonitoringStatus(ensId),
    enabled: false,
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (data: {
      sessionId: string;
      fileName: string;
      ensId?: string;
      fileType?: 'docx' | 'pdf' | 'zip';
      isBulk?: boolean;
      screeningType?: ScreeningType;
    }) =>
        apiService.downloadReport(
            data.sessionId,
            data.fileName,
            data.ensId,
            data.fileType,
            data.isBulk,
            data.screeningType,
        ),
  });
}

export function useUpdateContinuousMonitoring(
    options?: UseMutationOptions<
        unknown,
        Error,
        { data: { ens_id: string; status: boolean }[] }
    >,
) {
  return useMutation({
    mutationFn: apiService.updateContinuousMonitoring,
    ...options,
  });
}

export function useProcessEnsId(ensId: string[], userId: string) {
  return useMutation({
    mutationFn: () => apiService.processEnsId(ensId, userId),
  });
}

export function usePeriodicGroups() {
  return useQuery<PeriodicGroup[]>({
    queryKey: ['periodic-groups'],
    queryFn: () => apiService.getPeriodicGroups(),
  });
}

export function usePeriodicGroupsByEnsId(ensId: string) {
  return useQuery<any[]>({
    queryKey: queryKeys.periodicGroupsByEnsId(ensId),
    queryFn: () => apiService.getPeriodicGroupsByEnsId(ensId),
    enabled: !!ensId,
  });
}

export function usePeriodicGroupKpis(groupId: string) {
  return useQuery({
    queryKey: ['periodic-group-kpis', groupId],
    queryFn: () => apiService.getPeriodicGroupKpis(groupId),
    enabled: !!groupId,
  });
}

export function useGroupBulkDownload() {
  return useMutation({
    mutationFn: (data: { groupId: string; groupName: string }) =>
        apiService.groupBulkDownload(data.groupId, data.groupName),
  });
}

export function useDownloadNotificationCsv() {
  return useMutation({
    mutationFn: (data: { startDate: string; endDate: string }) =>
        apiService.downloadNotificationCsv(data.startDate, data.endDate),
  });
}

export function useGenerateOnDemandScreening(
    options?: UseMutationOptions<unknown, Error, string[]>,
) {
  return useMutation({
    mutationFn: (ensIds: string[]) => apiService.generateOnDemandScreening(ensIds),
    ...options,
  });
}

export function useSessionEvents(
    sessionId?: string | null,
    onStatusUpdate?: (ensId: string, status: Status) => void,
) {
  const queryClient = useQueryClient();
  const safeSessionId = sessionId ?? '';

  useEffect(() => {
    if (!safeSessionId) return;

    const unsubscribe = apiService.subscribeToSessionEvents(
        safeSessionId,
        (data) => {
          console.log('[SSE] received raw:', JSON.stringify(data));

          if (data.session_id !== safeSessionId) return;

          const isEnsEvent = !!data.ens_id;

          if (isEnsEvent) {
            // ─── ENS-level event ───────────────────────────────────────────
            const ensStatus = normalizeStatus(data.overall_status) as Status;
            console.log('[SSE] ENS event — ens_id:', data.ens_id, 'status:', ensStatus);

            if (ensStatus && onStatusUpdate) {
              onStatusUpdate(data.ens_id, ensStatus);
            }

          } else {
            // ─── Session-level event ───────────────────────────────────────
            const sessionStatus = normalizeStatus(
                data.overall_status ?? data.session_status ?? data.status,
            );
            console.log('[SSE] Session event — status:', sessionStatus);

            // 1. Immediately update sessionStatus cache (drives ProgressBadge + Download Zip)
            if (sessionStatus) {
              queryClient.setQueryData(
                  queryKeys.sessionStatus(safeSessionId),
                  sessionStatus,
              );
            }

            // 2. Immediately patch all fields of sessionInfo cache
            queryClient.setQueryData(
                queryKeys.sessionInfo(safeSessionId),
                (old: any) => {
                  if (!old) return old;
                  return {
                    ...old,
                    ...(sessionStatus && { overallStatus: sessionStatus }),
                    ...(data.total_ens_count != null && { totalEnsCount: data.total_ens_count }),
                    ...(data.completed_ens_count != null && { completedEnsCount: data.completed_ens_count }),
                    ...(data.failed_ens_count != null && { failedEnsCount: data.failed_ens_count }),
                    ...(data.skipped_ens_count != null && { skippedEnsCount: data.skipped_ens_count }),
                    ...(data.list_upload_status && { listUploadStatus: normalizeStatus(data.list_upload_status) }),
                    ...(data.supplier_name_validation_status && { supplierNameValidationStatus: normalizeStatus(data.supplier_name_validation_status) }),
                    ...(data.screening_analysis_status && { screeningAnalysisStatus: normalizeStatus(data.screening_analysis_status) }),
                  };
                },
            );
          }
        },
    );

    return unsubscribe;
  }, [safeSessionId, queryClient, onStatusUpdate]);
}

export function useSessionStatus(sessionId?: string | null, initialStatus?: string) {
  const queryClient = useQueryClient();
  const normalizedInitialStatus = normalizeStatus(initialStatus) || '';
  const safeSessionId = sessionId ?? '';

  useEffect(() => {
    if (!safeSessionId || !normalizedInitialStatus) return;
    const existing = queryClient.getQueryData(queryKeys.sessionStatus(safeSessionId));
    if (!existing) {
      queryClient.setQueryData(
          queryKeys.sessionStatus(safeSessionId),
          normalizedInitialStatus,
      );
    }
  }, [safeSessionId, normalizedInitialStatus, queryClient]);

  return useQuery({
    queryKey: queryKeys.sessionStatus(safeSessionId),
    queryFn: () => normalizedInitialStatus,
    initialData: normalizedInitialStatus,
    enabled: !!safeSessionId,
  });
}