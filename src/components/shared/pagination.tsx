import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@/hooks/use-pagination';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useId } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
type PaginationProps = {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  paginationItemsToDisplay?: number;
  totalRecords?: number;
  pagesize?: number;
  recordsPerPage?: number;
  setRecordsPerPage: (size: number) => void;
};

export default function TablePagination({
  currentPage,
  setCurrentPage,
  paginationItemsToDisplay = 5,
  totalRecords = 0,
  pagesize = 10,
  recordsPerPage = 10,
  setRecordsPerPage,
}: PaginationProps) {
  const totalPages = Math.ceil(totalRecords / pagesize);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay,
  });
  const id = useId();

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pagesize + 1;
  const end = Math.min(currentPage * pagesize, totalRecords);

  return (
    <div className='flex items-center justify-between gap-4 mt-4 flex-wrap'>
      {/* Results per page */}
      <div>
        <div className='flex items-center gap-3'>
          <Label htmlFor={id}>Rows per page</Label>
          <Select
            defaultValue={String(recordsPerPage)}
            onValueChange={(value) => setRecordsPerPage(Number(value))}
          >
            <SelectTrigger id={id} className='w-fit whitespace-nowrap'>
              <SelectValue placeholder='Select number of results' />
            </SelectTrigger>
            <SelectContent className='[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2'>
              <SelectItem value='5'>5</SelectItem>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='25'>25</SelectItem>
              <SelectItem value='50'>50</SelectItem>
              <SelectItem value='100'>100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page number information */}
      <div className='text-muted-foreground flex  justify-end text-sm whitespace-nowrap'>
        <p
          className='text-muted-foreground text-sm whitespace-nowrap'
          aria-live='polite'
        >
          <span className='text-foreground'>
            Showing {start}-{end}
          </span>{' '}
          of <span className='text-foreground'>{totalRecords}</span>
        </p>
      </div>

      <div>
        <Pagination>
          <PaginationContent>
            {/* First page button */}
            <PaginationItem>
              <PaginationLink
                className='aria-disabled:pointer-events-none aria-disabled:opacity-50'
                onClick={() => setCurrentPage(1)}
                aria-label='Go to first page'
                aria-disabled={currentPage === 1 ? true : undefined}
                role={currentPage === 1 ? 'link' : undefined}
              >
                <ChevronFirstIcon size={16} aria-hidden='true' />
              </PaginationLink>
            </PaginationItem>
            {/* Previous page button */}
            <PaginationItem>
              <PaginationLink
                className='aria-disabled:pointer-events-none aria-disabled:opacity-50'
                onClick={() => setCurrentPage(currentPage - 1)}
                aria-label='Go to previous page'
                aria-disabled={currentPage === 1 ? true : undefined}
                role={currentPage === 1 ? 'link' : undefined}
              >
                <ChevronLeftIcon size={16} aria-hidden='true' />
              </PaginationLink>
            </PaginationItem>
            {/* Left ellipsis (...) */}
            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            {/* Page number links */}
            {pages.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}

            {/* Right ellipsis (...) */}
            {showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Next page button */}
            <PaginationItem>
              <PaginationLink
                className='aria-disabled:pointer-events-none aria-disabled:opacity-50'
                onClick={() => setCurrentPage(currentPage + 1)}
                aria-label='Go to next page'
                aria-disabled={currentPage === totalPages ? true : undefined}
                role={currentPage === totalPages ? 'link' : undefined}
              >
                <ChevronRightIcon size={16} aria-hidden='true' />
              </PaginationLink>
            </PaginationItem>
            {/* Last page button */}
            <PaginationItem>
              <PaginationLink
                className='aria-disabled:pointer-events-none aria-disabled:opacity-50'
                onClick={() => setCurrentPage(totalPages)}
                aria-label='Go to last page'
                aria-disabled={currentPage === totalPages ? true : undefined}
                role={currentPage === totalPages ? 'link' : undefined}
              >
                <ChevronLastIcon size={16} aria-hidden='true' />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Go to page input */}
      <div className='flex items-center gap-3'>
        <Label htmlFor={id} className='whitespace-nowrap'>
          Go to page
        </Label>
        <Input
          id={id}
          type='text'
          className='w-20'
          placeholder={`1-${totalPages}`}
          defaultValue={currentPage}
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (value > totalPages || value < 1 || isNaN(value)) {
              setCurrentPage(1);
            } else {
              setCurrentPage(value);
            }
          }}
        />
      </div>
    </div>
  );
}
