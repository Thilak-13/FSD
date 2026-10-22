// src/components/layout/GlobalSearch.tsx
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';

export const SEARCH_DEBOUNCE_MS = 250;
const MAX_PER_GROUP = 5;

interface SearchResult {
  key: string;
  label: string;
  detail: string;
  path: string;
}

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentRole } = useAuth();
  const dataCtx = useContext(DataContext);

  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedTerm.trim().toLowerCase();
    if (q.length < 2 || !dataCtx) return [];

    const vendorNames = new Map(dataCtx.vendors.map((v) => [v.id, v.name]));
    // Same scoping as InvoicesPage: Requesters only see their own invoices.
    const invoices =
      currentRole === 'Requester'
        ? dataCtx.invoices.filter((inv) => inv.submittedBy === currentUser?.id)
        : dataCtx.invoices;

    const invoiceResults = invoices
      .filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (vendorNames.get(inv.vendorId) || '').toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_GROUP)
      .map((inv) => ({
        key: `invoice-${inv.id}`,
        label: inv.invoiceNumber,
        detail: `Invoice · ${vendorNames.get(inv.vendorId) || 'Unknown vendor'} · ₹${inv.amount.toLocaleString('en-IN')}`,
        path: `/invoices/${inv.id}`,
      }));

    const vendorResults = dataCtx.vendors
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map((v) => ({
        key: `vendor-${v.id}`,
        label: v.name,
        detail: 'Vendor',
        path: `/vendors/${v.id}`,
      }));

    return [...invoiceResults, ...vendorResults];
  }, [debouncedTerm, dataCtx, currentRole, currentUser?.id]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const showDropdown = open && debouncedTerm.trim().length >= 2;

  const go = (path: string) => {
    setOpen(false);
    setTerm('');
    navigate(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        go(results[activeIndex].path);
      } else if (term.trim()) {
        go(`/invoices?search=${encodeURIComponent(term.trim())}`);
      }
    }
  };

  return (
    <div className="global-search-container" style={{ position: 'relative' }}>
      <input
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined}
        placeholder="Search invoices, vendors..."
        aria-label="Search"
        className="global-search-input"
        data-testid="global-search-input"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          data-testid="global-search-results"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '280px',
            margin: 0,
            padding: '4px 0',
            listStyle: 'none',
            background: 'var(--spectrum-global-color-gray-50, #ffffff)',
            border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 50,
          }}
        >
          {results.length === 0 ? (
            <li
              role="option"
              aria-disabled="true"
              aria-selected="false"
              data-testid="global-search-empty"
              style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--spectrum-global-color-gray-600, #6e6e6e)' }}
            >
              No matching invoices or vendors. Press Enter to search all invoices.
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.key}
                id={`global-search-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                data-testid="global-search-option"
                // mousedown + preventDefault keeps focus so onBlur doesn't close the list before the click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r.path);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: i === activeIndex ? 'var(--spectrum-global-color-gray-200, #eaeaea)' : 'transparent',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700, #4b4b4b)' }}>
                  {r.detail}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
