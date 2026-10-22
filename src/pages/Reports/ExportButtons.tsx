// src/pages/Reports/ExportButtons.tsx
import React from 'react';

export interface VendorReportRow {
  vendorId: string;
  vendorName: string;
  taxId: string;
  status: string;
  paymentTerms: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  avgProcessingDays: number;
}

export interface ExportButtonsProps {
  rows: VendorReportRow[];
  onNotify: (message: string) => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ rows, onNotify }) => {
  const handleExportCSV = () => {
    const headers = [
      'Vendor Name',
      'Tax ID',
      'Status',
      'Payment Terms',
      'Invoices Count',
      'Total Billed (₹)',
      'Total Paid (₹)',
      'Pending Balance (₹)',
      'Avg Processing Days',
    ];

    const csvLines = [headers.join(',')];

    rows.forEach((row) => {
      const line = [
        `"${row.vendorName.replace(/"/g, '""')}"`,
        `"${row.taxId}"`,
        `"${row.status}"`,
        `"${row.paymentTerms}"`,
        row.invoiceCount,
        row.totalBilled.toFixed(2),
        row.totalPaid.toFixed(2),
        row.pendingBalance.toFixed(2),
        row.avgProcessingDays.toFixed(1),
      ];
      csvLines.push(line.join(','));
    });

    const csvContent = csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    onNotify('CSV export downloaded successfully.');
  };

  // shortcut: relies on the browser's "Save as PDF" print destination (print styles in reports.css);
  // switch to a client-side PDF library if a one-click file download is required.
  const handleExportPDF = () => {
    if (rows.length === 0) {
      onNotify('Nothing to export yet. Wait for the report to load.');
      return;
    }
    onNotify('Choose "Save as PDF" in the print dialog to download the report.');
    window.print();
  };

  return (
    <div className="reports-export-group">
      <button
        type="button"
        className="reports-btn reports-btn-primary"
        data-testid="export-csv-btn"
        onClick={handleExportCSV}
      >
        Export CSV
      </button>
      <button
        type="button"
        className="reports-btn reports-btn-secondary"
        data-testid="export-pdf-btn"
        onClick={handleExportPDF}
      >
        Export PDF
      </button>
    </div>
  );
};
