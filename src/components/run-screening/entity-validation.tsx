import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronRight,
  EllipsisVertical,
  Loader2,
  ReplaceIcon,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react'

import { useWizard } from '@/contexts/wizard-context'
import {
  useTriggerAnalysis,
  useUpdateBulkSuggestions,
  useUpdateSingleSuggestion,
  useValidationCount,
} from '@/hooks/use-api'
import { cn, getApiUrl } from '@/lib/utils'
import { Supplier } from '@/types/supplier'
import { ScreeningType } from '@/types'
import { useSetState } from '@mantine/hooks'
import { useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { PaginatedTable } from '../shared/dynamic-table'
import DialogueAlert from './alert-dialogue'
import { ValidationSummaryCard } from './validation-summary-cards'
import { SourceBadge } from '../source-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const BUTTON_STYLES = {
  accept: {
    base: 'text-green-600 border-green-600 focus:text-green-600 hover:bg-green-50 hover:text-green-600',
  },
  reject: {
    base: 'text-red-600 border-red-600 focus:text-red-600 hover:bg-red-50 hover:text-red-600',
  },
  change: {
    base: 'text-gray-600 border-gray-600 focus:ring-0 hover:bg-gray-50 hover:text-gray-600',
  },
} as const

const getButtonStyles = (variant: 'accept' | 'reject' | 'change') => {
  const styles = BUTTON_STYLES[variant]
  return cn(styles.base)
}

export function RowActionButtons({
  ensId,
  actionCacheRef,
}: {
  ensId: string
  actionCacheRef: React.MutableRefObject<{
    [key: string]: 'accept' | 'reject'
  }>
}) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  const status = actionCacheRef.current[ensId]

  const handleAction = (action: 'accept' | 'reject') => {
    actionCacheRef.current[ensId] = action
    forceUpdate()
  }

  const handleToggleAction = () => {
    const newAction = status === 'accept' ? 'reject' : 'accept'
    handleAction(newAction)
  }

  if (!status) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className={getButtonStyles('accept')}
          onClick={() => handleAction('accept')}
        >
          <CheckCircle className="h-4 w-4 mr-0.5" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={getButtonStyles('reject')}
          onClick={() => handleAction('reject')}
        >
          <XCircle className="h-4 w-4 mr-0.5" />
          Reject
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className={cn(
          getButtonStyles(status),
          'pointer-events-none min-w-[100px]'
        )}
        disabled
      >
        {status === 'accept' ? (
          <CheckCircle className="h-4 w-4 mr-0.5" />
        ) : (
          <XCircle className="h-4 w-4 mr-0.5" />
        )}
        {status === 'accept' ? 'Accepted' : 'Rejected'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={getButtonStyles('change')}
        onClick={handleToggleAction}
        title={`Change to ${status === 'accept' ? 'Reject' : 'Accept'}`}
      >
        <RotateCcw className="h-4 w-4 mr-0.5" />
      </Button>
    </div>
  )
}

// Validation status badge component
const ValidationStatusBadge = ({
  finalValidationStatus,
  duplicateInSession,
  validationStatus,
}: {
  finalValidationStatus: Supplier['finalValidationStatus']
  duplicateInSession: Supplier['duplicateInSession']
  validationStatus: Supplier['validationStatus']
}) => {
  if (finalValidationStatus === 'AUTO_ACCEPT') {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Check className="h-3 w-3 mr-1" />
        Direct Match
      </Badge>
    )
  }

  if (finalValidationStatus === 'REVIEW') {
    return (
      <Badge variant="default" className="bg-amber-100 text-amber-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Requires Review
      </Badge>
    )
  }

  if (
    (finalValidationStatus === 'AUTO_REJECT' &&
      duplicateInSession === 'REMOVE') ||
    (finalValidationStatus === 'AUTO_REJECT' &&
      validationStatus === 'NOT_VALIDATED')
  ) {
    return (
      <Badge variant="default" className="bg-red-100 text-red-800">
        <X className="h-3 w-3 mr-1" />
        Duplicate/No Match
      </Badge>
    )
  }

  return null
}

