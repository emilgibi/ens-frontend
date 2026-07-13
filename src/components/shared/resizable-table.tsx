'use client'

import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowData,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Columns3Icon,
  PinOffIcon,
} from 'lucide-react'
import { CSSProperties, useMemo, useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, getColumnLabel } from '@/lib/utils'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '../ui/button'
import TableFilters from './table-filters'
import { Skeleton } from '../ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'

declare module '@tanstack/react-table' {
  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'select' | 'none'
    filterOptions?: {
      options: {
        label: string
        value: string
      }[]
    }
  }
}

type Props<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  noResultsText?: string
  isLoading?: boolean
  sorting: SortingState
  setSorting: (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState)
  ) => void
  otherElements?: React.ReactNode
  filterValues: Record<string, string | string[]>
  setFilterValues: (filters: Record<string, string | string[]>) => void
  endpoint?: string
}

const getPinningStyles = (column: Column<any>): CSSProperties => {
  const isPinned = column.getIsPinned()
  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  }
}

export default function ResizableTable<TData>({
  columns,
  data,
  onRowClick,
  noResultsText = 'No results.',
  isLoading = false,
  sorting,
  setSorting,
  otherElements,
  filterValues,
  setFilterValues,
  endpoint,
}: Readonly<Props<TData>>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    enableColumnPinning: true,
    globalFilterFn: 'includesString',
    initialState: {
      sorting: [
        {
          id: 'createTime',
          desc: true,
        },
      ],
    },
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      columnPinning: {
        right: ['actions'],
      },
    },
    enableSortingRemoval: false,
  })

  const handleFiltersChange = (filters: Record<string, string | string[]>) => {
    // Convert the filters to column filters format
    const newColumnFilters: ColumnFiltersState = Object.entries(filters)
      .filter(([_, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0
        }
        return value && value.trim() !== ''
      })
      .map(([columnId, value]) => ({
        id: columnId,
        value: Array.isArray(value) ? value.join(',') : value,
      }))

    setColumnFilters(newColumnFilters)
  }

  const actionFilters = useMemo(() => {
    return table.getAllColumns().filter((column) => {
      return (
        column.id === 'actions' &&
        column.columnDef.meta?.filterOptions?.options?.length
      )
    })
  }, [table])

  return (
    <div className="relative">
      {/* Toggle columns visibility */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableFilters
            table={table}
            onFiltersChange={handleFiltersChange}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
          />
          {!endpoint?.includes('get-session-info') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3Icon
                    className="opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Toggle Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {getColumnLabel(column)}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {otherElements}
        {actionFilters.length > 0 && (
          <div className="flex items-center gap-2">
            {actionFilters.map((filter) => {
              const filterOptions =
                filter.columnDef.meta?.filterOptions?.options
              return (
                <div className="flex items-center gap-2" key={filter.id}>
                  <Label className="text-sm font-medium">
                    {getColumnLabel(filter)}
                  </Label>
                  <Select
                    key={filter.id}
                    defaultValue={
                      filterOptions?.[filterOptions.length - 1]?.value || 'all'
                    }
                    onValueChange={(value) => {
                      setFilterValues({
                        ...filterValues,
                        [filter.id]: value,
                      })
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue
                        placeholder={getColumnLabel(filter)}
                        className="capitalize"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions?.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="capitalize"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-background overflow-hidden rounded-sm border">
          <Table
            className="table-fixed"
            style={
              {
                // width: table.getCenterTotalSize(),
              }
            }
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const { column } = header
                    const isPinned = column.getIsPinned()
                    const isLastLeftPinned =
                      isPinned === 'left' && column.getIsLastColumn('left')
                    const isFirstRightPinned =
                      isPinned === 'right' && column.getIsFirstColumn('right')
                    return (
                      <TableHead
                        key={header.id}
                        className="relative h-10 border-t  border-r  select-none last:[&>.cursor-col-resize]:opacity-0 [&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 truncate  data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-l"
                        aria-sort={
                          header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : 'none'
                        }
                        {...{
                          colSpan: header.colSpan,
                          style: {
                            width: header.getSize(),
                            ...getPinningStyles(column),
                          },
                        }}
                        data-pinned={isPinned || undefined}
                        data-last-col={
                          isLastLeftPinned
                            ? 'left'
                            : isFirstRightPinned
                            ? 'right'
                            : undefined
                        }
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              header.column.getCanSort() &&
                                'flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={(e) => {
                              // Enhanced keyboard handling for sorting
                              if (
                                header.column.getCanSort() &&
                                (e.key === 'Enter' || e.key === ' ')
                              ) {
                                e.preventDefault()
                                header.column.getToggleSortingHandler()?.(e)
                              }
                            }}
                            tabIndex={
                              header.column.getCanSort() ? 0 : undefined
                            }
                          >
                            <div className="flex items-center justify-center gap-2 w-full">
                              <div className="flex truncate">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </div>
                              {!header.isPlaceholder &&
                                header.column.getCanPin() &&
                                header.column.getIsPinned() && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="-mr-1 size-7 shadow-none"
                                    // onClick={() => header.column.pin(false)}
                                    // aria-label={`Unpin ${header.column.columnDef.header as string
                                    //   } column`}
                                    // title={`Unpin ${
                                    //   header.column.columnDef.header as string
                                    // } column`}
                                  >
                                    <PinOffIcon
                                      className="opacity-60"
                                      size={16}
                                      aria-hidden="true"
                                    />
                                  </Button>
                                )}

                              {{
                                asc: (
                                  <ChevronUpIcon
                                    className="shrink-0 opacity-60"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                ),
                                desc: (
                                  <ChevronDownIcon
                                    className="shrink-0 opacity-60"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                            {/* {header.column.getCanFilter() ? (
                              <div>{header.column.id}</div>
                            ) : null} */}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            {...{
                              onDoubleClick: () => header.column.resetSize(),
                              onMouseDown: header.getResizeHandler(),
                              onTouchStart: header.getResizeHandler(),
                              className:
                                'absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -right-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:translate-x-px',
                            }}
                          />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      onRowClick &&
                        'cursor-pointer transition-colors hover:bg-muted'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const { column } = cell
                      const isPinned = column.getIsPinned()
                      const isLastLeftPinned =
                        isPinned === 'left' && column.getIsLastColumn('left')
                      const isFirstRightPinned =
                        isPinned === 'right' && column.getIsFirstColumn('right')
                      return (
                        <TableCell
                          key={cell.id}
                          className="[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 truncate data-pinned:backdrop-blur-xs [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right][data-last-col=right]]:border-l text-center"
                          style={{ ...getPinningStyles(column) }}
                          data-pinned={isPinned || undefined}
                          data-last-col={
                            isLastLeftPinned
                              ? 'left'
                              : isFirstRightPinned
                              ? 'right'
                              : undefined
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <>
                  {!isLoading ? null : (
                    <>
                      {Array.from({ length: 12 }).map((_, rowIdx) => (
                        <TableRow key={`skeleton-row-${rowIdx}`}>
                          {table.getVisibleLeafColumns().map((col, colIdx) => (
                            <TableCell
                              key={`${col.id}-${colIdx}`}
                              className="py-3"
                            >
                              <Skeleton
                                className={
                                  colIdx === 0
                                    ? 'h-4 w-24'
                                    : colIdx ===
                                      table.getVisibleLeafColumns().length - 1
                                    ? 'h-4 w-16 ml-auto'
                                    : 'h-4 w-3/4'
                                }
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              )}

              {!isLoading && table.getRowModel().rows?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {noResultsText}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
