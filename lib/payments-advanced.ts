/**
 * Advanced Payment Calculations
 *
 * Handles:
 * - Interest-only loans (no principal reduction)
 * - Bullet payment loans (principal at maturity)
 * - Late fee calculations
 * - Penalty calculations
 * - Top-up loan calculations
 */

import Decimal from "decimal.js";
import { Frequency, getInstallmentsPerYear } from "./payments";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type RepaymentType = "EMI" | "INTEREST_ONLY" | "BULLET_PAYMENT" | "REDUCING_BALANCE";

export interface AdvancedLoanTerms {
  principal: string | number | Decimal;
  annualInterestPercent: string | number | Decimal;
  tenureInstallments: number;
  frequency: Frequency;
  repaymentType: RepaymentType;
  customPeriodDays?: number;
}

/**
 * Calculate installment amount for INTEREST_ONLY loans
 *
 * In interest-only loans, customer pays ONLY interest each period.
 * Principal remains unchanged and is paid at the end (or never reduced).
 *
 * Example:
 * - Loan: ₹1,00,000 @ 12% annual, monthly payments
 * - Monthly interest: ₹1,000 (₹1,00,000 × 12% / 12)
 * - Each month customer pays ₹1,000 only
 * - Principal stays ₹1,00,000 throughout
 */
export function calculateInterestOnlyInstallment(
  principal: string | number | Decimal,
  annualInterestPercent: string | number | Decimal,
  frequency: Frequency,
  customPeriodDays?: number
): Decimal {
  const P = new Decimal(principal);
  const annualRate = new Decimal(annualInterestPercent).dividedBy(100);

  if (P.lte(0)) {
    throw new Error("Principal must be greater than 0");
  }

  const installmentsPerYear = getInstallmentsPerYear(frequency, customPeriodDays);
  const ratePerPeriod = annualRate.dividedBy(installmentsPerYear);

  // Interest-only: just the interest for one period
  const interestAmount = P.mul(ratePerPeriod);

  return interestAmount.toDecimalPlaces(2);
}

/**
 * Calculate total payment for BULLET PAYMENT loan
 *
 * Bullet loans: Pay interest periodically, full principal at maturity
 *
 * Example:
 * - Loan: ₹1,00,000 @ 12% annual, monthly payments for 12 months
 * - Monthly interest: ₹1,000
 * - At maturity (month 12): ₹1,000 (interest) + ₹1,00,000 (principal) = ₹1,01,000
 */
export function calculateBulletPaymentSchedule(
  terms: AdvancedLoanTerms
): {
  periodicInterest: Decimal;
  finalPayment: Decimal;
  totalInterest: Decimal;
  totalPayment: Decimal;
} {
  const principal = new Decimal(terms.principal);
  const periodicInterest = calculateInterestOnlyInstallment(
    terms.principal,
    terms.annualInterestPercent,
    terms.frequency,
    terms.customPeriodDays
  );

  const totalInterest = periodicInterest.mul(terms.tenureInstallments);
  const finalPayment = principal.plus(periodicInterest);
  const totalPayment = principal.plus(totalInterest);

  return {
    periodicInterest: periodicInterest.toDecimalPlaces(2),
    finalPayment: finalPayment.toDecimalPlaces(2),
    totalInterest: totalInterest.toDecimalPlaces(2),
    totalPayment: totalPayment.toDecimalPlaces(2),
  };
}

/**
 * Calculate late fee based on days overdue
 *
 * Common formulas:
 * 1. Flat fee per day (e.g., ₹50/day)
 * 2. Percentage of installment per day (e.g., 1% per day)
 * 3. Percentage of outstanding per day (e.g., 0.1% per day)
 *
 * @param daysOverdue Number of days payment is late
 * @param lateFeeRate Daily late fee rate as percentage (e.g., 0.1 = 0.1% per day)
 * @param baseAmount Amount to calculate late fee on (installment or outstanding)
 * @param maxLateFee Optional maximum late fee cap
 */
export function calculateLateFee(
  daysOverdue: number,
  lateFeeRate: string | number | Decimal,
  baseAmount: string | number | Decimal,
  maxLateFee?: string | number | Decimal
): Decimal {
  if (daysOverdue <= 0) {
    return new Decimal(0);
  }

  const rate = new Decimal(lateFeeRate).dividedBy(100); // Convert percentage to decimal
  const base = new Decimal(baseAmount);

  // Daily late fee = baseAmount × rate
  const dailyFee = base.mul(rate);

  // Total late fee = daily fee × days
  let lateFee = dailyFee.mul(daysOverdue);

  // Apply maximum cap if specified
  if (maxLateFee) {
    const max = new Decimal(maxLateFee);
    lateFee = Decimal.min(lateFee, max);
  }

  return lateFee.toDecimalPlaces(2);
}

