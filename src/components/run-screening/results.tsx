'use client'

import {
    normalizeStatus,
    useDownloadReport,
    useSessionInfo,
    useSessionStatus,
    queryKeys,
} from '@/hooks/use-api'
import { Status, ScreeningType, SCREENING_TYPE_META } from '@/types'
import { SupplierCombinedStatus } from '@/types/supplier'
import { ColumnDef } from '@tanstack/react-table'
import {
    AlertCircleIcon,
    DownloadIcon,
    FileTextIcon,
    ReplaceIcon,
    SkipForwardIcon,
} from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { DownloadDropdown } from '../shared/download-button'
import { PaginatedTable } from '../shared/dynamic-table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { SourceBadge, SourceType } from '../source-badge'
import { ProgressBadge } from '../progress-badge'
import { useQueryClient } from '@tanstack/react-query'
import { getApiUrl } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import useWebSocket from 'react-use-websocket'
import { getScreeningEndpoints } from '@/constants/api-endpoints'

type Props = {
    sessionId: string
    sessionInitialStatus?: string
    // Fallback used while sessionInfo?.screeningType is unavailable (which,
    // right now, is *always* the case for international sessions — see the
    // comment on the screeningType derivation below). Passed down from
    // WizardContext by results-with-session-id.tsx when this component is
    // rendered inside the active wizard. Not available when Results is
    // opened from screening-history for a past session, which is why
    // sessionInfo?.screeningType is still tried first.
    initialScreeningType?: ScreeningType
}

