'use client'

import { RiskBadge, RiskLevel } from '@/components/entity-universe/risk-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PaginatedTable } from '@/components/shared/dynamic-table'
import { ColumnDef, Row, Table } from '@tanstack/react-table'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getApiUrl } from '@/lib/utils'
import { useUpdateContinuousMonitoring } from '@/hooks/use-api'
import { CheckedState } from '@radix-ui/react-checkbox'
import { toast } from 'sonner'
import { ToastMessage } from '@/components/shared/toast-message'
import { countryMap } from '@/utils/countryMap'

type ContinuousMonitoringEntity = {
  id: string
  ensId: string
  name: string
  nationalId: string
  country: string
  address: string
  overallSupplierRating: string
  lastScreenedDate: Date
  status: string
}

type SelectedRow = {
  [key: string]: boolean
}

const columns: ColumnDef<ContinuousMonitoringEntity>[] = [
  {
    accessorKey: 'externalVendorId',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'nationalId',
    header: 'National ID',
  },
  {
    accessorKey: 'country',
    header: 'Country',
    cell: ({ row }) => {
      const country = row.getValue('country')
      return (
        <div>{countryMap[country as keyof typeof countryMap] ?? country}</div>
      )
    },
  },
  {
    accessorKey: 'address',
    header: 'Address',
  },
  {
    accessorKey: 'overallSupplierRating',
    header: 'Overall Supplier Rating',
    meta: {
      filterVariant: 'select',
      filterOptions: {
        options: [
          { label: 'High', value: 'High' },
          { label: 'Medium', value: 'Medium' },
          { label: 'Low', value: 'Low' },
        ],
      },
    },
    cell: ({ row }) => {
      const rating = row.getValue('overallSupplierRating')
      return <RiskBadge risk={rating as RiskLevel} />
    },
  },
  {
    accessorKey: 'lastScreenedDate',
    header: 'Last Screened Date',
    meta: {
      filterVariant: 'none',
    },
    cell: ({ row }) => {
      const date = row.getValue('lastScreenedDate') as string | number | Date
      return date ? new Date(date).toLocaleDateString() : 'N/A'
    },
  },
]

export default function ContinuousMonitoringConfigurationPage() {
  const [selectedRows, setSelectedRows] = useState<SelectedRow>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { mutate: updateContinuousMonitoring, isPending } =
    useUpdateContinuousMonitoring()

  const extraColumns: ColumnDef<ContinuousMonitoringEntity> = {
    id: 'actions',
    accessorKey: 'status',
    size: 120,
    enableSorting: false,
    enablePinning: false,
    header: ({ table }: { table: Table<ContinuousMonitoringEntity> }) => {
      const pageRows = table.getRowModel().rows
      const numSelectedRows = pageRows.filter((row) => {
        const ensId = row.original.ensId
        const state =
          selectedRows[ensId] !== undefined
            ? selectedRows[ensId]
            : row.original.status === 'ACTIVE'
        return !!state
      }).length
      const numPageRows = pageRows.length
      const allSelected = numPageRows > 0 && numSelectedRows === numPageRows
      const someSelected =
        numPageRows > 0 && numSelectedRows > 0 && numSelectedRows < numPageRows

      const selectAllState: CheckedState = allSelected
        ? true
        : someSelected
        ? 'indeterminate'
        : false

      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectAllState}
            onCheckedChange={(value) => {
              if (isSubmitted) setIsSubmitted(false)
              const checkedValue = value === true
              setSelectedRows((prev) => {
                const newSelectedRows = { ...prev }
                pageRows.forEach((row) => {
                  newSelectedRows[row.original.ensId] = checkedValue
                })
                return newSelectedRows
              })
            }}
            aria-label="Select all rows on this page"
            className="peer"
          />
          <span>Enable CM</span>
        </div>
      )
    },
    meta: {
      filterVariant: 'select',
      filterOptions: {
        options: [
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Inactive', value: 'INACTIVE' },
          { label: 'All', value: 'ALL' },
        ],
      },
    },
    cell: ({ row }: { row: Row<ContinuousMonitoringEntity> }) => {
      const ensId = row.original.ensId
      const checked =
        selectedRows[ensId] !== undefined
          ? selectedRows[ensId]
          : row.original.status === 'ACTIVE'

      return (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => {
            if (isSubmitted) setIsSubmitted(false)
            setSelectedRows((prev) => ({
              ...prev,
              [ensId]: value === true,
            }))
          }}
          aria-label="Select row"
        />
      )
    },
  }

  const allColumns = [
    ...columns,
    extraColumns,
  ] as ColumnDef<ContinuousMonitoringEntity>[]

  const handleSave = () => {
    const data = Object.entries(selectedRows).map(([ensId, status]) => ({
      ens_id: ensId,
      status,
    }))

    if (data.length > 100) {
      toast.custom(() => (
        <ToastMessage
          variant="warning"
          title="Max Entities Reached: 100"
          message="You can modify up to 100 entities at a time. Please reduce the number of entities you're trying to modify and try again"
        />
      ))
      return
    }

    updateContinuousMonitoring(
      { data },
      {
        onSuccess: () => {
          setRefreshKey((k) => k + 1)
          setSelectedRows({})
          setIsSubmitted(true)
          toast.custom(() => (
            <ToastMessage
              variant="success"
              title="Success"
              message="Continuous monitoring updated successfully"
            />
          ))
        },
        onError: (error: any) => {
          if (error.response?.status === 207) {
            setRefreshKey((k) => k + 1)
            setSelectedRows({})
            setIsSubmitted(true)
            toast.custom(() => (
              <ToastMessage
                variant="warning"
                title="Partial Success"
                message="Some entities updated successfully, while others failed."
              />
            ))
          } else if (error.response?.status === 500) {
            toast.custom(() => (
              <ToastMessage
                variant="error"
                title="Error"
                message="Failed to update continuous monitoring for all entities."
              />
            ))
          } else {
            toast.custom(() => (
              <ToastMessage
                variant="error"
                title="Error"
                message="Failed to update continuous monitoring"
              />
            ))
          }
        },
      }
    )
  }

  const handleDiscard = () => {
    setSelectedRows({})
    setIsSubmitted(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Configuration</h1>
        <p className="text-muted-foreground">
          Set up and configure entities to be tracked through continuous
          monitoring
        </p>
      </div>

      <Separator className="my-1" />
      <h1 className="text-lg font-bold">Configuration Details</h1>

      <PaginatedTable
        columns={allColumns}
        endpoint={getApiUrl('/api/continuous-monitoring')}
        initialSorting={[{ id: 'name', desc: false }]}
        refresh={refreshKey} // refresh key used in queryKey inside PaginatedTable
      />

      <div className="w-full flex justify-end gap-4">
        <Button
          variant="outline"
          className="min-w-[100px]"
          disabled={Object.keys(selectedRows).length === 0 || isPending}
          onClick={handleDiscard}
        >
          Discard
        </Button>
        <Button
          className="min-w-[100px]"
          disabled={
            Object.keys(selectedRows).length === 0 || isPending || isSubmitted
          }
          onClick={handleSave}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
