import { ScreeningType } from '@/types'

const APPLICATION_BACKEND = process.env.NEXT_PUBLIC_APPLICATION_BACKEND
const APPLICATION_BACKEND_STREAM =
    process.env.NEXT_PUBLIC_APPLICATION_BACKEND_STREAM
const APPLICATION_ORCHESTRATION =
    process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION

// ---------------------------------------------------------------------------
// LEGACY / DEFAULT ENDPOINTS
// ---------------------------------------------------------------------------
// Unchanged from before. Every part of the app that is NOT part of the
// domestic/international screening wizard (continuous monitoring, entity
// universe, location360, reports, auth, etc.) keeps using this object
// exactly as it did pre-Moody's, pointed at whatever NEXT_PUBLIC_APPLICATION_*
// envs are configured. This is effectively "Probe42 / domestic" today.
export const API_ENDPOINTS = {
  BACKEND: {
    UPLOAD_EXCEL: `${APPLICATION_BACKEND}/supplier/upload-excel`,
    GET_SESSION_SCREENING_STATUS: `${APPLICATION_BACKEND}/supplier/get-session-screening-status?screening_analysis_status=active`,
    CURRENT_USER: `${APPLICATION_BACKEND}/users/me`,
    UPDATE_SUGGESTION_BULK: `${APPLICATION_BACKEND}/supplier/update-suggestions-bulk`,
    LOGIN: `${APPLICATION_BACKEND}/auth/login`,
    GET_GRAPH: `${APPLICATION_BACKEND}/graph/get-network-graph`,
    SUBMODAL_FINDINGS: `${APPLICATION_BACKEND}/graph/get-submodal-findings`,
    GET_SUBMODAL_FINANCIALS: `${APPLICATION_BACKEND}/graph/get-submodal-financials`,
    UNIVERSE_SUBMODAL_PROFILE: `${APPLICATION_BACKEND}/universe/get-submodal-profile`,
    UNIVERSE_SUBMODAL_FINDINGS: `${APPLICATION_BACKEND}/universe/get-submodal-findings`,
    GET_IMAGE: `${APPLICATION_BACKEND}/report/get-images`,
    PROCESS_ENS_ID: `${APPLICATION_BACKEND}/supplier/process-ens-id`,
    GENERATE_ONDEMAND_SCREENING: `${APPLICATION_BACKEND}/supplier/generate-ondemand-screening`,
    GET_SUPPLIER_COUNTRIES: (clientId: string) =>
        `${APPLICATION_BACKEND}/graph/supplier-countries?client_id=${clientId}`,
    SUPPLIER_NO_MATCH_COUNT: (session_id: string) =>
        `${APPLICATION_BACKEND}/supplier/get-nomatch-count?session_id=${session_id}`,
    GET_SUPPLIER_DATA: (session_id: string) =>
        `${APPLICATION_BACKEND}/supplier/get-supplier-data?session_id=${session_id}`,
    GET_MAIN_SUPPLIER_DATA: (session_id: string) =>
        `${APPLICATION_BACKEND}/supplier/get-main-supplier-data-compiled?session_id=${session_id}`,
    UPDATE_SUGGESTION_SINGLE: (session_id: string) =>
        `${APPLICATION_BACKEND}/supplier/update-suggestions-single?session_id=${session_id}`,
    SINGLE_REPORT_DOWNLOAD: (
        session_id: string,
        ens_id: string,
        fileType: string
    ) =>
        `${APPLICATION_BACKEND}/report/download-report/?session_id=${session_id}&ens_id=${ens_id}&type_of_file=${fileType}`,
    BULK_REPORT_DOWNLOAD: (session_id: string) =>
        `${APPLICATION_BACKEND}/report/bulk-download-report/?session_id=${session_id}`,
    UPDATE_CONTINUOUS_MONITORING: `${APPLICATION_BACKEND}/monitoring/continuousbulk/`,
    DEVELOP_TRIGGER_ENTITY_VALIDATION: (session_id: string) =>
        `${APPLICATION_BACKEND}/queue/develop-trigger-entity-validation?session_id=${session_id}`,
    DEVELOP_TRIGGER_ANALYSIS: (session_id: string) =>
        `${APPLICATION_BACKEND}/queue/queue-trigger-analysis/?session_id=${session_id}`,
    DEVELOP_TRIGGER_ORCHESTRATION_ANALYSIS:
        `${APPLICATION_ORCHESTRATION}/analysis/trigger-analysis/`,
    GET_COMPLETE_COMPANY_DATA:
        `${APPLICATION_ORCHESTRATION}/get-complete-company-data`,
    PROBE42_NAME_SEARCH:
        `${APPLICATION_ORCHESTRATION}/probe42/nameSearch`,
    GROUP_BULK_DOWNLOAD: (groupId: string) =>
        `${APPLICATION_BACKEND}/report/group-bulk-download-report?group_id=${groupId}`,
    DOWNLOAD_NOTIFICATION_CSV: (startDate: string, endDate: string) =>
        `${APPLICATION_BACKEND}/report/download-notification-csv?start%20date=${startDate}&end%20date=${endDate}`,
    STREAM_SESSION_EVENTS: (session_id: string) =>
        `${APPLICATION_BACKEND_STREAM}/streaming/ws/session-status?session_id=${session_id}`,
    STREAM_ENS_EVENTS: (session_id: string) =>
        `${APPLICATION_BACKEND_STREAM}/streaming/ws/ensid-status?session_id=${session_id}`,
  },
}

