// src/components/ui/index.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  forwardRef,
  useId,
} from 'react';
import './ui.css';

/* ==========================================================================
   1. Button & ActionButton
   ========================================================================== */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'cta'
    | 'primary'
    | 'secondary'
    | 'negative'
    | 'action'
    | 'accent'
    | 'quiet'
    | 'overBackground';
  size?: 's' | 'm' | 'l' | 'xl';
  quiet?: boolean;
  disabled?: boolean;
  loading?: boolean;
  slot?: string;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'm',
      quiet = false,
      disabled = false,
      loading = false,
      type = 'button',
      className = '',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    // Normalise accent -> primary or cta styling
    const effectiveVariant = variant === 'accent' ? 'accent' : variant;
    const quietClass = quiet || variant === 'quiet' ? 'ui-button--quiet' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`ui-button ui-button-${effectiveVariant} ui-button-${size} ${quietClass} ${
          loading ? 'is-loading' : ''
        } ${className}`.trim()}
        onClick={disabled || loading ? undefined : onClick}
        {...props}
      >
        {loading && (
          <ProgressCircle
            size="s"
            variant={variant === 'secondary' || quiet ? 'default' : 'overBackground'}
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  quiet?: boolean;
  size?: 's' | 'm' | 'l' | 'xl';
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
  slot?: string;
  children?: React.ReactNode;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      quiet = false,
      size = 'm',
      selected = false,
      active = false,
      disabled = false,
      type = 'button',
      className = '',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isSelected = selected || active;
    const quietClass = quiet ? 'ui-action-button--quiet' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-pressed={isSelected ? true : undefined}
        className={`ui-action-button ui-action-button-${size} ${quietClass} ${
          isSelected ? 'is-selected' : ''
        } ${className}`.trim()}
        onClick={disabled ? undefined : onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ActionButton.displayName = 'ActionButton';

/* ==========================================================================
   2. Card
   ========================================================================== */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
  subheading?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ heading, subheading, header, footer, children, className = '', ...props }, ref) => {
    // Collect slotted elements if present
    const headerChildren: React.ReactNode[] = [];
    const footerChildren: React.ReactNode[] = [];
    const bodyChildren: React.ReactNode[] = [];
    let hasSlots = false;

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.props as any)?.slot) {
        hasSlots = true;
        const slot = (child.props as any).slot;
        if (slot === 'heading' || slot === 'header' || slot === 'subheading') {
          headerChildren.push(child);
        } else if (slot === 'footer') {
          footerChildren.push(child);
        } else {
          bodyChildren.push(child);
        }
      } else {
        bodyChildren.push(child);
      }
    });

    const hasHeader = heading || header || headerChildren.length > 0;
    const hasFooter = footer || footerChildren.length > 0;

    // If no explicit slots or header/footer props, preserve direct children inside card
    if (!hasSlots && !heading && !header && !footer) {
      return (
        <div ref={ref} className={`ui-card ${className}`.trim()} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div ref={ref} className={`ui-card ${className}`.trim()} {...props}>
        {hasHeader && (
          <div className="ui-card-header">
            {header}
            {heading && <h3 className="ui-card-title">{heading}</h3>}
            {subheading && <div className="ui-card-subtitle">{subheading}</div>}
            {headerChildren}
          </div>
        )}
        {bodyChildren.length > 0 && <div className="ui-card-body">{bodyChildren}</div>}
        {hasFooter && (
          <div className="ui-card-footer">
            {footer}
            {footerChildren}
          </div>
        )}
      </div>
    );
  }
);
Card.displayName = 'Card';

