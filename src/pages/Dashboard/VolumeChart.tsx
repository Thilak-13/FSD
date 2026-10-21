// src/pages/Dashboard/VolumeChart.tsx
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Invoice } from '../../types';

export interface VolumeChartProps {
  invoices: Invoice[];
}

interface MonthData {
  monthKey: string;
  month: string;
  spend: number;
  count: number;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ invoices }) => {
  const chartData = useMemo(() => {
    // Group invoices by year-month (e.g. "2026-08")
    const monthMap = new Map<string, { spend: number; count: number }>();

    // Seed the past 6 months to ensure smooth trend line even with sparse dates
    const now = new Date('2026-09-15');
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { spend: 0, count: 0 });
    }

    invoices.forEach((inv) => {
      const dateStr = inv.submittedDate || inv.dueDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const current = monthMap.get(key) || { spend: 0, count: 0 };
          current.spend += inv.amount;
          current.count += 1;
          monthMap.set(key, current);
        }
      }
    });

    // Convert map to sorted array
    const sortedKeys = Array.from(monthMap.keys()).sort();
    return sortedKeys.map((key): MonthData => {
      const [year, monthNum] = key.split('-');
      const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
      const monthLabel = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const entry = monthMap.get(key) || { spend: 0, count: 0 };
      return {
        monthKey: key,
        month: monthLabel,
        spend: Math.round(entry.spend),
        count: entry.count,
      };
    });
  }, [invoices]);

  return (
    <div className="chart-card" data-testid="dashboard-volume-chart">
      <div className="chart-header">
        <h3 className="chart-title">Monthly Spend & Invoice Volume</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={100}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--spectrum-global-color-gray-200, #e1e1e1)"
            />
            <XAxis
              dataKey="month"
              stroke="var(--spectrum-neutral-visual-color, #505050)"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="var(--spectrum-indigo-visual-color, #686df4)"
              fontSize={12}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--spectrum-seafoam-visual-color, #00a19a)"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: any, name: string) => [
                name === 'Spend (₹)'
                  ? `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : value,
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              yAxisId="left"
              dataKey="spend"
              name="Spend (₹)"
              fill="var(--spectrum-indigo-visual-color, #686df4)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="count"
              name="Invoices (#)"
              fill="var(--spectrum-seafoam-visual-color, #00a19a)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
