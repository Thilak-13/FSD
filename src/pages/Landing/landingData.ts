// src/pages/Landing/landingData.ts
import { Role } from '../../types';

export interface DemoAccount {
  role: Role;
  name: string;
  email: string;
  department: string;
  initials: string;
  badgeVariant: 'notice' | 'positive' | 'info';
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'Admin',
    name: 'Alex Rivera',
    email: 'alex.rivera@apex.corp',
    department: 'Finance Operations',
    initials: 'AR',
    badgeVariant: 'notice',
    description:
      'Executive & System Control: Full access to all invoices, vendors, payment scheduling, and immutable audit logs',
  },
  {
    role: 'Approver',
    name: 'Sarah Chen',
    email: 'sarah.chen@apex.corp',
    department: 'Procurement & Operations',
    initials: 'SC',
    badgeVariant: 'positive',
    description:
      'Triage & Approval: Verification queue, tolerance review, invoice approvals & flagging, spend analytics',
  },
  {
    role: 'Requester',
    name: 'Jordan Lee',
    email: 'jordan.lee@apex.corp',
    department: 'Engineering / Facilities',
    initials: 'JL',
    badgeVariant: 'info',
    description:
      'Submit & Track: Invoice submission, real-time status tracking, PDF attachment upload',
  },
];

export interface PlatformStat {
  id: string;
  value: string;
  label: string;
  subtext: string;
  testId: string;
}

export const PLATFORM_STATS: PlatformStat[] = [
  {
    id: 'invoices',
    value: '32+',
    label: 'Active Invoices',
    subtext: 'Real-time triage queue',
    testId: 'stat-active-invoices',
  },
  {
    id: 'vendors',
    value: '6',
    label: 'Enterprise Vendors',
    subtext: 'Pre-cleared suppliers',
    testId: 'stat-enterprise-vendors',
  },
  {
    id: 'pos',
    value: '12',
    label: 'Purchase Orders',
    subtext: 'Line-item linked POs',
    testId: 'stat-purchase-orders',
  },
  {
    id: 'verified',
    value: '₹250k+',
    label: 'Verified',
    subtext: 'Zero-fraud approvals',
    testId: 'stat-verified-spend',
  },
];

export interface FeatureHighlight {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  testId: string;
}

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'mern',
    tag: 'Enterprise Architecture',
    title: 'Enterprise MERN Architecture',
    subtitle: 'MongoDB, Express, React 18 & Node.js',
    description:
      'Decoupled full-stack architecture built for high-throughput enterprise accounts payable. Combines indexed MongoDB persistence, Express REST APIs with JWT & RBAC protection, and React 18 with modern design tokens.',
    highlights: [
      'MongoDB Atlas document persistence with schema validation',
      'Express & Node.js REST API with granular RBAC middleware',
      'React 18 & TypeScript with reactive context pipelines',
      'Standard accessible design tokens and responsive enterprise UX',
    ],
    testId: 'feature-mern',
  },
  {
    id: 'matching',
    tag: 'Tolerance Engine',
    title: 'Automated 3-Way PO Matching',
    subtitle: 'Purchase Orders, GRN & Invoices',
    description:
      'Algorithmic cross-reconciliation linking Purchase Orders, Goods Received Notes, and Vendor Invoices. Automatically flags unit price variances, quantity discrepancies, and unexpected line-item additions beyond set tolerances.',
    highlights: [
      '3-Way cross-reconciliation across PO, GRN, and Invoices',
      'Granular tolerance thresholds flagging variances over 5%',
      'Line-item itemization with unit prices and quantity tracking',
      'Automated triage status transitions (Pending, Approved, Flagged)',
    ],
    testId: 'feature-3way-matching',
  },
  {
    id: 'alerts',
    tag: 'Event-Driven Workflow',
    title: 'Automated Email & System Alerts',
    subtitle: 'Real-Time SLA & Verification Pings',
    description:
      'Intelligent dispatch pipeline delivering instant notifications across the invoice lifecycle. Escalates urgent SLA deadlines for pending invoices, informs submitters on real-time status changes, and sends vendor remittance confirmations.',
    highlights: [
      'Proactive SLA deadline alerts for pending approval queues',
      'Discrepancy escalation pings to department managers',
      'Payment scheduling and disbursement confirmation emails',
      'Comprehensive audit trail synchronization for all alerts',
    ],
    testId: 'feature-email-alerts',
  },
];