export default API_ENDPOINTS

// ---------------------------------------------------------------------------
// SCREENING-PIPELINE-AWARE ENDPOINTS (NEW)
// ---------------------------------------------------------------------------
// Used only by the run-screening wizard flow (upload -> validate -> trigger
// analysis) where the active pipeline depends on the user's domestic /
// international choice from the entry popup.
//
// Add these env vars (one set per provider). Point both sets at the same
// values during migration if Moody's infra isn't live yet, so the
// international option doesn't break.
//
//   NEXT_PUBLIC_PROBE42_BACKEND
//   NEXT_PUBLIC_PROBE42_BACKEND_STREAM
//   NEXT_PUBLIC_PROBE42_ORCHESTRATION
//
//   NEXT_PUBLIC_MOODYS_BACKEND
//   NEXT_PUBLIC_MOODYS_BACKEND_STREAM
//   NEXT_PUBLIC_MOODYS_ORCHESTRATION

type PipelineBaseUrls = {
  BACKEND: string
  BACKEND_STREAM: string
  ORCHESTRATION: string
}

const PIPELINE_BASE_URLS: Record<ScreeningType, PipelineBaseUrls> = {
  domestic: {
    BACKEND: (process.env.NEXT_PUBLIC_PROBE42_BACKEND ?? APPLICATION_BACKEND) as string,
    BACKEND_STREAM: (process.env.NEXT_PUBLIC_PROBE42_BACKEND_STREAM ?? APPLICATION_BACKEND_STREAM) as string,
    ORCHESTRATION: (process.env.NEXT_PUBLIC_PROBE42_ORCHESTRATION ?? APPLICATION_ORCHESTRATION) as string,
  },
  international: {
    BACKEND: process.env.NEXT_PUBLIC_MOODYS_BACKEND as string,
    BACKEND_STREAM: process.env.NEXT_PUBLIC_MOODYS_BACKEND_STREAM as string,
    ORCHESTRATION: process.env.NEXT_PUBLIC_MOODYS_ORCHESTRATION as string,
  },
}

function getBaseUrls(screeningType: ScreeningType): PipelineBaseUrls {
  const urls = PIPELINE_BASE_URLS[screeningType]
  if (!urls?.BACKEND || !urls?.ORCHESTRATION) {
    throw new Error(
        `Missing API base URL configuration for screening type "${screeningType}". Check your NEXT_PUBLIC_PROBE42_* / NEXT_PUBLIC_MOODYS_* env vars.`,
    )
  }
  return urls
}

/**
 * Returns the subset of screening-flow endpoints needed by the wizard,
 * pointed at the correct provider's backend/orchestration based on the
 * user's domestic vs international selection.
 */
export const getScreeningEndpoints = (screeningType: ScreeningType) => {
  const { BACKEND, BACKEND_STREAM, ORCHESTRATION } = getBaseUrls(screeningType)

  return {
    UPLOAD_EXCEL: `${BACKEND}/supplier/upload-excel`,
    DEVELOP_TRIGGER_ENTITY_VALIDATION: (session_id: string) =>
        `${BACKEND}/queue/develop-trigger-entity-validation?session_id=${session_id}`,
    DEVELOP_TRIGGER_ORCHESTRATION_ANALYSIS: `${ORCHESTRATION}/analysis/trigger-analysis/`,
    UPDATE_SUGGESTION_BULK: `${BACKEND}/supplier/update-suggestions-bulk`,
    UPDATE_SUGGESTION_SINGLE: (session_id: string) =>
        `${BACKEND}/supplier/update-suggestions-single?session_id=${session_id}`,
    SINGLE_REPORT_DOWNLOAD: (session_id: string, ens_id: string, fileType: string) =>
        `${BACKEND}/report/download-report/?session_id=${session_id}&ens_id=${ens_id}&type_of_file=${fileType}`,
    BULK_REPORT_DOWNLOAD: (session_id: string) =>
        `${BACKEND}/report/bulk-download-report/?session_id=${session_id}`,
    STREAM_SESSION_EVENTS: (session_id: string) =>
        `${BACKEND_STREAM}/streaming/ws/session-status?session_id=${session_id}`,
    STREAM_ENS_EVENTS: (session_id: string) =>
        `${BACKEND_STREAM}/streaming/ws/ensid-status?session_id=${session_id}`,
    // Provider-specific name search used during validation.
    PROVIDER_NAME_SEARCH:
        screeningType === 'domestic'
            ? `${ORCHESTRATION}/probe42/nameSearch`
            : `${ORCHESTRATION}/moodys/nameSearch`,
    // Entity Universe "eye" overview sheet — Probe42 exposes these under
    // /universe/*, Orbis under /graph/*, but both are backed by the same
    // compile_company_profile()/pull_ratings() functions and return the
    // identical {profile, ratings, metadata} shape, so the same frontend
    // sheet component works for both unchanged.
    SUBMODAL_PROFILE:
        screeningType === 'domestic'
            ? `${BACKEND}/universe/get-submodal-profile`
            : `${BACKEND}/graph/get-submodal-profile`,
    SUBMODAL_FINDINGS:
        screeningType === 'domestic'
            ? `${BACKEND}/universe/get-submodal-findings`
            : `${BACKEND}/graph/get-submodal-findings`,
  }
}