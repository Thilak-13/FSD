// src/pages/Dashboard/StatusBreakdownChart.tsx
import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Invoice, InvoiceStatus } from '../../types';

export interface StatusBreakdownChartProps {
  invoices: Invoice[];
}

interface StatusSlice {
  name: InvoiceStatus;
  value: number;
  color: string;
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  Approved: 'var(--spectrum-global-color-green-600, #2d9d78)',
  Submitted: 'var(--spectrum-global-color-orange-600, #e68619)',
  Flagged: 'var(--spectrum-global-color-red-600, #d7373f)',
  Paid: 'var(--spectrum-global-color-seafoam-700, #028688)',
  'Payment Scheduled': 'var(--spectrum-global-color-blue-600, #1473e6)',
  'Under Verification': 'var(--spectrum-global-color-purple-600, #7c51a1)',
};

export const StatusBreakdownChart: React.FC<StatusBreakdownChartProps> = ({ invoices }) => {
  const chartData = useMemo(() => {
    const countMap: Partial<Record<InvoiceStatus, number>> = {};

    invoices.forEach((inv) => {
      countMap[inv.status] = (countMap[inv.status] || 0) + 1;
    });

    const slices: StatusSlice[] = [];
    (Object.keys(STATUS_COLORS) as InvoiceStatus[]).forEach((status) => {
      const count = countMap[status] || 0;
      if (count > 0) {
        slices.push({
          name: status,
          value: count,
          color: STATUS_COLORS[status],
        });
      }
    });

    return slices;
  }, [invoices]);

  return (
    <div className="chart-card" data-testid="dashboard-status-chart">
      <div className="chart-header">
        <h3 className="chart-title">Invoice Distribution by Status</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={100}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: string) => [
                `${value} invoice${Number(value) !== 1 ? 's' : ''}`,
                name,
              ]}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