/* ==========================================================================
   3. Badge
   ========================================================================== */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'positive'
    | 'negative'
    | 'notice'
    | 'neutral'
    | 'info'
    | 'informative'
    | 'accent';
  size?: 's' | 'm' | 'l';
  children?: React.ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'm', className = '', children, ...props }, ref) => {
    const effectiveVariant = variant === 'informative' ? 'info' : variant;

    return (
      <span
        ref={ref}
        className={`ui-badge ui-badge-${effectiveVariant} ui-badge-${size} ${className}`.trim()}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

/* ==========================================================================
   4. StatusLight
   ========================================================================== */

export interface StatusLightProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'positive'
    | 'negative'
    | 'notice'
    | 'neutral'
    | 'info'
    | 'informative'
    | 'active';
  size?: 's' | 'm' | 'l' | 'xl';
  disabled?: boolean;
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export const StatusLight = forwardRef<HTMLSpanElement, StatusLightProps>(
  (
    {
      variant = 'info',
      size = 'm',
      disabled = false,
      label,
      children,
      className = '',
      role = 'status',
      ...props
    },
    ref
  ) => {
    const effectiveVariant = variant === 'informative' ? 'info' : variant;
    const content = children !== undefined ? children : label;

    return (
      <span
        ref={ref}
        role={role}
        className={`ui-status-light ui-status-${effectiveVariant} ui-status-light-${size} ${
          disabled ? 'is-disabled' : ''
        } ${className}`.trim()}
        {...props}
      >
        <span className="ui-status-dot" aria-hidden="true" />
        {content !== undefined && content !== null && (
          <span className="ui-status-label">{content}</span>
        )}
      </span>
    );
  }
);
StatusLight.displayName = 'StatusLight';

/* ==========================================================================
   5. TextField & Search
   ========================================================================== */

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  invalid?: boolean;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  slot?: string;
  size?: 's' | 'm' | 'l' | 'xl';
  inputClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      invalid = false,
      error,
      hint,
      helperText,
      required,
      disabled,
      id: explicitId,
      className = '',
      inputClassName = '',
      type = 'text',
      size = 'm',
      value,
      defaultValue,
      onChange,
      onInput,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const displayHint = hint || helperText;
    const hasError = invalid || Boolean(error);

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      onInput?.(e);
      if (!onChange && onInput) {
        onInput(e);
      }
    };

    return (
      <div className={`ui-textfield ui-textfield-${size} ${className}`.trim()}>
        {label && (
          <label htmlFor={id} className="ui-label">
            {label}
            {required && <span className="ui-required-mark">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={
            hasError
              ? `${id}-error`
              : displayHint
              ? `${id}-hint`
              : undefined
          }
          className={`ui-input ${hasError ? 'is-invalid' : ''} ${inputClassName}`.trim()}
          onChange={onChange}
          onInput={handleInput}
          {...props}
        />
        {hasError && error && (
          <span id={`${id}-error`} className="ui-error-message" role="alert">
            {error}
          </span>
        )}
        {!hasError && displayHint && (
          <span id={`${id}-hint`} className="ui-hint">
            {displayHint}
          </span>
        )}
      </div>
    );
  }
);
TextField.displayName = 'TextField';

// Backwards compatibility alias for lowercase 'f'
export const Textfield = TextField;

/* Search Component */
export interface SearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  input?: (e: any) => void;
  onClear?: () => void;
  size?: 's' | 'm' | 'l';
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      onInput,
      input,
      onClear,
      size = 'm',
      placeholder = 'Search...',
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState<string>(() => {
      if (controlledValue !== undefined) return String(controlledValue);
      if (defaultValue !== undefined) return String(defaultValue);
      return '';
    });

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? String(controlledValue) : localValue;
    const inputRef = useRef<HTMLInputElement>(null);

    const mergedRef = (node: HTMLInputElement | null) => {
      (inputRef as any).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as any).current = node;
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setLocalValue(e.target.value);
      }
      onChange?.(e);
      onInput?.(e);
      input?.(e);
    };

    const handleClear = () => {
      if (!isControlled) {
        setLocalValue('');
      }
      if (inputRef.current) {
        inputRef.current.value = '';
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }
      onClear?.();
    };

    return (
      <div className={`ui-search ui-search-${size} ${className}`.trim()}>
        <span className="ui-search-icon" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={mergedRef}
          type="search"
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          className="ui-search-input"
          onChange={handleInputChange}
          onInput={handleInputChange}
          {...props}
        />
        {currentValue && !disabled && (
          <button
            type="button"
            className="ui-search-clear-btn"
            aria-label="Clear search"
            onClick={handleClear}
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);
Search.displayName = 'Search';

/* ==========================================================================
   6. Picker / Select & Menu
   ========================================================================== */

interface SelectContextValue {
  inSelect: boolean;
}
export const SelectContext = React.createContext<SelectContextValue>({ inSelect: false });

export interface PickerProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  change?: (e: any) => void;
}

export const Picker = forwardRef<HTMLSelectElement, PickerProps>(
  (
    {
      label,
      value,
      defaultValue,
      onChange,
      change,
      disabled,
      required,
      id: explicitId,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
      change?.(e);
    };

    return (
      <SelectContext.Provider value={{ inSelect: true }}>
        <div className={`ui-picker-wrapper ${className}`.trim()}>
          <select
            ref={ref}
            id={id}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            required={required}
            className="ui-select"
            onChange={handleChange}
            {...props}
          >
            {children}
          </select>
          <span className="ui-select-arrow" aria-hidden="true">
            ▾
          </span>
        </div>
      </SelectContext.Provider>
    );
  }
);
Picker.displayName = 'Picker';

// Select is an alias for Picker
export const Select = Picker;

/* Menu & MenuItem */
export interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ children, className = '', role = 'menu', ...props }, ref) => {
    return (
      <div ref={ref} role={role} className={`ui-menu ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);
Menu.displayName = 'Menu';

export interface MenuItemProps extends React.HTMLAttributes<HTMLElement> {
  value?: string | number;
  selected?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const MenuItem = forwardRef<HTMLElement, MenuItemProps>(
  ({ value, selected, disabled, children, className = '', onClick, ...props }, ref) => {
    const selectCtx = useContext(SelectContext);

    // If inside a native Select or Picker, render as <option>
    if (selectCtx.inSelect) {
      return (
        <option
          ref={ref as any}
          value={value}
          disabled={disabled}
          className={`ui-menu-item ${className}`.trim()}
          {...(props as any)}
        >
          {children}
        </option>
      );
    }

    // Otherwise render as an accessible dropdown menu item
    return (
      <div
        ref={ref as any}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-selected={selected}
        aria-disabled={disabled}
        className={`ui-menu-item ${selected ? 'is-selected' : ''} ${
          disabled ? 'is-disabled' : ''
        } ${className}`.trim()}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            (onClick as any)?.(e);
          }
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MenuItem.displayName = 'MenuItem';

/* ==========================================================================
   7. Table & Data Grid
   ========================================================================== */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: 'compact' | 'regular' | 'spacious';
  children?: React.ReactNode;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ density = 'regular', className = '', children, ...props }, ref) => {
    return (
      <div className="ui-table-container">
        <table
          ref={ref}
          className={`ui-table ui-table--${density} ${className}`.trim()}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

export interface TableHeadProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
}

export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <thead ref={ref} className={`ui-table-head ${className}`.trim()} {...props}>
        {children}
      </thead>
    );
  }
);
TableHead.displayName = 'TableHead';

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <tbody ref={ref} className={`ui-table-body ${className}`.trim()} {...props}>
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  isSelected?: boolean;
  children?: React.ReactNode;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ selected, isSelected, onClick, className = '', children, ...props }, ref) => {
    const isRowSelected = selected || isSelected;

    return (
      <tr
        ref={ref}
        className={`ui-table-row ${isRowSelected ? 'is-selected' : ''} ${
          onClick ? 'is-clickable' : ''
        } ${className}`.trim()}
        onClick={onClick}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = 'TableRow';

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <td ref={ref} className={`ui-table-cell ${className}`.trim()} {...props}>
        {children}
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';

export interface TableHeadCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc';
  'sort-direction'?: 'asc' | 'desc';
  children?: React.ReactNode;
}

export const TableHeadCell = forwardRef<HTMLTableCellElement, TableHeadCellProps>(
  (
    {
      sortable = false,
      sortDirection,
      'sort-direction': legacySortDirection,
      onClick,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const currentSort = sortDirection || legacySortDirection;

    return (
      <th
        ref={ref}
        className={`ui-table-head-cell ${sortable ? 'is-sortable' : ''} ${className}`.trim()}
        onClick={onClick}
        {...props}
      >
        <div className="ui-table-head-cell-content">
          {children}
          {sortable && (
            <span className="ui-table-sort-icon" aria-hidden="true">
              {currentSort === 'asc' ? ' ▲' : currentSort === 'desc' ? ' ▼' : ' ⇅'}
            </span>
          )}
        </div>
      </th>
    );
  }
);
TableHeadCell.displayName = 'TableHeadCell';

export interface TableCheckboxCellProps
  extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'onChange'> {
  headCell?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  label?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}

export const TableCheckboxCell = forwardRef<
  HTMLTableCellElement,
  TableCheckboxCellProps
>(
  (
    {
      headCell = false,
      checked = false,
      indeterminate = false,
      label = 'Select',
      onClick,
      onChange,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const Tag = headCell ? 'th' : 'td';

    return (
      <Tag
        ref={ref as any}
        className={`ui-table-cell ui-table-checkbox-cell ${className}`.trim()}
        onClick={onClick}
        {...props}
      >
        {children ? (
          children
        ) : (
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            aria-label={label}
            onChange={onChange}
          />
        )}
      </Tag>
    );
  }
);
TableCheckboxCell.displayName = 'TableCheckboxCell';

/* ==========================================================================
   8. Dialog & DialogWrapper
   ========================================================================== */

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  size?: 's' | 'm' | 'l' | 'xl' | 'fullscreen';
  dismissable?: boolean;
  close?: () => void;
  onClose?: () => void;
  title?: string;
  heading?: React.ReactNode;
  buttons?: React.ReactNode;
  children?: React.ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      open = true,
      size = 'm',
      dismissable = false,
      close,
      onClose,
      title,
      heading,
      buttons,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const handleClose = close || onClose;

    // Handle Escape key listener
    useEffect(() => {
      if (!open || !handleClose) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, handleClose]);

    if (!open) return null;

    // Collect slot children
    const headingChildren: React.ReactNode[] = [];
    const buttonChildren: React.ReactNode[] = [];
    const bodyChildren: React.ReactNode[] = [];
    let hasSlots = false;

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.props as any)?.slot) {
        hasSlots = true;
        const slot = (child.props as any).slot;
        if (slot === 'heading' || slot === 'header') {
          headingChildren.push(child);
        } else if (slot === 'button' || slot === 'buttons') {
          buttonChildren.push(child);
        } else {
          bodyChildren.push(child);
        }
      } else {
        bodyChildren.push(child);
      }
    });

    const hasHeading = heading || title || headingChildren.length > 0;
    const hasButtons = buttons || buttonChildren.length > 0;

    // If no slots, render children directly with dialog container
    if (!hasSlots && !heading && !buttons) {
      return (
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={`ui-dialog ui-dialog-${size} ${className}`.trim()}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ui-dialog ui-dialog-${size} ${className}`.trim()}
        {...props}
      >
        {hasHeading && (
          <div className="ui-dialog-header">
            {heading ? (
              <h2 className="ui-dialog-title">{heading}</h2>
            ) : title ? (
              <h2 className="ui-dialog-title">{title}</h2>
            ) : (
              headingChildren
            )}
            {dismissable && handleClose && (
              <button
                type="button"
                className="ui-dialog-close-btn"
                aria-label="Close dialog"
                onClick={handleClose}
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className="ui-dialog-body">{bodyChildren}</div>
        {hasButtons && (
          <div className="ui-dialog-footer">
            {buttons}
            {buttonChildren}
          </div>
        )}
      </div>
    );
  }
);
Dialog.displayName = 'Dialog';

export interface DialogWrapperProps extends DialogProps {
  isOpen?: boolean;
}

export const DialogWrapper = forwardRef<HTMLDivElement, DialogWrapperProps>(
  ({ isOpen = true, open = true, onClose, close, className = '', children, ...props }, ref) => {
    const isModalOpen = isOpen && open;
    const handleClose = close || onClose;

    if (!isModalOpen) return null;

    return (
      <div
        className="ui-modal-backdrop"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && handleClose) {
            handleClose();
          }
        }}
      >
        <Dialog
          ref={ref}
          open={true}
          onClose={handleClose}
          className={className}
          {...props}
        >
          {children}
        </Dialog>
      </div>
    );
  }
);
DialogWrapper.displayName = 'DialogWrapper';

