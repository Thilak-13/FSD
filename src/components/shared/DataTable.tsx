import React, { useState, useMemo, useCallback } from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface Column<T> {
  key: string;
  title: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T, index: number) => void;

  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;

  // Pagination
  pagination?: boolean;
  manualPagination?: boolean;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;

  // Search Filtering
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Row selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (item: T, index: number) => string;

  // Empty state
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyContent?: React.ReactNode;

  // Accessibility & Styling
  ariaLabel?: string;
  className?: string;
}

/**
 * Accessible standard HTML DataTable with:
 * - Semantic Table structure (table, thead, tbody, tr, th, td) in light DOM
 * - Column sorting with accessible aria-sort
 * - Pagination controls with accessible buttons
 * - Search filtering with standard input
 * - Row selection checkboxes
 * - Row click callbacks & keyboard navigation
 * - Empty and Loading progressive states
 * - Spectrum design tokens styling
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  onRowClick,
  sortColumn: controlledSortCol,
  sortDirection: controlledSortDir,
  onSort,
  pagination = false,
  manualPagination = false,
  totalCount,
  pageSize = 10,
  currentPage: controlledPage,
  onPageChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue: controlledSearch,
  onSearchChange,
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  getRowId = (item: T, index: number) => (item?.id !== undefined ? String(item.id) : String(index)),
  emptyTitle = 'No records found',
  emptyMessage = 'There are no items matching your criteria.',
  emptyActionLabel,
  onEmptyAction,
  emptyContent,
  ariaLabel = 'Data Table',
  className,
}: DataTableProps<T>): React.ReactElement {
  // Search state
  const [internalSearch, setInternalSearch] = useState('');
  const currentSearch = controlledSearch !== undefined ? controlledSearch : internalSearch;

  const handleSearchChange = (term: string) => {
    if (onSearchChange) {
      onSearchChange(term);
    } else {
      setInternalSearch(term);
    }
  };

  // Filtered data based on search term
  const filteredData = useMemo(() => {
    if (!searchable || !currentSearch.trim()) return data;
    const term = currentSearch.toLowerCase();
    return data.filter((item) => {
      return columns.some((col) => {
        const val = item[col.key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, columns, searchable, currentSearch]);

  // Sorting state
  const [internalSortCol, setInternalSortCol] = useState<string | undefined>(undefined);
  const [internalSortDir, setInternalSortDir] = useState<'asc' | 'desc'>('asc');

  const currentSortCol = controlledSortCol !== undefined ? controlledSortCol : internalSortCol;
  const currentSortDir = controlledSortDir !== undefined ? controlledSortDir : internalSortDir;

  const handleSortClick = (colKey: string, isSortable?: boolean) => {
    if (!isSortable) return;
    let nextDir: 'asc' | 'desc' = 'asc';
    if (currentSortCol === colKey) {
      nextDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    }
    if (onSort) {
      onSort(colKey, nextDir);
    } else {
      setInternalSortCol(colKey);
      setInternalSortDir(nextDir);
    }
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!currentSortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[currentSortCol];
      const bVal = b[currentSortCol];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      let comp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comp = aVal - bVal;
      } else {
        comp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      }
      return currentSortDir === 'asc' ? comp : -comp;
    });
  }, [filteredData, currentSortCol, currentSortDir]);

  // Pagination state
  const [internalPage, setInternalPage] = useState(1);
  const currentPageNumber = controlledPage !== undefined ? controlledPage : internalPage;
  const totalRecordCount = totalCount !== undefined ? totalCount : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecordCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPageNumber), totalPages);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(Math.max(1, newPage), totalPages);
    if (onPageChange) {
      onPageChange(targetPage);
    } else {
      setInternalPage(targetPage);
    }
  };

  const displayRows = useMemo(() => {
    if (!pagination) return sortedData;
    if (manualPagination) return sortedData; // Data is already sliced by parent/server
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, manualPagination, safeCurrentPage, pageSize]);

  // Selection state
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const currentSelectedIds = controlledSelectedIds !== undefined ? controlledSelectedIds : internalSelectedIds;

  const updateSelection = useCallback(
    (newIds: string[]) => {
      if (onSelectionChange) {
        onSelectionChange(newIds);
      } else {
        setInternalSelectedIds(newIds);
      }
    },
    [onSelectionChange]
  );

  const allDisplayRowIds = useMemo(() => {
    return displayRows.map((row, idx) => getRowId(row, idx));
  }, [displayRows, getRowId]);

  const isAllSelected =
    allDisplayRowIds.length > 0 &&
    allDisplayRowIds.every((id) => currentSelectedIds.includes(id));

  const isSomeSelected =
    !isAllSelected &&
    allDisplayRowIds.some((id) => currentSelectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const remaining = currentSelectedIds.filter((id) => !allDisplayRowIds.includes(id));
      updateSelection(remaining);
    } else {
      const merged = Array.from(new Set([...currentSelectedIds, ...allDisplayRowIds]));
      updateSelection(merged);
    }
  };

  const handleToggleSelectRow = (rowId: string) => {
    if (currentSelectedIds.includes(rowId)) {
      updateSelection(currentSelectedIds.filter((id) => id !== rowId));
    } else {
      updateSelection([...currentSelectedIds, rowId]);
    }
  };

  // Render Loading state
  if (loading) {
    return (
      <div className={`spectrum-data-table-container ${className || ''}`.trim()} aria-label={ariaLabel}>
        <LoadingSkeleton lines={pageSize || 5} ariaLabel="Loading table rows..." />
      </div>
    );
  }

  return (
    <div
      className={`spectrum-data-table-container ${className || ''}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: 'var(--spectrum-global-dimension-size-150, 12px)',
      }}
    >
      {/* Search Toolbar */}
      {searchable && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spectrum-global-dimension-size-150, 12px)',
          }}
        >
          <div style={{ maxWidth: '320px', width: '100%', position: 'relative' }}>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                borderRadius: '4px',
                border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
                color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedData.length === 0 ? (
        emptyContent || (
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        )
      ) : (
        /* Table element wrapped for responsive horizontal scroll */
        <div
          style={{
            overflowX: 'auto',
            width: '100%',
            borderRadius: 'var(--spectrum-alias-border-radius-regular, 4px)',
            border: '1px solid var(--spectrum-global-color-gray-200, #eaeaea)',
            backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
          }}
        >
          <table
            aria-label={ariaLabel}
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr>
                {selectable && (
                  <th
                    style={{
                      width: '48px',
                      padding: 'var(--spectrum-global-dimension-size-150, 12px) var(--spectrum-global-dimension-size-200, 16px)',
                      borderBottom: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                      backgroundColor: 'var(--spectrum-global-color-gray-100, #fafafa)',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      aria-label="Select all rows"
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = currentSortCol === col.key;
                  const ariaSort = isSorted
                    ? currentSortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : col.sortable
                    ? 'none'
                    : undefined;

                  return (
                    <th
                      key={col.key}
                      aria-sort={ariaSort}
                      onClick={() => handleSortClick(col.key, col.sortable)}
                      style={{
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        width: col.width,
                        textAlign: col.align || 'left',
                        fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
                        fontWeight: 600,
                        fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
                        color: 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                        backgroundColor: 'var(--spectrum-global-color-gray-100, #fafafa)',
                        padding: 'var(--spectrum-global-dimension-size-150, 12px) var(--spectrum-global-dimension-size-200, 16px)',
                        borderBottom: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spectrum-global-dimension-size-50, 4px)',
                          justifyContent:
                            col.align === 'right'
                              ? 'flex-end'
                              : col.align === 'center'
                              ? 'center'
                              : 'flex-start',
                        }}
                      >
                        <span>{col.title}</span>
                        {col.sortable && isSorted && (
                          <span aria-hidden="true" style={{ fontSize: '10px' }}>
                            {currentSortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = currentSelectedIds.includes(rowId);
                const actualIndex = pagination
                  ? (safeCurrentPage - 1) * pageSize + index
                  : index;

                return (
                  <tr
                    key={rowId}
                    className="table-data-row"
                    aria-selected={selectable ? isSelected : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick && onRowClick(row, actualIndex)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(row, actualIndex);
                      }
                    }}
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: isSelected
                        ? 'var(--spectrum-global-color-blue-100, #f0f7ff)'
                        : undefined,
                      borderBottom: '1px solid var(--spectrum-global-color-gray-200, #eaeaea)',
                    }}
                  >
                    {selectable && (
                      <td
                        style={{
                          width: '48px',
                          padding: 'var(--spectrum-global-dimension-size-150, 12px) var(--spectrum-global-dimension-size-200, 16px)',
                          textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Select row ${actualIndex + 1}`}
                          onChange={() => handleToggleSelectRow(rowId)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}

                    {columns.map((col) => {
                      const cellContent = col.render
                        ? col.render(row, actualIndex)
                        : row[col.key];

                      return (
                        <td
                          key={col.key}
                          className={col.className}
                          style={{
                            padding: 'var(--spectrum-global-dimension-size-150, 12px) var(--spectrum-global-dimension-size-200, 16px)',
                            textAlign: col.align || 'left',
                            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
                            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
                            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
                          }}
                        >
                          {cellContent !== undefined && cellContent !== null
                            ? cellContent
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && sortedData.length > 0 && (
        <nav
          aria-label="Table pagination"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spectrum-global-dimension-size-100, 8px) 0',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            flexWrap: 'wrap',
            gap: 'var(--spectrum-global-dimension-size-150, 12px)',
          }}
        >
          <div>
            Showing {(safeCurrentPage - 1) * pageSize + 1} to{' '}
            {Math.min(safeCurrentPage * pageSize, totalRecordCount)} of {totalRecordCount} entries
          </div>

          <div style={{ display: 'flex', gap: 'var(--spectrum-global-dimension-size-100, 8px)', alignItems: 'center' }}>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              aria-label="Previous page"
              style={{
                padding: '6px 14px',
                fontSize: '14px',
                fontFamily: 'inherit',
                fontWeight: 500,
                borderRadius: '4px',
                border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                backgroundColor: safeCurrentPage <= 1 ? 'var(--spectrum-global-color-gray-100, #f4f4f4)' : 'var(--spectrum-global-color-gray-50, #ffffff)',
                color: safeCurrentPage <= 1 ? 'var(--spectrum-global-color-gray-400, #a0a0a0)' : 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            <span
              style={{
                padding: '0 var(--spectrum-global-dimension-size-100, 8px)',
                fontWeight: 500,
              }}
            >
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              aria-label="Next page"
              style={{
                padding: '6px 14px',
                fontSize: '14px',
                fontFamily: 'inherit',
                fontWeight: 500,
                borderRadius: '4px',
                border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                backgroundColor: safeCurrentPage >= totalPages ? 'var(--spectrum-global-color-gray-100, #f4f4f4)' : 'var(--spectrum-global-color-gray-50, #ffffff)',
                color: safeCurrentPage >= totalPages ? 'var(--spectrum-global-color-gray-400, #a0a0a0)' : 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
