'use client';

import { useEffect, useMemo, useState } from 'react';
import { Column, Table } from '@tanstack/react-table';
import { Filter, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { getColumnLabel, getApiUrl } from '@/lib/utils';

import { Label } from '../ui/label';
import InputWithClear from './clearable-input';
import MultipleSelector from '../ui/multi-select';
import { countryMap } from '@/utils/countryMap';

export interface TableFiltersProps<TData> {
  table: Table<TData>;
  onFiltersChange: (filters: Record<string, string | string[]>) => void;
  className?: string;
  filterValues: Record<string, string | string[]>;
  setFilterValues: (filters: Record<string, string | string[]>) => void;
}

export default function TableFilters<TData>({
  table,
  onFiltersChange,
  className,
  filterValues,
  setFilterValues,
}: TableFiltersProps<TData>) {
  const filterableColumns = useMemo(() => {
    return table.getAllColumns().filter((column) => {
      return column.columnDef.meta?.filterVariant !== 'none';
    });
  }, [table]);
  const [countries, setCountries] = useState<
    Array<{ label: string; value: string; key: string }>
  >([]);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const response = await fetch(getApiUrl('/api/countries'));
        if (response.ok) {
          const data = await response.json();
          const options = data.countries
            .map((country: string) => ({
              label: countryMap[country as keyof typeof countryMap] ?? country,
              value: countryMap[country as keyof typeof countryMap] ?? country,
              key: country,
            }))
            .sort((a: { label: string }, b: { label: string }) =>
              a.label.localeCompare(b.label),
            );
          setCountries(options);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    }

    fetchCountries();
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filterValues).some(([key, value]) => {
      // Skip action filters as they're handled separately
      if (key === 'actions') return false;

      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value && value.trim() !== '';
    });
  }, [filterValues]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filterValues).reduce((count, [key, value]) => {
      // Skip action filters in the count
      if (key === 'actions') return count;

      if (Array.isArray(value)) {
        return count + value.length;
      }
      return count + (value && value.trim() !== '' ? 1 : 0);
    }, 0);
  }, [filterValues]);

  const handleFilterChange = (columnId: string, value: string | string[]) => {
    const newFilters = {
      ...filterValues,
      [columnId]: value,
    };

    if (value.length === 0) {
      delete newFilters[columnId];
    }

    setFilterValues(newFilters);
    onFiltersChange(newFilters);
  };

  const handleTextFilterChange = (columnId: string, value: string) => {
    handleFilterChange(columnId, value);
  };

  const clearAllFilters = () => {
    setFilterValues({});
    onFiltersChange({});
  };

  const renderFilterInput = (column: Column<TData>) => {
    const columnId = column.id;
    let variant = column.columnDef.meta?.filterVariant;

    if (columnId === 'country' && countries.length > 0) {
      variant = 'select';
    }

    const defaultValue = filterValues[columnId];

    if (variant === 'select') {
      let options = column.columnDef.meta?.filterOptions?.options;

      if (columnId === 'country') {
        options = countries;
      }
      if (options?.length === 0) return null;

      const valueOptions = options?.filter(
        (option: { label: string; value: string; key?: string }) => {
          if (Array.isArray(defaultValue)) {
            if (columnId === 'country') {
              return defaultValue.includes(option.key as string);
            }
            return defaultValue.includes(option.value);
          }

          if (columnId === 'country') {
            return defaultValue === option.key || defaultValue === option.value;
          }
          return defaultValue === option.value || defaultValue === option.label;
        },
      );

      return (
        <MultipleSelector
          commandProps={{
            label: `Select ${getColumnLabel(column)}...`,
          }}
          onChange={(value) => {
            if (columnId === 'country') {
              handleFilterChange(
                columnId,
                value.map((v) => v.key as string),
              );
              return;
            }

            handleFilterChange(
              columnId,
              value.map((v) => v.value),
            );
          }}
          value={valueOptions}
          defaultOptions={options}
          placeholder={`Select ${getColumnLabel(column)}...`}
          hidePlaceholderWhenSelected
          emptyIndicator={
            <p className="text-center text-sm">Nothing to select</p>
          }
        />
      );
    }

    return (
      <InputWithClear
        value={defaultValue ?? ''}
        placeholder={`Search by ${getColumnLabel(column)}...`}
        onChange={(e) => handleTextFilterChange(columnId, e.target.value)}
        onClear={() => handleTextFilterChange(columnId, '')}
      />
    );
  };

  if (filterableColumns.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className={className}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-4xl lg:max-w-6xl" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filterableColumns
              .filter((column) => column.id !== 'actions')
              .map((column) => (
                <div key={column.id}>
                  <Label className="text-sm font-medium mb-1 block">
                    {getColumnLabel(column)}
                  </Label>
                  {renderFilterInput(column)}
                </div>
              ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
