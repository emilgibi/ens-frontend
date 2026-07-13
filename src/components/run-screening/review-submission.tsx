import { useEffect } from 'react'

import { ColumnDef } from '@tanstack/react-table'
import { ChevronRight, Loader2 } from 'lucide-react'
import useWebSocket from 'react-use-websocket'
import { toast } from 'sonner'

import { useWizard } from '@/contexts/wizard-context'
import {
  normalizeStatus,
  useSessionEvents,
  useSessionInfo,
  useSessionStatus,
  useTriggerSupplierValidation,
} from '@/hooks/use-api'
import { getApiUrl } from '@/lib/utils'

import { PaginatedTable } from '../shared/dynamic-table'
import { ToastMessage } from '../shared/toast-message'
import { Button } from '../ui/button'
import { getScreeningEndpoints } from '@/constants/api-endpoints'
import { ScreeningType } from '@/types'

// The proxy at /api/get-supplier-data-pipeline forwards the Python backend's
// JSON response as-is — it does NOT camelCase it. Each backend also selects
// a different, pipeline-specific set of columns (see
// get_session_supplier() in each backend's app/core/supplier/supplier.py),
// so both the field names AND their casing differ from the old
// Probe42-only, camelCase column set that used to live here.

type DomesticSupplierRow = {
  uploaded_name: string
  uploaded_external_vendor_id: string
  uploaded_identifier: string
  uploaded_entity_type: string
  uploaded_identifier_type: string
  uploaded_client_onboarding_date: string
  uploaded_client_msme_status: string
  uploaded_client_z_altman_type: string
  uploaded_address: string
}

type InternationalSupplierRow = {
  uploaded_name: string
  uploaded_external_vendor_id: string
  uploaded_name_international: string
  uploaded_country: string
  uploaded_national_id: string
  uploaded_state: string
  uploaded_city: string
  uploaded_postcode: string
  uploaded_address_type: string
  uploaded_address: string
}

const domesticColumns: ColumnDef<DomesticSupplierRow>[] = [
  { accessorKey: 'uploaded_external_vendor_id', header: 'ID', size: 150 },
  { accessorKey: 'uploaded_name', header: 'Name' },
  { accessorKey: 'uploaded_identifier', header: 'Identifier' },
  { accessorKey: 'uploaded_entity_type', header: 'Entity Type' },
  { accessorKey: 'uploaded_identifier_type', header: 'Identifier Type' },
  {
    accessorKey: 'uploaded_client_onboarding_date',
    header: 'Onboarding Date',
    size: 140,
    cell: ({ row }) => {
      const date = row.getValue('uploaded_client_onboarding_date') as string
      return <span className="text-sm">{formatDate(date)}</span>
    },
  },
  { accessorKey: 'uploaded_client_msme_status', header: 'Msme Status' },
  { accessorKey: 'uploaded_client_z_altman_type', header: 'Client Z-Altman Type' },
  {
    accessorKey: 'uploaded_address',
    header: 'Address',
    size: 250,
    cell: ({ row }) => {
      const address = row.getValue('uploaded_address') as string
      return address ? (
        <div className="w-full text-sm whitespace-normal break-words">
          {address}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
  },
]

const internationalColumns: ColumnDef<InternationalSupplierRow>[] = [
  { accessorKey: 'uploaded_external_vendor_id', header: 'ID', size: 150 },
  { accessorKey: 'uploaded_name', header: 'Name' },
  { accessorKey: 'uploaded_name_international', header: 'International Name' },
  { accessorKey: 'uploaded_country', header: 'Country', size: 100 },
  { accessorKey: 'uploaded_national_id', header: 'National ID' },
  { accessorKey: 'uploaded_state', header: 'State' },
  { accessorKey: 'uploaded_city', header: 'City' },
  { accessorKey: 'uploaded_postcode', header: 'Postcode', size: 120 },
  { accessorKey: 'uploaded_address_type', header: 'Address Type', size: 130 },
  {
    accessorKey: 'uploaded_address',
    header: 'Address',
    size: 250,
    cell: ({ row }) => {
      const address = row.getValue('uploaded_address') as string
      return address ? (
        <div className="w-full text-sm whitespace-normal break-words">
          {address}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
  },
]

function getColumns(screeningType: ScreeningType): ColumnDef<any>[] {
  return screeningType === 'international' ? internationalColumns : domesticColumns
}

export default function ReviewSubmission() {
  const { sessionId, setActiveStep, screeningType } = useWizard()
  const currentSessionId = sessionId ?? ''
  const { data: sessionInfo } = useSessionInfo(sessionId)
  const { data: sessionStatus } = useSessionStatus(sessionId, sessionInfo?.overallStatus)

  const {
    mutate: triggerSupplierValidation,
    isPending,
    isError,
    error,
    isSuccess,
  } = useTriggerSupplierValidation(currentSessionId, screeningType ?? 'domestic')

  const { lastMessage } = useWebSocket(
    sessionId
      ? `${getScreeningEndpoints(screeningType ?? 'domestic').STREAM_SESSION_EVENTS(sessionId)}`
      : null,
    {
      shouldReconnect: () => true, // Auto-reconnect on close
    }
  )
  useSessionEvents(sessionId)

  console.log("last message", lastMessage)
  useEffect(() => {
    if (lastMessage) {
      if (
        !lastMessage?.data ||
        typeof lastMessage.data !== 'string' ||
        !lastMessage.data.trim()
      ) {
        return
      }

      try {
        const data = JSON.parse(lastMessage.data)
        if (data.session_id !== sessionId) return

        const validationStatus = normalizeStatus(
          data.supplier_name_validation_status
        )
        const effectiveOverallStatus =
          normalizeStatus(sessionStatus) ||
          normalizeStatus(sessionInfo?.overallStatus)

        if (validationStatus === 'COMPLETED') {
          setActiveStep(3)
        } else if (
          validationStatus === 'FAILED' ||
          effectiveOverallStatus === 'FAILED'
        ) {
          toast.custom(
            () => (
              <ToastMessage
                variant="error"
                title="Error"
                message={
                  'Supplier name validation failed: Please re-check the uploaded data and try again'
                }
              />
            ),
            {
              closeButton: true,
              duration: Infinity,
            }
          )
          setActiveStep(1)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }
  }, [lastMessage, sessionId, setActiveStep, sessionStatus, sessionInfo?.overallStatus])

  const handleClick = () => {
    triggerSupplierValidation()
  }

  if (isError) {
    toast.custom(() => (
      <ToastMessage
        variant="error"
        title="Error"
        message={error.message || 'Failed to validate uploaded entity list'}
      />
    ))
  }

  return (
    <>
      <PaginatedTable
        endpoint={getApiUrl(
          `/api/get-supplier-data-pipeline?session_id=${sessionId}&screening_type=${screeningType ?? 'domestic'}`
        )}
        columns={getColumns(screeningType ?? 'domestic')}
        isFrozen={isPending || isSuccess}
        initialSorting={[{ id: 'uploaded_name', desc: false }]}
      />
      <div className="flex justify-end mt-8">
        <Button
          disabled={isPending || isSuccess || isError}
          onClick={handleClick}
          className="cursor-pointer min-w-[250px]"
          size={'lg'}
        >
          {isPending || isSuccess ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <span>Validate Uploaded Entity List</span>
              <ChevronRight size={16} />
            </>
          )}
        </Button>
      </div>
    </>
  )
}


const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return '-'
    }

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
  } catch (error) {
    return '-'
  }
}