/* ==========================================================================
   9. Switch & Checkbox
   ========================================================================== */

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  size?: 's' | 'm' | 'l';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      size = 'm',
      checked,
      defaultChecked,
      disabled = false,
      className = '',
      children,
      onChange,
      ...props
    },
    ref
  ) => {
    const content = label || children;
    const isControlled = checked !== undefined;

    return (
      <label
        className={`ui-switch ui-switch-${size} ${
          disabled ? 'is-disabled' : ''
        } ${className}`.trim()}
      >
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          aria-checked={isControlled ? checked : undefined}
          checked={isControlled ? checked : undefined}
          defaultChecked={!isControlled ? defaultChecked : undefined}
          readOnly={isControlled && !onChange && !props.readOnly ? true : props.readOnly}
          disabled={disabled}
          className="ui-switch-input"
          onChange={onChange}
          {...props}
        />
        <span className="ui-switch-track" aria-hidden="true">
          <span className="ui-switch-handle" />
        </span>
        {content && <span className="ui-switch-label">{content}</span>}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  indeterminate?: boolean;
  size?: 's' | 'm' | 'l';
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      size = 'm',
      indeterminate = false,
      checked,
      defaultChecked,
      disabled = false,
      className = '',
      children,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const content = label || children;
    const isControlled = checked !== undefined;

    const mergedRef = (node: HTMLInputElement | null) => {
      (inputRef as any).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as any).current = node;
      }
    };

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <label
        className={`ui-checkbox ui-checkbox-${size} ${
          disabled ? 'is-disabled' : ''
        } ${className}`.trim()}
      >
        <input
          ref={mergedRef}
          type="checkbox"
          checked={isControlled ? checked : undefined}
          defaultChecked={!isControlled ? defaultChecked : undefined}
          readOnly={isControlled && !onChange && !props.readOnly ? true : props.readOnly}
          disabled={disabled}
          className="ui-checkbox-input"
          onChange={onChange}
          {...props}
        />
        <span className="ui-checkbox-box" aria-hidden="true">
          <svg className="ui-checkbox-icon" viewBox="0 0 16 16" fill="none">
            {indeterminate ? (
              <path
                d="M3 8h10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3.5 8.5l3 3 6.5-6.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </span>
        {content && <span className="ui-checkbox-label">{content}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

/* ==========================================================================
   10. Tabs, Tab, TabPanel
   ========================================================================== */

interface TabsContextValue {
  selectedKey: string | number;
  selectTab: (key: string | number) => void;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedKey?: string | number;
  defaultSelectedKey?: string | number;
  onSelectionChange?: (key: string | number) => void;
  orientation?: 'horizontal' | 'vertical';
  children: React.ReactNode;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      selectedKey: controlledKey,
      defaultSelectedKey,
      onSelectionChange,
      orientation = 'horizontal',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const [selectedKey, setSelectedKey] = useState<string | number>(() => {
      if (controlledKey !== undefined) return controlledKey;
      if (defaultSelectedKey !== undefined) return defaultSelectedKey;
      return '';
    });

    const activeKey = controlledKey !== undefined ? controlledKey : selectedKey;

    const selectTab = useCallback(
      (key: string | number) => {
        if (controlledKey === undefined) {
          setSelectedKey(key);
        }
        onSelectionChange?.(key);
      },
      [controlledKey, onSelectionChange]
    );

    return (
      <TabsContext.Provider value={{ selectedKey: activeKey, selectTab, orientation }}>
        <div
          ref={ref}
          className={`ui-tabs ui-tabs-${orientation} ${className}`.trim()}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

export interface TabProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  itemKey: string | number;
  label?: React.ReactNode;
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ itemKey, label, children, className = '', onClick, ...props }, ref) => {
    const ctx = useContext(TabsContext);
    const isSelected = ctx?.selectedKey === itemKey;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`tab-${itemKey}`}
        aria-controls={`tabpanel-${itemKey}`}
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        className={`ui-tab ${isSelected ? 'is-selected' : ''} ${className}`.trim()}
        onClick={(e) => {
          onClick?.(e);
          ctx?.selectTab(itemKey);
        }}
        {...props}
      >
        {label || children}
      </button>
    );
  }
);
Tab.displayName = 'Tab';

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  itemKey: string | number;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ itemKey, children, className = '', ...props }, ref) => {
    const ctx = useContext(TabsContext);
    const isSelected = ctx?.selectedKey === itemKey;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${itemKey}`}
        aria-labelledby={`tab-${itemKey}`}
        className={`ui-tabpanel is-active ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabPanel.displayName = 'TabPanel';

/* ==========================================================================
   11. Avatar
   ========================================================================== */

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | number;
}

