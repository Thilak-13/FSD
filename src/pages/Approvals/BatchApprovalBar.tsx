// src/pages/Approvals/BatchApprovalBar.tsx
import React from 'react';

export interface BatchApprovalBarProps {
  selectedCount: number;
  onApproveSelected: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

/**
 * BatchApprovalBar displays actionable batch controls when one or more
 * invoices are checked in the Approvals queue.
 */
export const BatchApprovalBar: React.FC<BatchApprovalBarProps> = ({
  selectedCount,
  onApproveSelected,
  onClearSelection,
  loading = false,
}) => {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <aside
      className="batch-approval-bar"
      data-testid="batch-approval-bar"
      role="region"
      aria-label="Batch approvals toolbar"
    >
      <div className="batch-approval-info">
        <span className="batch-approval-count-badge" aria-hidden="true">
          {selectedCount}
        </span>
        <span>
          {selectedCount} {selectedCount === 1 ? 'invoice' : 'invoices'} selected
        </span>
      </div>

      <div className="batch-approval-actions">
        <button
          type="button"
          className="batch-approval-btn batch-approval-btn-secondary"
          data-testid="batch-clear-btn"
          onClick={onClearSelection}
          disabled={loading}
          aria-label="Clear selected invoices"
        >
          Clear Selection
        </button>

        <button
          type="button"
          className="batch-approval-btn batch-approval-btn-accent"
          data-testid="batch-approve-btn"
          onClick={onApproveSelected}
          disabled={loading}
          aria-label={`Approve ${selectedCount} selected invoices`}
        >
          Approve Selected ({selectedCount})
        </button>
      </div>
    </aside>
  );
};
