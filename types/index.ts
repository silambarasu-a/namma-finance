/**
 * Centralized Type Definitions
 * Reusable types and interfaces across the application
 */

import { Role } from "@prisma/client";
import { ReactNode } from "react";

// ============================================================================
// Table Types
// ============================================================================

export interface TableColumn<T = Record<string, unknown>> {
  header: string;
  accessor: string;
  mobileLabel?: string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
}

// ============================================================================
// Chart Types
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface LineChartDataPoint {
  name: string;
  [key: string]: string | number | undefined;
}

export interface PieChartEntry {
  name: string;
  value: number;
  percent: number;
  color?: string;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  canDeleteCollections?: boolean;
  canDeleteCustomers?: boolean;
  canDeleteUsers?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export interface Customer {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  dob: string | null;
  kycStatus: string;
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: string;
  totalPaid: string;
  outstanding: string;
  createdAt: string;
  [key: string]: unknown;
}

// ============================================================================
// Loan Types
// ============================================================================

export interface Loan {
  id: string;
  loanNumber: string;
  customerName: string;
  customerEmail: string;
  principal: string;
  interestRate: string;
  tenureInInstallments: number;
  status: string;
  disbursedAmount?: string;
  totalCollected?: string;
  outstandingPrincipal?: string;
  outstandingInterest?: string;
  createdAt: string;
  nextEmi?: {
    installmentNumber: number;
    dueDate: string;
    totalDue: string;
  } | null;
  [key: string]: unknown;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface Collection {
  id: string;
  loanNumber: string;
  customerName: string;
  amount: string;
  principalAmount: string;
  interestAmount: string;
  lateFee: string;
  penalty: string;
  receiptNumber: string;
  collectionDate: string;
  paymentMode: string;
  agentName: string;
  [key: string]: unknown;
}

// ============================================================================
// Borrowing Types
// ============================================================================

export interface Borrowing {
  id: string;
  lenderName: string;
  lenderPhone: string | null;
  lenderEmail: string | null;
  amount: string;
  interestRate: string;
  startDate: string;
  endDate: string | null;
  status: string;
  outstandingAmount: string;
  totalPaid: string;
  remarks: string | null;
  createdAt: string;
  [key: string]: unknown;
}

// ============================================================================
// Investment Types
// ============================================================================

export interface Investment {
  id: string;
  investorName: string;
  investorPhone: string | null;
  investorEmail: string | null;
  amount: string;
  interestRate: string;
  startDate: string;
  endDate: string | null;
  status: string;
  returns: string;
  remarks: string | null;
  createdAt: string;
  [key: string]: unknown;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface Analytics {
  period: string;
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  closedLoans: number;
  defaultedLoans: number;
  overdueLoans: number;
  totalDisbursed: string;
  totalCollected: string;
  principalCollected: string;
  interestCollected: string;
  totalOutstanding: string;
  totalOutstandingPrincipal: string;
  totalOutstandingInterest: string;
  overdueAmount: string;
  totalLateFees: string;
  totalPenalties: string;
  expectedInterest: string;
  profitLoss: string;
  collectionRate: string;
  totalCustomers: number;
  totalAgents: number;
  totalCollections: number;
  investmentCapital: string;
  borrowingsCapital: string;
  totalCapital: string;
  capitalBalance: string;
  hasCapitalSurplus: boolean;
  capitalUtilization: string;
  monthlyTrend: MonthlyTrendData[];
  statusBreakdown: {
    active: number;
    pending: number;
    closed: number;
    defaulted: number;
  };
}

export interface MonthlyTrendData {
  month: string;
  disbursed: number;
  collected: number;
  loans: number;
  [key: string]: unknown;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// Form Types
// ============================================================================

export interface CustomerFormData {
  name: string;
  email?: string;
  phone: string;
  password: string;
  dob?: string;
  address?: string;
  idProof?: string;
  kycStatus?: string;
}

export interface LoanFormData {
  customerId: string;
  principal: string;
  interestRate: string;
  tenureInInstallments: number;
  frequency: string;
  startDate: string;
  remarks?: string;
}

export interface CollectionFormData {
  loanId: string;
  amount: string;
  collectionDate: string;
  paymentMode: string;
  transactionId?: string;
  notes?: string;
}

export interface BorrowingFormData {
  lenderName: string;
  lenderPhone?: string;
  lenderEmail?: string;
  amount: string;
  interestRate: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface InvestmentFormData {
  investorName: string;
  investorPhone?: string;
  investorEmail?: string;
  amount: string;
  interestRate: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

export interface DashboardLayoutProps {
  userRole: string;
  userName: string;
  userEmail: string;
  children: ReactNode;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SortOrder = "asc" | "desc";

export type FilterOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith";

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface SortCriteria {
  field: string;
  order: SortOrder;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: FilterCriteria[];
  sort?: SortCriteria;
}