function buildBaseColumns(screeningType: ScreeningType): ColumnDef<SupplierCombinedStatus>[] {
    return [
    { accessorKey: 'externalVendorId', header: 'ID', size: 150 },
    {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
        cell: ({ row }) => {
            return (
                <div className="flex gap-1">
                    {row.original.existingEntity === 'NEW' && (
                        <SourceBadge source="NEW" size="small" />
                    )}
                    <div>
                        {row.original.existingEntity === 'EXISTING' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <ReplaceIcon size={16} className="text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent className="w-64">
                                    <p>
                                        This match already exists in the Entity Universe. Proceeding
                                        with analysis may override the existing ID if it is different
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <div className="text-sm">{row.original.name}</div>
                </div>
            )
        },
    },
    {
        accessorKey: 'uploadedAddress',
        header: 'Uploaded Address',
        size: 250,
        cell: ({ row }) => {
            const address = row.getValue('uploadedAddress') as string
            return address ? (
                <div className="w-full text-sm whitespace-normal break-words">
                    {address}
                </div>
            ) : (
                <span className="text-gray-400">-</span>
            )
        },
    },
    {
        accessorKey: 'download',
        id: 'actions',
        size: 100,
        header: 'Download',
        meta: { filterVariant: 'none' },
        cell: ({ row }) => {
            const status = row.original.overallStatus as Status

            if (status === 'COMPLETED') {
                return (
                    <DownloadDropdown
                        options={[
                            {
                                label: 'DOCX Report',
                                icon: <FileTextIcon size={16} />,
                                sessionId: row.original.sessionId,
                                ensId: row.original.ensId as string,
                                fileType: 'docx',
                                fileName: row.original.name as string,
                                screeningType,
                            },
                        ]}
                    />
                )
            }

            if (status === 'FAILED') {
                return (
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 bg-red-50/60 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                            <AlertCircleIcon size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-300 tracking-wide">Failed</span>
                        </div>
                    </div>
                )
            }

            if (status === 'SKIPPED') {
                return (
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700">
                            <SkipForwardIcon size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-wide">Skipped</span>
                        </div>
                    </div>
                )
            }

            return (
                <div className="flex items-center justify-center">
                    <ProgressBadge status={status} />
                </div>
            )
        },
    },
    ]
}

const domesticSpecificColumns: ColumnDef<SupplierCombinedStatus>[] = [
    {
        accessorKey: 'entityType',
        header: 'Entity Type',
        cell: ({ row }) => {
            const val = row.getValue('entityType') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
    {
        accessorKey: 'identifier',
        header: 'Identifier',
        cell: ({ row }) => {
            const val = row.getValue('identifier') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
    {
        accessorKey: 'identifierType',
        header: 'Identifier Type',
        cell: ({ row }) => {
            const val = row.getValue('identifierType') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
]

const internationalSpecificColumns: ColumnDef<SupplierCombinedStatus>[] = [
    {
        accessorKey: 'country',
        header: 'Country',
        size: 100,
        cell: ({ row }) => {
            const val = row.getValue('country') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
    {
        accessorKey: 'nationalId',
        header: 'National ID',
        cell: ({ row }) => {
            const val = row.getValue('nationalId') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
    {
        accessorKey: 'nameInternational',
        header: 'International Name',
        cell: ({ row }) => {
            const val = row.getValue('nameInternational') as string
            return val || <span className="text-gray-400">-</span>
        },
    },
]

function getPipelineColumns(screeningType: ScreeningType): ColumnDef<SupplierCombinedStatus>[] {
    const baseColumns = buildBaseColumns(screeningType)
    // Entity Type/Identifier/Identifier Type columns are inserted right
    // after "Uploaded Address" (where they originally sat), keeping
    // "Download" as the last column.
    const insertAt = baseColumns.findIndex((c) => (c as any).accessorKey === 'uploadedAddress') + 1 || baseColumns.length
    const pipelineCols =
        screeningType === 'international' ? internationalSpecificColumns : domesticSpecificColumns
    return [...baseColumns.slice(0, insertAt), ...pipelineCols, ...baseColumns.slice(insertAt)]
}

export default function Results({ sessionId, sessionInitialStatus, initialScreeningType }: Props) {
    const { data: sessionInfo, isLoading: isSessionInfoLoading } = useSessionInfo(sessionId)
    const queryClient = useQueryClient()

    // The pipeline a session ran on is decided at upload time (see
    // file-upload.tsx / apiService.uploadFile, which now sends
    // `screening_type` to the backend). Results can be viewed from outside
    // the wizard (screening-history, periodic-monitoring), so sessionInfo
    // is tried first. But get-session-info-by-id currently only ever finds
    // rows in the frontend's own (Probe42-only) database, so for an
    // international session sessionInfo?.screeningType never resolves —
    // initialScreeningType (passed from WizardContext when available) is
    // the fallback that keeps this page working today; get-session-info
    // still needs a proper pipeline-aware fix for the screening-history
    // case where no wizard context exists at all.
    const screeningType: ScreeningType =
        (sessionInfo?.screeningType as ScreeningType) || initialScreeningType || 'domestic'
    const screeningEndpoints = getScreeningEndpoints(screeningType)

    const { data: sessionStatus } = useSessionStatus(
        sessionId,
        sessionInitialStatus || sessionInfo?.overallStatus,
    )

    const effectiveSessionStatus =
        normalizeStatus(sessionStatus) ||
        normalizeStatus(sessionInfo?.overallStatus) ||
        'NOT_STARTED'

    const handleStatusUpdate = useCallback((ensId: string, status: Status) => {
        if (!ensId || !status) return
        console.log('[WS] ENS update — ensId:', ensId, 'status:', status)

        const allQueries = queryClient.getQueryCache().getAll()
        const tableQueries = allQueries.filter((query) => {
            const key = query.queryKey
            return (
                Array.isArray(key) &&
                key[0] === 'table-data' &&
                typeof key[1] === 'string' &&
                (key[1] as string).includes(sessionId)
            )
        })

        // Whether the row this WS event is about was actually found (and
        // patched) in any cached page. If a cached query exists but this
        // ensId isn't in it yet — e.g. it fetched before the orchestration
        // finished writing ensid_screening_status for a skipped/new entity —
        // .map() below is a silent no-op and the table would otherwise be
        // stuck showing that first, incomplete response forever.
        let matchedExistingRow = false

        if (tableQueries.length > 0) {
            tableQueries.forEach((query) => {
                const cachedData = query.state.data as any
                if (!cachedData?.data) return
                const updatedData = cachedData.data.map((item: any) => {
                    if (item.ensId === ensId) {
                        matchedExistingRow = true
                        return { ...item, overallStatus: status }
                    }
                    return item
                })
                queryClient.setQueryData(query.queryKey, { ...cachedData, data: updatedData })
            })
        }

        if (tableQueries.length === 0 || !matchedExistingRow) {
            queryClient.invalidateQueries({
                predicate: (query) =>
                    Array.isArray(query.queryKey) &&
                    query.queryKey[0] === 'table-data' &&
                    typeof query.queryKey[1] === 'string' &&
                    (query.queryKey[1] as string).includes(sessionId),
            })
        }
    }, [sessionId, queryClient])

    // ✅ Session level WebSocket — routed to the correct pipeline's backend
    const { lastMessage: lastSessionMessage } = useWebSocket(
        screeningEndpoints.STREAM_SESSION_EVENTS(sessionId),
        { shouldReconnect: () => true }
    )

    // ✅ ENS level WebSocket — routed to the correct pipeline's backend
    const { lastMessage: lastEnsMessage } = useWebSocket(
        screeningEndpoints.STREAM_ENS_EVENTS(sessionId),
        { shouldReconnect: () => true }
    )

    // Handle session level updates
    useEffect(() => {
        if (!lastSessionMessage) return
        try {
            const data = JSON.parse(lastSessionMessage.data)
            if (data.session_id !== sessionId) return

            console.log('[WS] Session update — overall:', data.overall_status, '| screening:', data.screening_analysis_status)

            const status = normalizeStatus(data.overall_status)
            if (status) {
                queryClient.setQueryData(queryKeys.sessionStatus(sessionId), status)
            }

            queryClient.setQueryData(queryKeys.sessionInfo(sessionId), (old: any) => {
                // get-session-info-by-id reads the frontend's own local DB,
                // which never has a row for international/Orbis sessions
                // (separate database — see the screeningType comment
                // above), so `old` is permanently undefined for those
                // sessions and this handler used to just bail out here,
                // leaving the Session Details card stuck on its loading
                // skeleton forever even as live WS data kept arriving.
                // Build a minimal-but-real base from the WS payload itself
                // instead of requiring a prior successful fetch.
                const base = old ?? {
                    sessionId,
                    source: 'NU',
                    sourceDisplay: null,
                    createTime: new Date().toISOString(),
                    screeningType,
                }
                return {
                    ...base,
                    ...(status && { overallStatus: status }),
                    ...(data.total_ens_count != null && { totalEnsCount: data.total_ens_count }),
                    ...(data.completed_ens_count != null && { completedEnsCount: data.completed_ens_count }),
                    ...(data.failed_ens_count != null && { failedEnsCount: data.failed_ens_count }),
                    ...(data.skipped_ens_count != null && { skippedEnsCount: data.skipped_ens_count }),
                }
            })

            // Session-level events (overall STARTED/IN_PROGRESS/...) fire
            // before any specific ens_id reaches a terminal state — the
            // per-ENS handleStatusUpdate above never runs during that
            // window. Without this, the results table just sits on
            // whatever its very first fetch returned (often nothing, since
            // ensid_screening_status may not have a row yet at that
            // instant) until some later per-ENS event happens to fire.
            // Invalidating here keeps it catching up continuously as the
            // session progresses, not just once at the end.
            queryClient.invalidateQueries({
                predicate: (query) =>
                    Array.isArray(query.queryKey) &&
                    query.queryKey[0] === 'table-data' &&
                    typeof query.queryKey[1] === 'string' &&
                    (query.queryKey[1] as string).includes(sessionId),
            })
        } catch (e) {
            console.error('[WS] Failed to parse session message:', e)
        }
    }, [lastSessionMessage])

    // Handle ENS level updates
    useEffect(() => {
        if (!lastEnsMessage) return
        try {
            const data = JSON.parse(lastEnsMessage.data)
            if (data.session_id !== sessionId) return
            if (!data.ens_id) return

            const ensStatus = normalizeStatus(data.overall_status) as Status
            if (ensStatus) handleStatusUpdate(data.ens_id, ensStatus)
        } catch (e) {
            console.error('[WS] Failed to parse ENS message:', e)
        }
    }, [lastEnsMessage])

    const DownloadZip = () => {
        const { mutate: downloadZip } = useDownloadReport()
        return (
            <div className="flex items-center gap-2">
                <Button
                    variant={'outline'}
                    onClick={() =>
                        downloadZip({
                            sessionId,
                            fileName: 'all-reports',
                            ensId: undefined,
                            fileType: 'zip',
                            isBulk: true,
                            screeningType,
                        })
                    }
                    disabled={effectiveSessionStatus !== 'COMPLETED'}
                >
                    <DownloadIcon size={16} />
                    <span className="text-sm">
                        {effectiveSessionStatus === 'FAILED' ? 'Failed to Generate' : 'Download Zip'}
                    </span>
                </Button>
            </div>
        )
    }

    return (
        <>
            {isSessionInfoLoading ? (
                <SessionInfoSkeleton />
            ) : (
                sessionInfo && (
                    <Card className="mb-4">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CardTitle>Session Details</CardTitle>
                                {sessionInfo.source ? (
                                    <SourceBadge source={sessionInfo.source as SourceType} size="small" />
                                ) : (
                                    <p className="text-sm">N/A</p>
                                )}
                                <Badge variant="outline" className="gap-1.5">
                                    {SCREENING_TYPE_META[screeningType].shortLabel}
                                </Badge>
                            </div>
                            <CardDescription>Overview of the current screening session.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Session ID</p>
                                    <p className="text-sm">{sessionInfo.sessionId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Initiated On</p>
                                    <p className="text-sm">{new Date(sessionInfo.createTime).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <ProgressBadge
                                        status={effectiveSessionStatus}
                                        failedEnsCount={sessionInfo.failedEnsCount}
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Source</p>
                                    {sessionInfo.source === 'NU' || sessionInfo.source === 'OD' ? (
                                        <Badge
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-800 ring-gray-600/20 font-medium border-0 inline-flex items-center justify-center ring-1 ring-inset"
                                        >
                                            {sessionInfo.sourceDisplay}
                                        </Badge>
                                    ) : (
                                        <p className="text-sm" title={sessionInfo.sourceDisplay || 'N/A'}>
                                            {sessionInfo.sourceDisplay
                                                ? sessionInfo.sourceDisplay.length > 30
                                                    ? `${sessionInfo.sourceDisplay.substring(0, 30)}...`
                                                    : sessionInfo.sourceDisplay
                                                : 'N/A'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="border-t my-4"></div>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Completed</p>
                                    <p className="text-sm">{sessionInfo.completedEnsCount ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Failed</p>
                                    <p className="text-sm">{sessionInfo.failedEnsCount ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Skipped</p>
                                    <p className="text-sm">{sessionInfo.skippedEnsCount ?? 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            )}
            <PaginatedTable
                endpoint={getApiUrl(
                    `/api/get-results-data-pipeline?session_id=${sessionId}&screening_type=${screeningType}`,
                )}
                columns={getPipelineColumns(screeningType)}
                otherElements={<DownloadZip />}
                initialSorting={[{ id: 'name', desc: false }]}
            />
        </>
    )
}

const SessionInfoSkeleton = () => (
    <Card className="mb-4">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-4 w-48" /></div>
                <div><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-4 w-40" /></div>
                <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-4 w-28" /></div>
                <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-4 w-32" /></div>
            </div>
            <div className="border-t my-4"></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-4 w-16" /></div>
                <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-4 w-12" /></div>
                <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-4 w-12" /></div>
            </div>
        </CardContent>
    </Card>
)