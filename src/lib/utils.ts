import { Column } from '@tanstack/react-table';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

// Utility function to format UTC date to user's timezone
export function formatDateToUserTimezone(utcDateString: string | null, fallback: string = 'N/A'): string {
  if (!utcDateString) return fallback;

  try {
    const date = new Date(utcDateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

export function getPaginationAndSorting<T extends string>(
  searchParams: URLSearchParams,
) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  return { page, pageSize, sortBy, sortOrder };
}

export function toTitleCaseFromCamel(str: string) {
  if (!str) return '';

  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export const getColumnLabel = (column: Column<any>) => {
  const columnDef = column.columnDef;
  const header = columnDef.header;
  if (typeof header === 'function') {
    return toTitleCaseFromCamel(column.id as string);
  }
  return header;
};

export function getApiUrl(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