const columns: ColumnDef<Supplier>[] = [
  { accessorKey: 'uploadedExternalVendorId', header: 'ID', size: 150 },
  {
    accessorKey: 'uploadedName',
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
            <div className="text-sm">{row.original.uploadedName}</div>
          </div>
      )
    },
  },
  {
    accessorKey: 'finalValidationStatus',
    header: 'Validation Result',
    meta: {
      filterVariant: 'select',
      filterOptions: {
        options: [
          { label: 'Direct Match', value: 'AUTO_ACCEPT' },
          { label: 'Requires Review', value: 'REVIEW' },
          { label: 'Duplicate/No Match', value: 'AUTO_REJECT' },
        ],
      },
    },
    cell: ({ row }) => {
      const supplier = row.original
      return (
          <ValidationStatusBadge
              finalValidationStatus={supplier.finalValidationStatus}
              duplicateInSession={supplier.duplicateInSession}
              validationStatus={supplier.validationStatus}
          />
      )
    },
  },
  {
    accessorKey: 'suggestedName',
    header: 'Suggested Name',
    size: 200,
    cell: ({ row }) => {
      const val = row.getValue('suggestedName') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
]

const domesticSpecificColumns: ColumnDef<Supplier>[] = [
  {
    accessorKey: 'uploadedEntityType',
    header: 'Entity Type',
    cell: ({ row }) => {
      const val = row.getValue('uploadedEntityType') as string
      return val || <span className="text-gray-400">-</span>
    },
  },
  {
    accessorKey: 'suggestedEntityType',
    header: 'Suggested Entity Type',
    cell: ({ row }) => {
      const val = row.getValue('suggestedEntityType') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
  {
    accessorKey: 'uploadedIdentifier',
    header: 'Identifier',
    cell: ({ row }) => {
      const val = row.getValue('uploadedIdentifier') as string
      return val || <span className="text-gray-400">-</span>
    },
  },
  {
    accessorKey: 'suggestedIdentifier',
    header: 'Suggested Identifier',
    cell: ({ row }) => {
      const val = row.getValue('suggestedIdentifier') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
  {
    accessorKey: 'uploadedIdentifierType',
    header: 'Identifier Type',
    cell: ({ row }) => {
      const val = row.getValue('uploadedIdentifierType') as string
      return val || <span className="text-gray-400">-</span>
    },
  },
  {
    accessorKey: 'suggestedIdentifierType',
    header: 'Suggested Identifier Type',
    cell: ({ row }) => {
      const val = row.getValue('suggestedIdentifierType') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
]

const internationalSpecificColumns: ColumnDef<Supplier>[] = [
  {
    accessorKey: 'uploadedCountry',
    header: 'Country',
    size: 100,
    cell: ({ row }) => {
      const val = row.getValue('uploadedCountry') as string
      return val || <span className="text-gray-400">-</span>
    },
  },
  {
    accessorKey: 'suggestedCountry',
    header: 'Suggested Country',
    size: 130,
    cell: ({ row }) => {
      const val = row.getValue('suggestedCountry') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
  {
    accessorKey: 'uploadedNationalId',
    header: 'National ID',
    cell: ({ row }) => {
      const val = row.getValue('uploadedNationalId') as string
      return val || <span className="text-gray-400">-</span>
    },
  },
  {
    accessorKey: 'suggestedNationalId',
    header: 'Suggested National ID',
    cell: ({ row }) => {
      const val = row.getValue('suggestedNationalId') as string
      return val ? (
          <div className="text-sm text-muted-foreground">{val}</div>
      ) : (
          <span className="text-gray-400">-</span>
      )
    },
  },
]

function getPipelineColumns(screeningType: ScreeningType): ColumnDef<Supplier>[] {
  return [
    ...columns,
    ...(screeningType === 'international'
        ? internationalSpecificColumns
        : domesticSpecificColumns),
  ]
}

const ValidationSummary = [
  {
    title: 'Direct Match Found',
    label: 'directMatchFoundCount',
    value: 2,
    description: 'Perfect match found; no action needed.',
    icon: Check,
    variant: 'success' as const,
  },
  {
    title: 'Match Found – Requires Review',
    label: 'requiresReviewCount',
    value: 0,
    description: 'Review required for potential match.',
    icon: AlertTriangle,
    variant: 'warning' as const,
  },
  {
    title: 'Duplicate or No Match',
    label: 'duplicateOrNoMatchCount',
    value: 10,
    description: 'Record will be ignored from Analysis',
    icon: X,
    variant: 'error' as const,
  },
]

export default function EntityValidation() {
  const { sessionId, setActiveStep, screeningType } = useWizard()
  const currentScreeningType = screeningType ?? 'domestic'
  const { data: validationCount } = useValidationCount(sessionId as string, currentScreeningType)
  const actionCacheRef = useRef<{ [key: string]: 'accept' | 'reject' }>({})

  const [dialogState, setDialogState] = useSetState({
    open: false,
    title: '',
    description: () => <></>,
    onConfirm: () => {},
    onOpenChange: () => {},
  })

  const {
    mutate: updateBulkSuggestions,
    isSuccess: isBulkSuccess,
    isPending: isBulkPending,
    isError: isBulkError,
  } = useUpdateBulkSuggestions(sessionId as string, currentScreeningType)

  const {
    mutate: updateSingleSuggestion,
    isSuccess: isSingleSuccess,
    isPending: isSinglePending,
    isError: isSingleError,
  } = useUpdateSingleSuggestion(sessionId as string, currentScreeningType)

  const {
    mutate: triggerAnalysis,
    isSuccess: isAnalysisSuccess,
    isPending: isAnalysisPending,
    isError: isAnalysisError,
  } = useTriggerAnalysis(sessionId as string, currentScreeningType)

  const getDialogDescription = (action: 'accept' | 'reject') => (
    <>
      <span>
        You are about{' '}
        <span className="font-semibold">
          {action === 'accept'
            ? 'Accept All Suggestions'
            : 'Reject All Suggestions'}
        </span>{' '}
        for{' '}
        <span className="font-semibold">
          {validationCount?.requiresReviewCount || 0}
        </span>{' '}
        {validationCount?.requiresReviewCount === 1 ? 'Record' : 'Records'} . If
        you're sure, press confirm button below
      </span>
    </>
  )

  const handleBulkSuggestionClick = (action: 'accept' | 'reject') => {
    setDialogState({
      open: true,
      title: 'Are you sure?',
      description: () => getDialogDescription(action),
      onConfirm: () => {
        updateBulkSuggestions(action)
      },
      onOpenChange: () => {
        setDialogState({
          open: false,
        })
      },
    })
  }

  const confirmReview = () => {
    if (isBulkPending || isSinglePending) {
      return
    }

    if (isBulkSuccess || isSingleSuccess) {
      setDialogState({
        open: true,
        title: 'Are you sure?',
        description: () => (
          <span>
            You are about to start the screening for these entities. Press the
            confirm button below to begin.
          </span>
        ),
        onConfirm: () => {
          triggerAnalysis()
        },
        onOpenChange: () => {
          setDialogState({ open: false })
        },
      })

      return
    }

    const data = Object.entries(actionCacheRef.current).map(
      ([ensId, status]) => ({
        ens_id: ensId,
        status,
      })
    )

    const reviewCount = validationCount?.requiresReviewCount || 0
    const isAllReviewed = data.length === reviewCount

    setDialogState({
      open: true,
      title: !isAllReviewed ? 'Attention Required' : 'Are you sure?',
      description: () => (
        <span>
          {isAllReviewed
            ? 'Confirm to submit your review'
            : 'You have unreviewed entity suggestions. Rows that have not been reviewed will be rejected and will not be included in the analysis'}
        </span>
      ),
      onConfirm: () => {
        if (data.length === 0) {
          updateBulkSuggestions('reject')
        } else {
          updateSingleSuggestion(data)
        }
      },
      onOpenChange: () => {
        setDialogState({ open: false })
      },
    })
  }

  const allColumns: ColumnDef<Supplier>[] = [
    ...getPipelineColumns(currentScreeningType),
    {
      id: 'actions',
      meta: {
        filterVariant: 'none',
      },
      header: () => (
        <div className="flex items-center justify-end w-full">
          <p className="text-sm">Review Suggestion</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="-mr-1 size-7 shadow-none"
              >
                <EllipsisVertical
                  className="opacity-60"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p className="text-sm">Approve</p>
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-green-600  hover:bg-green-50 focus:bg-green-50 focus:text-green-600"
                onClick={() => handleBulkSuggestionClick('accept')}
              >
                <CheckCircle className="h-4 w-4 mr-0.5" />
                <span>Accept All Suggestions</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600  hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                onClick={() => handleBulkSuggestionClick('reject')}
              >
                <XCircle className="h-4 w-4 mr-0.5" />
                <span>Reject All Suggestions</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enablePinning: true,
      size: 180,
      cell: ({ row }) => {
        const supplier = row.original

        if (supplier.finalValidationStatus === 'AUTO_ACCEPT') {
          return null
        }

        if (supplier.finalValidationStatus === 'REVIEW') {
          return (
            <div className="flex items-center justify-center w-full">
              <RowActionButtons
                ensId={supplier.ensId || ''}
                actionCacheRef={actionCacheRef}
              />
            </div>
          )
        }

        if (
          supplier.finalValidationStatus === 'AUTO_REJECT' &&
          supplier.duplicateInSession === 'REMOVE'
        ) {
          return <span className="text-red-600 text-sm">Duplicate Match</span>
        }

        if (
          supplier.finalValidationStatus === 'AUTO_REJECT' &&
          supplier.validationStatus === 'NOT_VALIDATED'
        ) {
          return <span className="text-red-600 text-sm">Entity Not Found</span>
        }

        return null
      },
    },
  ]

  useEffect(() => {
    if (isAnalysisSuccess) {
      setActiveStep(4)
    }
  }, [isAnalysisSuccess])

  useEffect(() => {
    if (isBulkError || isSingleError || isAnalysisError) {
      toast.error('Something went wrong')
    }
  }, [isBulkError, isSingleError, isAnalysisError])

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {ValidationSummary.map((summary) => (
          <ValidationSummaryCard
            key={summary.label}
            {...summary}
            value={validationCount?.[summary.label] || 0}
          />
        ))}
      </div>

      <PaginatedTable<Supplier>
        endpoint={getApiUrl(
          `/api/get-validation-results-pipeline?session_id=${sessionId}&screening_type=${currentScreeningType}`
        )}
        columns={allColumns}
        isFrozen={
          isBulkPending || isSinglePending || isBulkSuccess || isSingleSuccess
        }
        initialSorting={[{ id: 'uploadedName', desc: false }]}
      />
      <div className="flex justify-end">
        <Button
          className="mt-8 min-w-[250px]"
          onClick={confirmReview}
          size={'lg'}
          disabled={
            isSinglePending ||
            isBulkPending ||
            isAnalysisPending ||
            isBulkError ||
            isSingleError ||
            isAnalysisError
          }
        >
          {isBulkPending || isSinglePending || isAnalysisPending ? (
            <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
          ) : (
            <>
              {isBulkSuccess || isSingleSuccess
                ? 'Start Analysis'
                : 'Confirm Review'}

              <ChevronRight size={16} />
            </>
          )}
        </Button>
      </div>
      <DialogueAlert {...dialogState} />
    </>
  )
}
