'use client';

import { CalendarIcon } from 'lucide-react';
import {
  Button,
  DateRangePicker,
  Dialog,
  Group,
  I18nProvider,
  Popover,
} from 'react-aria-components';
import { DateValue, parseDate } from '@internationalized/date';

import { cn } from '@/lib/utils';
import { RangeCalendar } from '@/components/ui/calendar-rac';
import { DateInput, dateInputStyle } from '@/components/ui/datefield-rac';

interface RangeValue<T extends DateValue> {
  start: T;
  end: T;
}

type DateRangePickerProps = {
  value: { startDate: string; endDate: string } | null;
  onChange: (range: { startDate: string; endDate: string }) => void;
};

export default function DateRangePickerComponent({
  value,
  onChange,
}: DateRangePickerProps) {
  const handleDateChange = (value: RangeValue<DateValue> | null) => {
    if (!value || !value.start || !value.end) return;

    const range = {
      startDate: value.start.toString(),
      endDate: value.end.toString(),
    };

    onChange(range);
  };

  const pickerValue = value
    ? {
        start: parseDate(value.startDate),
        end: parseDate(value.endDate),
      }
    : null;

  return (
    <I18nProvider locale="en-IN">
      <DateRangePicker
        className="*:not-first:mt-2"
        value={pickerValue}
        onChange={handleDateChange}
      >
        <div className="flex">
          <Group className={cn(dateInputStyle, 'pe-9')}>
            <DateInput slot="start" unstyled />
            <span aria-hidden="true" className="text-muted-foreground/70 px-2">
              -
            </span>
            <DateInput slot="end" unstyled />
          </Group>
          <Button className="text-muted-foreground/80 hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-ring/50 z-10 -ms-9 -me-px flex w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none data-focus-visible:ring-[3px]">
            <CalendarIcon size={16} />
          </Button>
        </div>
        <Popover
          className="bg-background text-popover-foreground data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 z-50 rounded-md border shadow-lg outline-hidden"
          offset={4}
        >
          <Dialog className="max-h-[inherit] overflow-auto p-2">
            <RangeCalendar />
          </Dialog>
        </Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}