/**
 * Calculate penalty for specific event
 *
 * Common scenarios:
 * - Bounced check: Flat fee (e.g., ₹500)
 * - Early closure penalty: % of outstanding (e.g., 2% of outstanding principal)
 * - Default penalty: % of outstanding (e.g., 5% of outstanding)
 *
 * @param reason Reason for penalty ("DEFAULT", "BOUNCED_CHECK", "PRECLOSURE", etc.)
 * @param penaltyRate Penalty rate as percentage
 * @param baseAmount Amount to calculate penalty on
 * @param flatAmount Optional flat penalty amount (overrides percentage)
 */
export function calculatePenalty(
  reason: string,
  penaltyRate: string | number | Decimal,
  baseAmount: string | number | Decimal,
  flatAmount?: string | number | Decimal
): {
  amount: Decimal;
  reason: string;
} {
  let amount: Decimal;

  if (flatAmount) {
    // Flat penalty (e.g., bounced check fee)
    amount = new Decimal(flatAmount);
  } else {
    // Percentage-based penalty
    const rate = new Decimal(penaltyRate).dividedBy(100);
    const base = new Decimal(baseAmount);
    amount = base.mul(rate);
  }

  return {
    amount: amount.toDecimalPlaces(2),
    reason,
  };
}

/**
 * Calculate top-up loan details
 *
 * When customer wants additional amount on existing loan:
 * 1. Calculate outstanding on existing loan
 * 2. Add new top-up amount
 * 3. Calculate new EMI based on combined amount
 * 4. Optionally extend or keep same tenure
 *
 * @param existingLoan Current loan details
 * @param topUpAmount Additional amount customer wants
 * @param newTenure New tenure in installments (if changing)
 * @param newInterestRate New interest rate (if changing)
 */
export function calculateTopUpLoan(params: {
  existingPrincipal: string | number | Decimal;
  existingOutstanding: string | number | Decimal;
  topUpAmount: string | number | Decimal;
  interestRate: string | number | Decimal;
  newTenure: number;
  frequency: Frequency;
  repaymentType: RepaymentType;
  customPeriodDays?: number;
}): {
  newPrincipal: Decimal;
  topUpAmount: Decimal;
  newInstallment: Decimal;
  incrementInEMI: Decimal;
  remarks: string;
} {
  const outstanding = new Decimal(params.existingOutstanding);
  const topUp = new Decimal(params.topUpAmount);
  const newPrincipal = outstanding.plus(topUp);

  let newInstallment: Decimal;

  if (params.repaymentType === "INTEREST_ONLY" || params.repaymentType === "BULLET_PAYMENT") {
    newInstallment = calculateInterestOnlyInstallment(
      newPrincipal,
      params.interestRate,
      params.frequency,
      params.customPeriodDays
    );
  } else {
    // Standard EMI calculation (import from payments.ts)
    const { calculateInstallmentAmount } = require("./payments");
    newInstallment = calculateInstallmentAmount(
      newPrincipal,
      params.interestRate,
      params.newTenure,
      params.frequency,
      params.customPeriodDays
    );
  }

  // Calculate old installment to show increment
  const { calculateInstallmentAmount } = require("./payments");
  const oldInstallment =
    params.repaymentType === "INTEREST_ONLY" || params.repaymentType === "BULLET_PAYMENT"
      ? calculateInterestOnlyInstallment(
          outstanding,
          params.interestRate,
          params.frequency,
          params.customPeriodDays
        )
      : calculateInstallmentAmount(
          outstanding,
          params.interestRate,
          params.newTenure,
          params.frequency,
          params.customPeriodDays
        );

  const incrementInEMI = newInstallment.minus(oldInstallment);

  return {
    newPrincipal: newPrincipal.toDecimalPlaces(2),
    topUpAmount: topUp.toDecimalPlaces(2),
    newInstallment: newInstallment.toDecimalPlaces(2),
    incrementInEMI: incrementInEMI.toDecimalPlaces(2),
    remarks: `Top-up of ${topUp} added to existing outstanding of ${outstanding}`,
  };
}

/**
 * Calculate if payment is overdue and by how many days
 */
