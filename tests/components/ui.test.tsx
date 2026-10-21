// tests/components/ui.test.tsx
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  ActionButton,
  Card,
  Badge,
  StatusLight,
  TextField,
  Textfield,
  Search,
  Picker,
  Menu,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeadCell,
  TableCheckboxCell,
  Dialog,
  DialogWrapper,
  Switch,
  Checkbox,
  Tabs,
  Tab,
  TabPanel,
  Avatar,
  ProgressCircle,
  Toast,
  Divider,
  SideNav,
  SideNavItem,
  FieldLabel,
  Theme,
} from '../../src/components/ui';

describe('UI Primitives Component Library', () => {
  describe('Button', () => {
    it('renders with default variant and size', () => {
      render(<Button>Click Me</Button>);
      const btn = screen.getByRole('button', { name: 'Click Me' });
      expect(btn).toBeDefined();
      expect(btn.className).toContain('ui-button');
      expect(btn.className).toContain('ui-button-primary');
      expect(btn.className).toContain('ui-button-m');
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('renders different variants, quiet mode, and handles click', () => {
      const handleClick = vi.fn();
      render(
        <Button variant="negative" size="l" quiet onClick={handleClick}>
          Delete
        </Button>
      );
      const btn = screen.getByRole('button', { name: 'Delete' });
      expect(btn.className).toContain('ui-button-negative');
      expect(btn.className).toContain('ui-button-l');
      expect(btn.className).toContain('ui-button--quiet');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles loading state with spinner and disabled behavior', () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Submitting
        </Button>
      );
      const btn = screen.getByRole('button');
      expect((btn as HTMLButtonElement).disabled).toBe(true);
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.querySelector('.ui-spinner')).toBeDefined();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('forwards ref properly', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('ActionButton', () => {
    it('renders action button with quiet styling and selected state', () => {
      render(
        <ActionButton quiet selected aria-label="Toggle Tool">
          Tool
        </ActionButton>
      );
      const btn = screen.getByRole('button', { name: 'Toggle Tool' });
      expect(btn.className).toContain('ui-action-button');
      expect(btn.className).toContain('ui-action-button--quiet');
      expect(btn.className).toContain('is-selected');
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Card', () => {
    it('renders with heading, subheading, and body', () => {
      render(
        <Card heading="Invoice Summary" subheading="Past 30 days">
          <p>Card Content</p>
        </Card>
      );
      expect(screen.getByText('Invoice Summary')).toBeDefined();
      expect(screen.getByText('Past 30 days')).toBeDefined();
      expect(screen.getByText('Card Content')).toBeDefined();
    });

    it('supports slot children (heading, footer)', () => {
      render(
        <Card>
          <h2 slot="heading">Slotted Title</h2>
          <div slot="footer">
            <Button>Footer Action</Button>
          </div>
          <div>Slotted Body Content</div>
        </Card>
      );
      expect(screen.getByText('Slotted Title')).toBeDefined();
      expect(screen.getByText('Footer Action')).toBeDefined();
      expect(screen.getByText('Slotted Body Content')).toBeDefined();
    });

    it('renders direct children when no slots or headings are used', () => {
      const { container } = render(
        <Card className="custom-card">
          <div className="custom-inner">Direct child</div>
        </Card>
      );
      expect(container.querySelector('.ui-card.custom-card')).toBeDefined();
      expect(screen.getByText('Direct child')).toBeDefined();
    });
  });

  describe('Badge', () => {
    it('renders with variant colors', () => {
      render(<Badge variant="positive">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('ui-badge');
      expect(badge.className).toContain('ui-badge-positive');
      expect(badge.className).toContain('ui-badge-m');
    });
  });

  describe('StatusLight', () => {
    it('renders dot indicator and status text', () => {
      render(<StatusLight variant="notice">Pending Review</StatusLight>);
      const status = screen.getByRole('status');
      expect(status.className).toContain('ui-status-light');
      expect(status.className).toContain('ui-status-notice');
      expect(status.querySelector('.ui-status-dot')).toBeDefined();
      expect(screen.getByText('Pending Review')).toBeDefined();
    });
  });

  describe('TextField / Textfield', () => {
    it('renders label, input, and handles typing', () => {
      const handleChange = vi.fn();
      render(
        <TextField
          label="Email Address"
          placeholder="user@example.com"
          onChange={handleChange}
        />
      );
      const input = screen.getByPlaceholderText('user@example.com');
      expect(screen.getByText('Email Address')).toBeDefined();
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders invalid error state and helper hint', () => {
      render(
        <Textfield
          label="Password"
          invalid
          error="Password too short"
          hint="Minimum 8 characters"
        />
      );
      expect(screen.getByRole('alert').textContent).toContain('Password too short');
      const input = screen.getByLabelText(/Password/);
      expect(input.className).toContain('is-invalid');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('forwards ref to the input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<TextField ref={ref} label="Field" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Search', () => {
    it('renders search input with clear button and triggers callbacks', () => {
      const handleInput = vi.fn();
      render(
        <Search
          placeholder="Search items..."
          value="Invoice #123"
          onInput={handleInput}
        />
      );
      const input = screen.getByPlaceholderText('Search items...') as HTMLInputElement;
      expect(input.value).toBe('Invoice #123');
      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeDefined();
      fireEvent.click(clearBtn);
      expect(input.value).toBe('');
    });
  });

  describe('Picker / Select and MenuItem', () => {
    it('renders select with options when MenuItems are nested', () => {
      const handleChange = vi.fn();
      render(
        <Picker value="approved" onChange={handleChange} aria-label="Status filter">
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Picker>
      );
      const select = screen.getByRole('combobox', { name: 'Status filter' }) as HTMLSelectElement;
      expect(select.value).toBe('approved');
      fireEvent.change(select, { target: { value: 'rejected' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders standalone Menu and MenuItem', () => {
      const handleItemClick = vi.fn();
      render(
        <Menu>
          <MenuItem onClick={handleItemClick}>Option 1</MenuItem>
          <MenuItem disabled>Option 2 Disabled</MenuItem>
        </Menu>
      );
      const item1 = screen.getByRole('menuitem', { name: 'Option 1' });
      fireEvent.click(item1);
      expect(handleItemClick).toHaveBeenCalledTimes(1);

      const item2 = screen.getByText('Option 2 Disabled');
      expect(item2.className).toContain('is-disabled');
    });
  });

  describe('Table Components', () => {
    it('renders full semantic HTML table structure', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableCheckboxCell headCell checked label="Select all" />
              <TableHeadCell sortable sortDirection="asc">
                Name
              </TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow selected>
              <TableCheckboxCell checked label="Select row 1" />
              <TableCell>Alex Rivera</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toBeDefined();
      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByText('Alex Rivera')).toBeDefined();
      expect(screen.getByText('Admin')).toBeDefined();
    });
  });

  describe('Dialog & DialogWrapper', () => {
    it('renders dialog with slots, title, and handles close via button and Escape', () => {
      const handleClose = vi.fn();
      render(
        <Dialog
          size="m"
          dismissable
          onClose={handleClose}
          title="Confirm Action"
        >
          <p>Are you sure?</p>
          <div slot="button">
            <Button onClick={handleClose}>Confirm</Button>
          </div>
        </Dialog>
      );
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Confirm Action')).toBeDefined();
      expect(screen.getByText('Are you sure?')).toBeDefined();

      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('renders modal backdrop in DialogWrapper', () => {
      render(
        <DialogWrapper isOpen title="Modal Dialog">
          Modal Content
        </DialogWrapper>
      );
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Modal Content')).toBeDefined();
    });
  });

  describe('Switch', () => {
    it('renders accessible switch and toggles checked state', () => {
      const handleChange = vi.fn();
      render(<Switch label="Enable notifications" onChange={handleChange} />);
      const switchEl = screen.getByRole('switch', { name: 'Enable notifications' }) as HTMLInputElement;
      expect(switchEl.checked).toBe(false);
      fireEvent.click(switchEl);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Checkbox', () => {
    it('renders checkbox and supports indeterminate state', () => {
      const { rerender } = render(<Checkbox label="Select item" checked={false} indeterminate />);
      const checkbox = screen.getByRole('checkbox', { name: 'Select item' }) as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);

      rerender(<Checkbox label="Select item" checked={true} />);
      expect(checkbox.indeterminate).toBe(false);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Tabs, Tab, TabPanel', () => {
    it('switches between tab panels on click', () => {
      render(
        <Tabs defaultSelectedKey="tab1">
          <div className="tab-headers">
            <Tab itemKey="tab1">Tab 1</Tab>
            <Tab itemKey="tab2">Tab 2</Tab>
          </div>
          <TabPanel itemKey="tab1">Content for tab 1</TabPanel>
          <TabPanel itemKey="tab2">Content for tab 2</TabPanel>
        </Tabs>
      );
      expect(screen.getByText('Content for tab 1')).toBeDefined();
      expect(screen.queryByText('Content for tab 2')).toBeNull();

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByText('Content for tab 2')).toBeDefined();
      expect(screen.queryByText('Content for tab 1')).toBeNull();
    });
  });

  describe('Avatar', () => {
    it('computes initials from name if no image', () => {
      render(<Avatar name="Sarah Chen" />);
      expect(screen.getByText('SC')).toBeDefined();
    });
  });

  describe('ProgressCircle', () => {
    it('renders accessible progress circle spinner', () => {
      render(<ProgressCircle aria-label="Loading files" />);
      const spinner = screen.getByRole('progressbar', { name: 'Loading files' });
      expect(spinner.className).toContain('ui-spinner');
      expect(spinner.className).toContain('is-indeterminate');
    });
  });

  describe('Toast', () => {
    it('renders toast notification with title and dismiss button', () => {
      const handleClose = vi.fn();
      render(
        <Toast variant="positive" title="Saved" onClose={handleClose}>
          Invoice updated successfully.
        </Toast>
      );
      expect(screen.getByText('Saved')).toBeDefined();
      expect(screen.getByText('Invoice updated successfully.')).toBeDefined();
      const closeBtn = screen.getByLabelText('Dismiss toast');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Divider', () => {
    it('renders horizontal and vertical separators', () => {
      render(<Divider orientation="horizontal" size="s" />);
      const divider = screen.getByRole('separator');
      expect(divider.className).toContain('ui-divider-horizontal');
      expect(divider.className).toContain('ui-divider-s');
    });
  });

  describe('Navigation & Theme Helpers', () => {
    it('renders SideNav, SideNavItem, FieldLabel, and Theme', () => {
      render(
        <Theme color="dark">
          <SideNav>
            <SideNavItem href="/home" selected>
              Home
            </SideNavItem>
          </SideNav>
          <FieldLabel required htmlFor="test-input">
            Test Label
          </FieldLabel>
        </Theme>
      );
      expect(screen.getByText('Home').className).toContain('is-selected');
      expect(screen.getByText('Test Label')).toBeDefined();
      expect(screen.getByText('*').className).toContain('ui-required-mark');
    });
  });
});
