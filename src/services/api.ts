import API_ENDPOINTS, { getScreeningEndpoints } from '@/constants/api-endpoints';
import { ScreeningType } from '@/types';
import { LoginFormData } from '@/lib/definitions';
import { getApiUrl } from '@/lib/utils';
import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

class ApiError extends Error {
  constructor(message: string, public status?: number, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Requests that target a Moody's/Orbis base URL must carry the Moody's
// token; everything else (legacy + Probe42/domestic) carries the Probe42
// token. Each backend only accepts a bearer token it issued itself.
const MOODYS_BASE_URLS = [
  process.env.NEXT_PUBLIC_MOODYS_BACKEND,
  process.env.NEXT_PUBLIC_MOODYS_BACKEND_STREAM,
  process.env.NEXT_PUBLIC_MOODYS_ORCHESTRATION,
].filter((url): url is string => Boolean(url));

apiClient.interceptors.request.use(
    (config) => {
      const url = config.url ?? '';
      const isMoodysRequest = MOODYS_BASE_URLS.some((base) => url.startsWith(base));

      const token = Cookies.get(
        isMoodysRequest ? 'moodys_access_token' : 'probe42_access_token',
      );
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response) {
        const errorMessage =
            (error.response.data as any)?.detail ||
            (error.response.data as any)?.message ||
            `HTTP ${error.response.status}: ${error.response.statusText}`;

        throw new ApiError(
            errorMessage,
            error.response.status,
            error.response.data,
        );
      } else if (error.request) {
        throw new ApiError('Network error occurred');
      } else {
        throw new ApiError(error.message || 'An error occurred');
      }
    },
);

export const apiService = {
  async login(data: LoginFormData) {
    const response = await apiClient.post(getApiUrl('/api/auth/login'), data);
    return response.data;
  },

  async uploadFile(file: File, screeningType: ScreeningType = 'domestic') {
    const formData = new FormData();
    formData.append('file', file);
    // Tag the upload with the chosen pipeline so the backend can persist it
    // against the session (needed later for resuming / displaying results).
    formData.append('screening_type', screeningType);

    const { UPLOAD_EXCEL } = getScreeningEndpoints(screeningType);

    const response = await apiClient.post(
        UPLOAD_EXCEL,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
    );
    return response.data;
  },

  async getFeedData(options?: {
    ensId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.ensId) params.append('ensId', options.ensId);
    if (options?.limit !== undefined)
      params.append('limit', options.limit.toString());
    if (options?.offset !== undefined)
      params.append('offset', options.offset.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const queryString = params.toString();
    const url = queryString
        ? getApiUrl(`/api/continuous-monitoring/feed?${queryString}`)
        : getApiUrl('/api/continuous-monitoring/feed');

    const response = await apiClient.get(url);
    return response.data;
  },

  async getFeedKpi(options?: {
    ensId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.ensId) {
      params.append('ensId', options.ensId);
    }
    if (options?.startDate) {
      params.append('startDate', options.startDate);
    }
    if (options?.endDate) {
      params.append('endDate', options.endDate);
    }

    const queryString = params.toString();
    const url = queryString
        ? getApiUrl(`/api/continuous-monitoring/feed/kpi?${queryString}`)
        : getApiUrl('/api/continuous-monitoring/feed/kpi');

    const response = await apiClient.get(url);
    return response.data;
  },

  async getMonitoringStatus(ensId: string) {
    const response = await apiClient.get(
        getApiUrl(`/api/continuous-monitoring/status?ensId=${ensId}`),
    );
    return response.data;
  },

  async getEntityProfile(ensId: string) {
    const response = await apiClient.post(
        API_ENDPOINTS.BACKEND.UNIVERSE_SUBMODAL_PROFILE,
        { ens_id: ensId },
    );
    return response.data;
  },

  async getEntityFindings(ensId: string) {
    const response = await apiClient.post(
        API_ENDPOINTS.BACKEND.UNIVERSE_SUBMODAL_FINDINGS,
        { ens_id: ensId },
    );
    return response.data;
  },

  async getEntityImage(googleImageName: string) {
    const response = await apiClient.get(
        API_ENDPOINTS.BACKEND.GET_IMAGE,
        { params: { google_image_name: googleImageName } },
    );
    return response.data;
  },

  async triggerSupplierValidation(
      sessionId: string,
      screeningType: ScreeningType = 'domestic',
  ) {
    const { DEVELOP_TRIGGER_ENTITY_VALIDATION } = getScreeningEndpoints(screeningType);
    const response = await apiClient.post(
        DEVELOP_TRIGGER_ENTITY_VALIDATION(sessionId),
    );
    return response.data;
  },

  async getValidationCount(
      sessionId: string,
      screeningType: ScreeningType = 'domestic',
  ) {
    const response = await apiClient.get(
        getApiUrl(
            `/api/get-validation-count-pipeline?sessionId=${sessionId}&screeningType=${screeningType}`,
        ),
    );
    return response.data;
  },

  // uncomment when you need queuing
  // async triggerAnalysis(sessionId: string) {
  //   const response = await apiClient.post(
  //       API_ENDPOINTS.BACKEND.DEVELOP_TRIGGER_ANALYSIS(sessionId),
  //   );
  //   return response.data;
  // },

  async triggerAnalysis(
      sessionId: string,
      screeningType: ScreeningType = 'domestic',
  ) {
    const { DEVELOP_TRIGGER_ORCHESTRATION_ANALYSIS } = getScreeningEndpoints(screeningType);
    const response = await apiClient.post(
        DEVELOP_TRIGGER_ORCHESTRATION_ANALYSIS,
        { session_id: sessionId }, // ← send as JSON body
    );
    return response.data;
  },

  async getSessionInfoById(sessionId: string) {
    const response = await apiClient.get(
        getApiUrl(`/api/get-session-info-by-id?sessionId=${sessionId}`),
    );
    return response.data;
  },

  async updateBulkSuggestions(
      sessionId: string,
      status: 'accept' | 'reject',
      screeningType: ScreeningType = 'domestic',
  ) {
    const payload = {
      session_id: sessionId,
      status,
    };

    const { UPDATE_SUGGESTION_BULK } = getScreeningEndpoints(screeningType);
    const response = await apiClient.put(
        UPDATE_SUGGESTION_BULK,
        payload,
    );
    return response.data;
  },

  async updateSingleSuggestion(
      sessionId: string,
      data: any,
      screeningType: ScreeningType = 'domestic',
  ) {
    const { UPDATE_SUGGESTION_SINGLE } = getScreeningEndpoints(screeningType);
    const response = await apiClient.put(
        UPDATE_SUGGESTION_SINGLE(sessionId),
        data,
    );
    return response.data;
  },

  async downloadReport(
      sessionId: string,
      fileName: string,
      ensId?: string,
      fileType?: 'docx' | 'pdf' | 'zip',
      isBulk?: boolean,
      screeningType: ScreeningType = 'domestic',
  ) {
    const { SINGLE_REPORT_DOWNLOAD, BULK_REPORT_DOWNLOAD } = getScreeningEndpoints(screeningType);
    const url = isBulk
        ? BULK_REPORT_DOWNLOAD(sessionId)
        : SINGLE_REPORT_DOWNLOAD(
            sessionId,
            ensId as string,
            fileType as 'docx' | 'pdf',
        );
    const response = await apiClient.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });

    const blob = response.data;

    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `${fileName}.${fileType}`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(fileUrl);
    document.body.removeChild(a);

    return response;
  },

