// src/pages/Reports/DateRangeFilter.tsx
import React from 'react';

export interface DateRangeFilterProps {
  value: string;
  onChange: (range: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="reports-filter-group">
      <label htmlFor="date-range-filter-select" className="reports-filter-label">
        Date Range:
      </label>
      <select
        id="date-range-filter-select"
        data-testid="date-range-filter-select"
        className="reports-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter report by date range"
      >
        <option value="all">All Time</option>
        <option value="30d">Last 30 Days</option>
        <option value="quarter">Last Quarter</option>
        <option value="ytd">Year to Date (YTD)</option>
      </select>
    </div>
  );
};
