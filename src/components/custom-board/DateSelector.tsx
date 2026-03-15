import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DateSelectorProps {
  dateMode: '多日' | '段';
  onDateModeChange: (mode: '多日' | '段') => void;
  selectedDates: Date[];
  onSelectedDatesChange: (dates: Date[]) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  dateMode,
  onDateModeChange,
  selectedDates,
  onSelectedDatesChange,
  dateRange,
  onDateRangeChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const displayText = () => {
    if (dateMode === '多日') {
      if (selectedDates.length === 0) return '选择日期';
      if (selectedDates.length === 1) return format(selectedDates[0], 'yyyy-MM-dd');
      return `${selectedDates.length}天已选`;
    } else {
      if (!dateRange?.from) return '选择日期范围';
      if (!dateRange.to) return format(dateRange.from, 'yyyy-MM-dd');
      return `${format(dateRange.from, 'yyyy-MM-dd')} 至 ${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">运行日：</span>
      <div className="flex items-center bg-secondary p-0.5 rounded-md overflow-hidden">
        {(['多日', '段'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onDateModeChange(mode)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              dateMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-border min-w-[160px] justify-start bg-card font-normal"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            {displayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {dateMode === '多日' ? (
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(days) => onSelectedDatesChange(days || [])}
              className={cn('p-3 pointer-events-auto')}
              initialFocus
            />
          ) : (
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              className={cn('p-3 pointer-events-auto')}
              numberOfMonths={2}
              initialFocus
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