  async groupBulkDownload(groupId: string, groupName: string) {
    const url = API_ENDPOINTS.BACKEND.GROUP_BULK_DOWNLOAD(groupId);
    const response = await apiClient.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });

    const blob = response.data;

    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `${groupName}.zip`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(fileUrl);
    document.body.removeChild(a);

    return response;
  },

  async downloadNotificationCsv(startDate: string, endDate: string) {
    const url = API_ENDPOINTS.BACKEND.DOWNLOAD_NOTIFICATION_CSV(
        startDate,
        endDate,
    );
    const response = await apiClient.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });

    const blob = response.data;

    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `notifications_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(fileUrl);
    document.body.removeChild(a);

    return response;
  },

  async updateContinuousMonitoring(data: any) {
    const response = await apiClient.post(
        API_ENDPOINTS.BACKEND.UPDATE_CONTINUOUS_MONITORING,
        data,
    );
    return response.data;
  },

  async processEnsId(ensId: string[], userId: string) {
    const response = await apiClient.post(
        API_ENDPOINTS.BACKEND.PROCESS_ENS_ID,
        { ens_ids: ensId, user_id: userId },
    );
    return response.status;
  },

  async getPeriodicGroups() {
    const response = await apiClient.get(getApiUrl('/api/periodic-monitoring/view-groups'));
    return response.data;
  },

  async getPeriodicGroupKpis(groupId: string) {
    const response = await apiClient.get(
        getApiUrl(`/api/periodic-monitoring/result-table/kpi?groupId=${groupId}`),
    );
    return response.data;
  },

  async getPeriodicGroupsByEnsId(ensId: string) {
    const response = await apiClient.get(
        getApiUrl(`/api/periodic-monitoring/get-groups-by-ensid?ensId=${ensId}`),
    );
    return response.data;
  },

  async generateOnDemandScreening(ensIds: string[]) {
    const response = await apiClient.post(
        API_ENDPOINTS.BACKEND.GENERATE_ONDEMAND_SCREENING,
        { ens_ids: ensIds },
    );
    return response.data;
  },

  // SSE for real-time updates
  subscribeToSessionEvents: (sessionId: string, onMessage: (data: any) => void) => {
    const url = getApiUrl(`/api/events?sessionId=${sessionId}`);
    console.log('[SSE] Opening stream for sessionId:', sessionId);
    const eventSource = new EventSource(url, { withCredentials: true });
    let closedByClient = false;

    eventSource.onopen = () => console.log('[SSE] Connected');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'ping' || data?.type === 'connected') return;
        console.log('[SSE] Message received:', data);
        onMessage(data);
      } catch {
        console.error('[SSE] Failed to parse:', event.data);
      }
    };

    eventSource.onerror = () => {
      if (closedByClient) return;
      console.warn('[SSE] Connection issue (auto-retrying)');
    };

    return () => {
      closedByClient = true;
      eventSource.close();
      console.log('[SSE] Client closed connection');
    };
  },
};

export { ApiError };
