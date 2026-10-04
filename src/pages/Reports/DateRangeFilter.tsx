// src/pages/Reports/DateRangeFilter.tsx
import React from 'react';
import { Picker } from '@swc-react/picker';
import { MenuItem } from '@swc-react/menu';
import '@spectrum-web-components/menu/sp-menu-item.js';

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
      <Picker
        id="date-range-filter-select"
        data-testid="date-range-filter-select"
        className="reports-filter-select"
        value={value}
        label="Date Range"
        aria-label="Filter report by date range"
        ref={(node: any) => {
          if (node && !node._hasChangeListener) {
            node._hasChangeListener = true;
            node.addEventListener('change', (e: any) => {
              onChange(e.target?.value || '');
            });
          }
        }}
        change={(e: any) => onChange(e.target?.value || '')}
      >
        <MenuItem value="all">All Time</MenuItem>
        <MenuItem value="30d">Last 30 Days</MenuItem>
        <MenuItem value="quarter">Last Quarter</MenuItem>
        <MenuItem value="ytd">Year to Date (YTD)</MenuItem>
      </Picker>
    </div>
  );
};
