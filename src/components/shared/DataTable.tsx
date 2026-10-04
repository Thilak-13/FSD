import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableCheckboxCell,
} from '@swc-react/table';
import { Button } from '@swc-react/button';
import { Search } from '@swc-react/search';
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
 * Accessible DataTable wrapping @swc-react/table with:
 * - Semantic Table structure (Head, HeadCell, Body, Row, Cell, CheckboxCell)
 * - Column sorting with accessible aria-sort
 * - Pagination controls
 * - Search filtering
 * - Row selection checkboxes
 * - Row click callbacks
 * - Empty and Loading progressive states
 * - 100% Spectrum design tokens styling
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
            <Search
              placeholder={searchPlaceholder}
              value={currentSearch}
              input={(e: any) => handleSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
              style={{ width: '100%' }}
            />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
              aria-hidden="true"
              tabIndex={-1}
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
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
          <Table
            aria-label={ariaLabel}
            style={{ width: '100%' }}
          >
            <TableHead>
              {selectable && (
                <TableCheckboxCell
                  headCell
                  label="Select all rows"
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    handleToggleSelectAll();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    aria-label="Select all rows"
                    onChange={handleToggleSelectAll}
                    style={{
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      padding: 0,
                      margin: '-1px',
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  />
                </TableCheckboxCell>
              )}

              {columns.map((col) => {
                const isSorted = currentSortCol === col.key;
                const sortDirAttr = isSorted ? currentSortDir : undefined;
                const ariaSort = isSorted
                  ? currentSortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : col.sortable
                  ? 'none'
                  : undefined;

                return (
                  <TableHeadCell
                    key={col.key}
                    sort-direction={sortDirAttr}
                    aria-sort={ariaSort}
                    sortable={col.sortable}
                    onClick={() => handleSortClick(col.key, col.sortable)}
                    style={{
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      width: col.width,
                      textAlign: col.align || 'left',
                      fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
                      fontWeight: 600,
                      color: 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                      backgroundColor: 'var(--spectrum-global-color-gray-100, #fafafa)',
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
                  </TableHeadCell>
                );
              })}
            </TableHead>

            <TableBody>
              {displayRows.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = currentSelectedIds.includes(rowId);
                const actualIndex = pagination
                  ? (safeCurrentPage - 1) * pageSize + index
                  : index;

                return (
                  <TableRow
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
                    }}
                  >
                    {selectable && (
                      <TableCheckboxCell
                        label={`Select row ${actualIndex + 1}`}
                        checked={isSelected}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          handleToggleSelectRow(rowId);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Select row ${actualIndex + 1}`}
                          onChange={() => handleToggleSelectRow(rowId)}
                          style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            padding: 0,
                            margin: '-1px',
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                            whiteSpace: 'nowrap',
                            border: 0,
                          }}
                        />
                      </TableCheckboxCell>
                    )}

                    {columns.map((col) => {
                      const cellContent = col.render
                        ? col.render(row, actualIndex)
                        : row[col.key];

                      return (
                        <TableCell
                          key={col.key}
                          style={{
                            textAlign: col.align || 'left',
                            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
                            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
                            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
                          }}
                        >
                          {cellContent !== undefined && cellContent !== null
                            ? cellContent
                            : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
            <Button
              ref={(el: any) => {
                if (el?.setAttribute) el.setAttribute('role', 'button');
              }}
              variant="secondary"
              disabled={safeCurrentPage <= 1}
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              aria-label="Previous page"
            >
              Previous
            </Button>

            <span
              style={{
                padding: '0 var(--spectrum-global-dimension-size-100, 8px)',
                fontWeight: 500,
              }}
            >
              Page {safeCurrentPage} of {totalPages}
            </span>

            <Button
              ref={(el: any) => {
                if (el?.setAttribute) el.setAttribute('role', 'button');
              }}
              variant="secondary"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
