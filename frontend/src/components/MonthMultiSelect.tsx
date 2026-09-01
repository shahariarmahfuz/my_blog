import React, { useState, useRef, useEffect } from 'react';
import { MonthScheduleItem } from '../types';

interface MonthMultiSelectProps {
  months: MonthScheduleItem[];
  selectedMonths: string[];
  onSelectionChange: (selected: string[]) => void;
  monthlyAmount: number;
  disabled?: boolean;
  loading?: boolean;
}

const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
  months,
  selectedMonths,
  onSelectionChange,
  monthlyAmount,
  disabled = false,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group months by year
  const yearGroups = months.reduce((acc, m) => {
    if (!acc[m.year]) acc[m.year] = [];
    acc[m.year].push(m);
    return acc;
  }, {} as Record<number, MonthScheduleItem[]>);

  const toggle = (monthStr: string) => {
    if (selectedMonths.includes(monthStr)) {
      onSelectionChange(selectedMonths.filter((s) => s !== monthStr));
    } else {
      onSelectionChange([...selectedMonths, monthStr]);
    }
  };

  const selectAllUnpaid = () => {
    const unpaid = months.filter((m) => !m.is_paid).map((m) => m.month);
    onSelectionChange(unpaid);
  };

  const clearAll = () => onSelectionChange([]);

  const selectYear = (year: number) => {
    const yearMonths = yearGroups[year]
      .filter((m) => !m.is_paid)
      .map((m) => m.month);
    const allSelected = yearMonths.every((m) => selectedMonths.includes(m));
    if (allSelected) {
      onSelectionChange(selectedMonths.filter((m) => !yearMonths.includes(m)));
    } else {
      const merged = [...new Set([...selectedMonths, ...yearMonths])];
      onSelectionChange(merged);
    }
  };

  const selectedCount = selectedMonths.length;
  const totalAmount = selectedCount * monthlyAmount;

  const getStatusBadge = (m: MonthScheduleItem) => {
    if (m.is_paid && m.is_advance_paid)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
          Advance Paid
        </span>
      );
    if (m.is_paid)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          Paid
        </span>
      );
    if (m.is_overdue)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
          Overdue
        </span>
      );
    if (m.is_current)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
          Current
        </span>
      );
    if (m.is_future)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          Future
        </span>
      );
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
        Due
      </span>
    );
  };

  // Build summary label for the trigger
  const summaryLabel = (() => {
    if (selectedCount === 0) return 'Select Months';
    if (selectedCount === 1) {
      const found = months.find((m) => m.month === selectedMonths[0]);
      return found?.short_label || '1 month';
    }
    if (selectedCount <= 3) {
      return selectedMonths
        .map((s) => {
          const found = months.find((m) => m.month === s);
          return found?.short_label || s;
        })
        .join(', ');
    }
    return `${selectedCount} months selected`;
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm transition-colors ${
          disabled
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
            : isOpen
            ? 'border-green-500 ring-2 ring-green-100 bg-white'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`truncate ${selectedCount === 0 ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
            {loading ? 'Loading schedule...' : summaryLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedCount > 0 && (
            <span className="bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Selected months chips */}
      {selectedCount > 0 && selectedCount <= 6 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedMonths.map((s) => {
            const found = months.find((m) => m.month === s);
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200"
              >
                {found?.short_label || s}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(s); }}
                  className="hover:text-green-900"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Total Summary */}
      {selectedCount > 0 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-800">
              {selectedCount} month{selectedCount > 1 ? 's' : ''} × ৳{monthlyAmount.toLocaleString()}
            </span>
            <span className="font-bold text-green-900 text-base">
              ৳{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto">
          {/* Quick actions */}
          <div className="sticky top-0 bg-white border-b px-3 py-2 flex items-center justify-between gap-2 z-10">
            <button
              type="button"
              onClick={selectAllUnpaid}
              className="text-xs text-green-600 font-medium hover:text-green-800"
            >
              Select All Unpaid
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 font-medium hover:text-gray-700"
            >
              Clear All
            </button>
          </div>

          {Object.entries(yearGroups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, yearMonths]) => {
              const unpaidInYear = yearMonths.filter((m) => !m.is_paid);
              const allYearSelected =
                unpaidInYear.length > 0 &&
                unpaidInYear.every((m) => selectedMonths.includes(m.month));

              return (
                <div key={year}>
                  {/* Year header */}
                  <div className="sticky top-[41px] bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b z-[5]">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      {year}
                    </span>
                    {unpaidInYear.length > 0 && (
                      <button
                        type="button"
                        onClick={() => selectYear(Number(year))}
                        className="text-[11px] text-green-600 font-medium hover:text-green-800"
                      >
                        {allYearSelected ? 'Deselect Year' : 'Select Year'}
                      </button>
                    )}
                  </div>

                  {/* Month rows */}
                  {yearMonths.map((m) => {
                    const isSelected = selectedMonths.includes(m.month);
                    const isDisabled = m.is_paid;

                    return (
                      <label
                        key={m.month}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : isSelected
                            ? 'bg-green-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && toggle(m.month)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm ${
                                m.is_current
                                  ? 'font-bold text-gray-900'
                                  : isDisabled
                                  ? 'text-gray-400'
                                  : 'text-gray-700'
                              }`}
                            >
                              {m.month_label}
                            </span>
                            {getStatusBadge(m)}
                          </div>
                          {!m.is_paid && Number(m.remaining_due) > 0 && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Due: ৳{Number(m.remaining_due).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default MonthMultiSelect;