const getInitials = (name?: string, initials?: string): string => {
  if (initials) return initials.toUpperCase().slice(0, 3);
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      initials,
      size = 'm',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);
    const sizeClass = typeof size === 'string' ? `ui-avatar-${size}` : '';
    const sizeStyle =
      typeof size === 'number' ? { width: size, height: size } : undefined;

    const displayInitials = getInitials(name, initials);

    return (
      <div
        ref={ref}
        role="img"
        aria-label={alt || name || 'Avatar'}
        className={`ui-avatar ${sizeClass} ${className}`.trim()}
        style={{ ...sizeStyle, ...style }}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="ui-avatar-img"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="ui-avatar-initials">{displayInitials}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

/* ==========================================================================
   12. ProgressCircle (Spinner)
   ========================================================================== */

export interface ProgressCircleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: 's' | 'm' | 'l' | number;
  indeterminate?: boolean;
  value?: number; // 0 to 100
  variant?: 'default' | 'overBackground' | 'accent' | 'negative' | 'positive';
  'aria-label'?: string;
}

export const ProgressCircle = forwardRef<HTMLDivElement, ProgressCircleProps>(
  (
    {
      size = 'm',
      indeterminate = true,
      value = 0,
      variant = 'default',
      'aria-label': ariaLabel = 'Loading',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const sizePx =
      typeof size === 'number'
        ? size
        : size === 's'
        ? 18
        : size === 'l'
        ? 40
        : 26;
    const strokeWidth = sizePx <= 20 ? 2.5 : sizePx <= 30 ? 3 : 4;
    const radius = (sizePx - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = indeterminate
      ? undefined
      : circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={`ui-spinner ui-spinner-${typeof size === 'string' ? size : 'custom'} ui-spinner-${variant} ${
          indeterminate ? 'is-indeterminate' : ''
        } ${className}`.trim()}
        style={{ width: sizePx, height: sizePx, ...style }}
        {...props}
      >
        <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
          <circle
            className="ui-spinner-track"
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="ui-spinner-fill"
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      </div>
    );
  }
);
ProgressCircle.displayName = 'ProgressCircle';

/* ==========================================================================
   13. Toast
   ========================================================================== */

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'positive' | 'negative' | 'notice' | 'info' | 'neutral';
  title?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      variant = 'neutral',
      title,
      onClose,
      className = '',
      children,
      role = 'status',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role={role}
        aria-live="polite"
        className={`ui-toast ui-toast-${variant} ${className}`.trim()}
        {...props}
      >
        <div className="ui-toast-content">
          {title && <div className="ui-toast-title">{title}</div>}
          <div className="ui-toast-message">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className="ui-toast-close"
            aria-label="Dismiss toast"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

/* ==========================================================================
   14. Divider
   ========================================================================== */

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 's' | 'm' | 'l';
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  (
    { orientation = 'horizontal', size = 's', className = '', ...props },
    ref
  ) => {
    return (
      <hr
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={`ui-divider ui-divider-${orientation} ui-divider-${size} ${className}`.trim()}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';

/* ==========================================================================
   15. Navigation, FieldLabel & Theme Helpers
   ========================================================================== */

export interface SideNavProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const SideNav = forwardRef<HTMLElement, SideNavProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <nav ref={ref} className={`ui-sidenav ${className}`.trim()} {...props}>
        {children}
      </nav>
    );
  }
);
SideNav.displayName = 'SideNav';

export interface SideNavItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  selected?: boolean;
  value?: string;
  children?: React.ReactNode;
}

export const SideNavItem = forwardRef<HTMLAnchorElement, SideNavItemProps>(
  ({ selected = false, className = '', children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={`ui-sidenav-item ${selected ? 'is-selected' : ''} ${className}`.trim()}
        {...props}
      >
        {children}
      </a>
    );
  }
);
SideNavItem.displayName = 'SideNavItem';

export interface FieldLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children?: React.ReactNode;
}

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ required = false, className = '', children, ...props }, ref) => {
    return (
      <label ref={ref} className={`ui-field-label ${className}`.trim()} {...props}>
        {children}
        {required && <span className="ui-required-mark">*</span>}
      </label>
    );
  }
);
FieldLabel.displayName = 'FieldLabel';

export interface ThemeProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'light' | 'dark';
  system?: string;
  scale?: string;
  children?: React.ReactNode;
}

export const Theme = forwardRef<HTMLDivElement, ThemeProps>(
  ({ color = 'light', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-theme={color}
        className={`theme-${color} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Theme.displayName = 'Theme';