export function calculateOverdueDays(dueDate: Date, currentDate: Date = new Date()): number {
  const due = new Date(dueDate);
  const now = new Date(currentDate);

  // Set time to start of day for accurate day calculation
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  if (now <= due) {
    return 0; // Not overdue
  }

  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate grace period adjusted overdue days
 */
export function calculateOverdueDaysWithGrace(
  dueDate: Date,
  gracePeriodDays: number,
  currentDate: Date = new Date()
): number {
  const overdueDays = calculateOverdueDays(dueDate, currentDate);

  if (overdueDays <= gracePeriodDays) {
    return 0; // Still within grace period
  }

  return overdueDays - gracePeriodDays;
}

/**
 * Calculate total outstanding including late fees and penalties
 */
export function calculateTotalOutstanding(params: {
  outstandingPrincipal: string | number | Decimal;
  outstandingInterest: string | number | Decimal;
  unpaidLateFees: string | number | Decimal;
  unpaidPenalties: string | number | Decimal;
}): {
  principalOutstanding: Decimal;
  interestOutstanding: Decimal;
  lateFeesOutstanding: Decimal;
  penaltiesOutstanding: Decimal;
  totalOutstanding: Decimal;
} {
  const principal = new Decimal(params.outstandingPrincipal);
  const interest = new Decimal(params.outstandingInterest);
  const lateFees = new Decimal(params.unpaidLateFees);
  const penalties = new Decimal(params.unpaidPenalties);

  const total = principal.plus(interest).plus(lateFees).plus(penalties);

  return {
    principalOutstanding: principal.toDecimalPlaces(2),
    interestOutstanding: interest.toDecimalPlaces(2),
    lateFeesOutstanding: lateFees.toDecimalPlaces(2),
    penaltiesOutstanding: penalties.toDecimalPlaces(2),
    totalOutstanding: total.toDecimalPlaces(2),
  };
}

/**
 * Allocate collection with priority order
 *
 * Priority: Late Fees > Penalties > Interest > Principal
 */
export function allocateCollectionWithFees(
  collectionAmount: string | number | Decimal,
  unpaidLateFees: string | number | Decimal,
  unpaidPenalties: string | number | Decimal,
  outstandingInterest: string | number | Decimal,
  outstandingPrincipal: string | number | Decimal
): {
  lateFeeAmount: Decimal;
  penaltyAmount: Decimal;
  interestAmount: Decimal;
  principalAmount: Decimal;
  remaining: Decimal;
} {
  let remaining = new Decimal(collectionAmount);

  // 1. Pay late fees first
  const lateFees = new Decimal(unpaidLateFees);
  const lateFeeAmount = Decimal.min(remaining, lateFees);
  remaining = remaining.minus(lateFeeAmount);

  // 2. Pay penalties second
  const penalties = new Decimal(unpaidPenalties);
  const penaltyAmount = Decimal.min(remaining, penalties);
  remaining = remaining.minus(penaltyAmount);

  // 3. Pay interest third
  const interest = new Decimal(outstandingInterest);
  const interestAmount = Decimal.min(remaining, interest);
  remaining = remaining.minus(interestAmount);

  // 4. Pay principal last
  const principal = new Decimal(outstandingPrincipal);
  const principalAmount = Decimal.min(remaining, principal);
  remaining = remaining.minus(principalAmount);

  return {
    lateFeeAmount: lateFeeAmount.toDecimalPlaces(2),
    penaltyAmount: penaltyAmount.toDecimalPlaces(2),
    interestAmount: interestAmount.toDecimalPlaces(2),
    principalAmount: principalAmount.toDecimalPlaces(2),
    remaining: remaining.toDecimalPlaces(2),
  };
}

/**
 * Validate advanced loan terms
 */
export function validateAdvancedLoanTerms(terms: AdvancedLoanTerms): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Import base validation
  const { validateLoanTerms } = require("./payments");
  const baseValidation = validateLoanTerms({
    principal: terms.principal,
    annualInterestPercent: terms.annualInterestPercent,
    tenureInstallments: terms.tenureInstallments,
    frequency: terms.frequency,
    customPeriodDays: terms.customPeriodDays,
  });

  errors.push(...baseValidation.errors);

  // Additional validation for repayment type
  if (!["EMI", "INTEREST_ONLY", "BULLET_PAYMENT", "REDUCING_BALANCE"].includes(terms.repaymentType)) {
    errors.push("Invalid repayment type");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
