'use client';

import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { LockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import TablePagination from './pagination';
import ResizableTable from './resizable-table';
import { ToastMessage } from './toast-message';
import axios from 'axios';
import { useDebouncedValue } from '@mantine/hooks';

type PaginatedTableProps<T> = {
  columns: ColumnDef<T>[];
  endpoint: string;
  onRowClick?: (row: T) => void;
  isFrozen?: boolean;
  otherElements?: React.ReactNode;
  initialSorting?: SortingState;
  defaultFilters?: Record<string, string | string[]>;
  noResultsText?: string;
  refresh?: number | string | boolean; // added
};

interface TableResponse<T> {
  data: T[];
  totalRecords: number;
}

export function PaginatedTable<T>({
  columns,
  endpoint,
  onRowClick,
  isFrozen = false,
  otherElements,
  initialSorting,
  defaultFilters,
  noResultsText,
  refresh,
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sorting, setSorting] = useState<SortingState>(initialSorting || []);
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[]>
  >(defaultFilters || {});
  const [debouncedFilterValues] = useDebouncedValue(filterValues, 500); // 500ms

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    pageSize: recordsPerPage.toString(),
    sortBy: sorting[0]?.id || 'id',
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const separator = endpoint.includes('?') ? '&' : '?';
  const queryUrl = `${endpoint}${separator}${queryParams.toString()}`;

  const queryKey = ['table-data', endpoint, currentPage, recordsPerPage, sorting, debouncedFilterValues, refresh]

  const { data, isLoading, isError } = useQuery<TableResponse<T>>({
    queryKey,
    queryFn: async () => {
      const response = await axios.post(queryUrl, {
        filters: filterValues,
      });
      return response.data;
    },
  });

  if (isError) {
    toast.custom(() => (
      <ToastMessage
        variant={'error'}
        title="Failed to fetch data"
        message="Please try again."
      />
    ));
  }

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedFilterValues]);

  return (
    <div className="relative">
      {isFrozen && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center  bg-white/50  select-none pointer-events-auto cursor-not-allowed dark:bg-black/50">
          <LockIcon className="w-6 h-6" />
        </div>
      )}
      <ResizableTable
        columns={columns}
        data={data?.data || []}
        onRowClick={onRowClick}
        isLoading={isLoading}
        sorting={sorting}
        setSorting={setSorting}
        otherElements={otherElements}
        filterValues={filterValues}
        setFilterValues={setFilterValues}
        noResultsText={noResultsText}
        endpoint={endpoint}
      />
      <TablePagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalRecords={data?.totalRecords || 0}
        pagesize={recordsPerPage}
        setRecordsPerPage={setRecordsPerPage}
      />
    </div>
  );
}
