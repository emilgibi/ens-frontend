'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Plus, Save } from 'lucide-react'
import { PeriodicMonitoringInfo } from '@/components/shared/periodic-monitoring-info'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  PeriodicMonitoringConfig,
  PeriodicMonitoringFormData,
  periodicMonitoringFormSchema,
} from '@/lib/definitions'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn, getApiUrl } from '@/lib/utils'
import { RiskBadge, RiskLevel } from '../entity-universe/risk-badge'
import { ColumnDef, Table } from '@tanstack/react-table'
import { PaginatedTable } from '../shared/dynamic-table'
import { Checkbox } from '../ui/checkbox'
import { useState, useCallback, useRef, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { periodicMonitoringConfiguration } from '@/actions/periodic-monitoring'
import { useQueryClient } from '@tanstack/react-query'
import { ToastMessage } from '../shared/toast-message'
import { useRouter } from 'next/navigation'
import { countryMap } from '@/utils/countryMap'
import { CheckedState } from '@radix-ui/react-checkbox'

export default function PeriodicMonitoringConfiguration({
  config,
  groupId,
  count,
}: {
  config: PeriodicMonitoringConfig | null
  groupId: string
  count: number
}) {
  const [ensIdStatus, setEnsIdStatus] = useState<{
    [key: string]: boolean
  }>({})
  const [formState, setFormState] = useState({
    isDirty: false,
    isValid: false,
  })
  const [isPending, startTransition] = useTransition()
  const formSubmitRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const queryClient = useQueryClient()

  const handleSubmitAll = useCallback(
    async (formData: PeriodicMonitoringFormData) => {
      startTransition(async () => {
        try {
          const groupId = config?.groupId ?? 'new'
          const payload = {
            ...formData,
            selectedEntities: Object.entries(ensIdStatus).map(
              ([ensId, isActive]) => ({
                ensId,
                isActive,
              })
            ),
            groupId,
          }

          const response = await periodicMonitoringConfiguration(payload)
          if (response.success) {
            toast.custom(() => (
              <ToastMessage
                variant="success"
                title="Success"
                message={
                  groupId === 'new'
                    ? 'Group created successfully'
                    : 'Group updated successfully'
                }
              />
            ))

            queryClient.invalidateQueries({ queryKey: ['table-data'] })
            queryClient.invalidateQueries({ queryKey: ['periodic-groups'] })
            router.push(`/periodic-monitoring/view-groups`)
          } else {
            throw new Error(response.error)
          }
        } catch (error) {
          console.error('Error submitting configuration:', error)
          toast.custom(() => (
            <ToastMessage
              variant="error"
              title="Error"
              message={error instanceof Error ? error.message : 'Unknown error'}
            />
          ))
        }
      })
    },
    [ensIdStatus, config]
  )

  const hasChanges = formState.isDirty || Object.values(ensIdStatus).length > 0
  const canSubmit = hasChanges && formState.isValid && !isPending

  const handleHeaderButtonClick = () => {
    const addedEntities = Object.values(ensIdStatus).filter(
      (status) => status
    ).length
    const removedEntities = Object.values(ensIdStatus).filter(
      (status) => !status
    ).length
    const totalCount = count - removedEntities + addedEntities
    if (totalCount > 500) {
      toast.custom(() => (
        <ToastMessage
          variant="warning"
          title="Max Entities Reached: 500"
          message="You can only add up to 500 entities to a group. Please reduce the number of entities or create more groups for your use-case"
        />
      ))
      return
    }

    if (formSubmitRef.current) {
      formSubmitRef.current.requestSubmit()
    }
  }

  return (
    <Card className="pt-0 relative">
      <CardHeader className="mb-4">
        <div className="absolute inset-x-0 top-0  rounded-t-xl px-4 py-4 sm:px-6">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-md font-semibold text-nowrap">
              Group Management
            </h3>
            <div className="w-full flex justify-end gap-4">
              <Button
                variant="outline"
                className="min-w-[100px]"
                disabled={Object.keys(ensIdStatus).length === 0 || isPending}
                onClick={() => setEnsIdStatus({})}
              >
                Discard
              </Button>
              <Button disabled={!canSubmit} onClick={handleHeaderButtonClick}>
                {isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {config?.groupId === 'new' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    {!config ? (
                      <Plus className="mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {!config ? 'Create New Group' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-8">
        <Configuration
          config={config}
          onSubmit={handleSubmitAll}
          onFormStateChange={setFormState}
          formSubmitRef={formSubmitRef as React.RefObject<HTMLFormElement>}
        />
        <AssociatedEntities
          ensIdStatus={ensIdStatus}
          setEnsIdStatus={setEnsIdStatus}
          groupId={groupId}
          isPending={isPending}
          count={count}
        />
      </CardContent>
    </Card>
  )
}

const AssociatedEntities = ({
  ensIdStatus,
  setEnsIdStatus,
  groupId,
  isPending,
  count,
}: {
  ensIdStatus: { [key: string]: boolean }
  setEnsIdStatus: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >
  groupId: string
  isPending: boolean
  count: number
}) => {
  const columns = [
    {
      accessorKey: 'externalVendorId',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 250,
    },
    {
      accessorKey: 'nationalId',
      header: 'National ID',
    },
    {
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }: { row: { original: Entity } }) => {
        const country = row.original.country
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
      cell: ({ row }: { row: { original: Entity } }) => {
        const rating = row.original.overallSupplierRating
        return <RiskBadge risk={rating as RiskLevel} />
      },
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
    },
    {
      accessorKey: 'lastScreenedDate',
      header: 'Last Screened Date',
      meta: {
        filterVariant: 'none',
      },
    },
    {
      id: 'actions',
      size: 150,
      meta: {
        filterVariant: 'select',
        filterOptions: {
          options: [
            { label: 'In Group', value: 'inGroup' },
            { label: 'Not In Group', value: 'notInGroup' },
            { label: 'All', value: 'all' },
          ],
        },
      },
      enableSorting: false,
      header: ({ table }: { table: Table<Entity> }) => {
        const pageRows = table.getRowModel().rows
        const numSelectedRows = pageRows.filter((row) => {
          const ensId = row.original.ensId
          const state =
            ensIdStatus[ensId] !== undefined
              ? ensIdStatus[ensId]
              : groupId === row.original.groupId
          return !!state
        }).length
        const numPageRows = pageRows.length
        const allSelected = numPageRows > 0 && numSelectedRows === numPageRows
        const someSelected =
          numPageRows > 0 &&
          numSelectedRows > 0 &&
          numSelectedRows < numPageRows

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
                const checkedValue = value === true
                setEnsIdStatus((prev) => {
                  const newEnsIdStatus = { ...prev }
                  pageRows.forEach((row) => {
                    newEnsIdStatus[row.original.ensId] = checkedValue
                  })
                  return newEnsIdStatus
                })
              }}
              aria-label="Select all rows on this page"
              className="peer"
            />
            <span>Entity Status</span>
          </div>
        )
      },
      cell: ({ row }: { row: { original: Entity } }) => {
        const ensId = row.original.ensId
        const isChecked =
          ensId in ensIdStatus
            ? ensIdStatus[ensId]
            : groupId === row.original.groupId

        return (
          <div className="flex items-center justify-center gap-2">
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked) => {
                setEnsIdStatus((prev: { [key: string]: boolean }) => ({
                  ...prev,
                  [ensId]: checked as boolean,
                }))
              }}
              aria-label="Select entity for monitoring"
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="my-6">
      <h4 className="text-lg font-semibold mb-4">
        {groupId === 'new'
          ? 'Select Entities'
          : `Associated Entities (${count})`}
      </h4>
      <PaginatedTable
        columns={columns as ColumnDef<Entity>[]}
        endpoint={
          groupId === 'new'
            ? getApiUrl('/api/entity-universe')
            : getApiUrl(`/api/entity-universe-by-group?groupId=${groupId}`)
        }
        initialSorting={[{ id: 'name', desc: false }]}
        isFrozen={isPending}
        noResultsText="No entities matched the chosen criteria"
      />
    </div>
  )
}

const frequencyMaxValues = {
  HOUR: 23,
  DAY: 30,
  WEEK: 12,
  MONTH: 11,
  QUARTER: 1,
  YEAR: 2,
}

const Configuration = ({
  config,
  onSubmit,
  onFormStateChange,
  formSubmitRef,
}: {
  config: PeriodicMonitoringConfig | null
  onSubmit: (data: PeriodicMonitoringFormData) => Promise<void>
  onFormStateChange: (state: { isDirty: boolean; isValid: boolean }) => void
  formSubmitRef: React.RefObject<HTMLFormElement>
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    control,
    reset,
  } = useForm<PeriodicMonitoringFormData>({
    resolver: zodResolver(periodicMonitoringFormSchema),
    defaultValues: {
      groupName: config?.groupName || '',
      groupDescription: config?.groupDescription || '',
      status: config?.status?.toLowerCase() || 'active',
      startDate: config?.startDate ? new Date(config.startDate) : new Date(),
      frequency: config?.frequency || 1,
      interval: config?.interval || 'WEEK',
    },
  })

  const watchedValues = useWatch({
    control,
    name: [
      'status',
      'frequency',
      'interval',
      'startDate',
      'groupDescription',
      'groupName',
    ],
  })
  const [
    watchedStatus,
    watchedFrequency,
    watchedInterval,
    watchedStartDate,
    watchedGroupDescription,
    watchedGroupName,
  ] = watchedValues

  // useWatch
  useEffect(() => {
    onFormStateChange({ isDirty, isValid })
  }, [isDirty, isValid, onFormStateChange])

  const handleFormSubmit = async (data: PeriodicMonitoringFormData) => {
    await onSubmit(data)
    reset(data)
  }

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="1"
      className="w-full space-y-2 mb-8"
    >
      <AccordionItem
        value={'1'}
        className="bg-background has-focus-visible:border-ring  rounded-md border px-4 py-1 outline-none last:border-b "
      >
        <AccordionTrigger className="px-2 py-4 text-[15px] text-md leading-6 hover:no-underline focus-visible:ring-0">
          {!config ? 'Create Group' : 'Edit Group'}
        </AccordionTrigger>
        <AccordionContent className="px-2">
          <form ref={formSubmitRef} onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-6 w-full grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">
                  Name
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="groupName"
                  placeholder="Enter Group Name"
                  {...register('groupName')}
                  className={cn(errors.groupName && 'border-destructive')}
                  maxLength={50}
                />
                {(watchedGroupName?.length || 0) > 40 && (
                  <p className="text-sm text-muted-foreground text-right">
                    {watchedGroupName?.length || 0}/50
                  </p>
                )}
                {errors.groupName && (
                  <p className="text-destructive text-sm">
                    {errors.groupName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold">Status</Label>
                <div className="flex items-center justify-between h-9 w-full px-4 border border-gray-300 rounded-md ">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {watchedStatus.toLowerCase() === 'active'
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>
                  <Switch
                    checked={watchedStatus.toLowerCase() === 'active'}
                    onCheckedChange={(checked) =>
                      setValue('status', checked ? 'ACTIVE' : 'INACTIVE', {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                  />
                </div>
              </div>

              {/* Calendar/Date Picker */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>Start Date</Label>
                  <PeriodicMonitoringInfo />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-transparent"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedStartDate
                        ? format(watchedStartDate, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      required={true}
                      selected={watchedStartDate}
                      disabled={(date) => {
                        const now = new Date()
                        const todayAt9pmUTC = new Date(
                          Date.UTC(
                            now.getUTCFullYear(),
                            now.getUTCMonth(),
                            now.getUTCDate(),
                            21,
                            0,
                            0,
                            0
                          )
                        )

                        // If current time is past today's 9 PM UTC, disable today
                        if (now > todayAt9pmUTC) {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          tomorrow.setHours(0, 0, 0, 0)
                          return date < tomorrow
                        }

                        // Otherwise, disable dates before today
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      onSelect={(date) => {
                        if (!date) return

                        const selectedDate = new Date(date)

                        // Create a date object for 9 PM UTC on the selected day
                        const newStartDate = new Date(
                          Date.UTC(
                            selectedDate.getUTCFullYear(),
                            selectedDate.getUTCMonth(),
                            selectedDate.getUTCDate(),
                            21,
                            0,
                            0,
                            0
                          )
                        )

                        // Check if the user's current time is past 9 PM UTC on the selected date
                        const now = new Date()
                        if (now > newStartDate) {
                          // If so, move to the next day
                          newStartDate.setUTCDate(newStartDate.getUTCDate() + 1)
                        }

                        setValue('startDate', newStartDate, {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-destructive text-sm">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="frequency" className="text-sm font-medium">
                  Repeat every
                </Label>
                <div className="flex items-center gap-2 w-full">
                  <Select
                    defaultValue={
                      watchedFrequency > frequencyMaxValues[watchedInterval]
                        ? '1'
                        : watchedFrequency.toString()
                    }
                    value={
                      watchedFrequency > frequencyMaxValues[watchedInterval]
                        ? '1'
                        : watchedFrequency.toString()
                    }
                    onValueChange={(value) =>
                      setValue('frequency', parseInt(value), {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({
                        length: frequencyMaxValues[watchedInterval],
                      }).map((_, index) => (
                        <SelectItem
                          key={index}
                          value={`${index + 1}`.toString()}
                        >
                          {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={watchedInterval}
                    onValueChange={(value) =>
                      setValue('interval', value as any, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* <SelectItem value="HOUR">
                        {watchedFrequency > 1 ? 'Hours' : 'Hour'}
                      </SelectItem> */}
                      <SelectItem value="DAY">
                        {watchedFrequency > 1 ? 'Days' : 'Day'}
                      </SelectItem>
                      <SelectItem value="WEEK">
                        {watchedFrequency > 1 ? 'Weeks' : 'Week'}
                      </SelectItem>
                      <SelectItem value="MONTH">
                        {watchedFrequency > 1 ? 'Months' : 'Month'}
                      </SelectItem>
                      <SelectItem value="QUARTER">
                        {watchedFrequency > 1 ? 'Quarters' : 'Quarter'}
                      </SelectItem>
                      <SelectItem value="YEAR">
                        {watchedFrequency > 1 ? 'Years' : 'Year'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.frequency && (
                  <p className="text-destructive text-sm">
                    {errors.frequency.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="groupDescription">
                  Description
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="groupDescription"
                  placeholder="Enter Group Description"
                  className="min-h-[100px]"
                  {...register('groupDescription')}
                  maxLength={500}
                />
                {(watchedGroupDescription?.length || 0) > 400 && (
                  <p className="text-sm text-muted-foreground text-right">
                    {watchedGroupDescription?.length || 0}/500
                  </p>
                )}
              </div>
              {errors.groupDescription && (
                <p className="text-destructive text-sm">
                  {errors.groupDescription.message}
                </p>
              )}

              {config?.groupId && (
                <div className="space-y-2">
                  <Label htmlFor="groupId">Group ID</Label>
                  <Input
                    id="groupId"
                    value={config.groupId}
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

type Entity = {
  ensId: string
  externalVendorId?: string
  name: string
  nationalId?: string
  country?: string
  address?: string
  overallSupplierRating?: RiskLevel
  lastScreenedDate?: Date
  groupId?: string
}
