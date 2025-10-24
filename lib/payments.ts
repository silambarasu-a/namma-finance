/**
 * Payment Calculation Utilities
 *
 * This module provides precise decimal-based calculations for loan EMIs,
 * outstanding balances, preclosure amounts, and interest computations.
 *
 * Key principles:
 * - All money calculations use decimal.js to avoid floating-point errors
 * - Support for multiple frequencies (daily, weekly, monthly, etc.)
 * - Handles edge cases (zero interest, single installment, etc.)
 * - All functions return Decimal instances for chaining
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type Frequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "CUSTOM";

export interface LoanTerms {
  principal: string | number | Decimal;
  annualInterestPercent: string | number | Decimal;
  tenureInstallments: number;
  frequency: Frequency;
  customPeriodDays?: number;
}

export interface EMIScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalDue: Decimal;
  interestDue: Decimal;
  totalDue: Decimal;
  outstandingBalance: Decimal;
}

/**
 * Get number of installments per year based on frequency
 */
export function getInstallmentsPerYear(
  frequency: Frequency,
  customPeriodDays?: number
): number {
  const mapping: Record<Frequency, number> = {
    DAILY: 365,
    WEEKLY: 52,
    MONTHLY: 12,
    QUARTERLY: 4,
    HALF_YEARLY: 2,
    YEARLY: 1,
    CUSTOM: customPeriodDays ? Math.floor(365 / customPeriodDays) : 12,
  };

  return mapping[frequency];
}

/**
 * Calculate EMI using the standard amortization formula
 *
 * Formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * Where:
 *   P = Principal loan amount
 *   r = Interest rate per installment period
 *   n = Number of installments
 *
 * Edge cases:
 * - If interest rate is 0, returns principal / tenure
 * - For single installment, returns principal + interest
 *
 * @returns Installment amount rounded to 2 decimal places
 */
export function calculateInstallmentAmount(
  principal: string | number | Decimal,
  annualInterestPercent: string | number | Decimal,
  tenureInstallments: number,
  frequency: Frequency,
  customPeriodDays?: number
): Decimal {
  const P = new Decimal(principal);
  const annualRate = new Decimal(annualInterestPercent).dividedBy(100);

  // Validate inputs
  if (P.lte(0)) {
    throw new Error("Principal must be greater than 0");
  }
  if (tenureInstallments <= 0) {
    throw new Error("Tenure must be greater than 0");
  }

  // Convert annual rate to per-installment rate
  const installmentsPerYear = getInstallmentsPerYear(frequency, customPeriodDays);
  const r = annualRate.dividedBy(installmentsPerYear);

  // Handle zero interest case
  if (r.eq(0)) {
    return P.dividedBy(tenureInstallments).toDecimalPlaces(2);
  }

  // Handle single installment case
  if (tenureInstallments === 1) {
    return P.plus(P.mul(r)).toDecimalPlaces(2);
  }

  // Standard EMI formula: P × r × (1 + r)^n / ((1 + r)^n - 1)
  const onePlusR = new Decimal(1).plus(r);
  const onePlusRPowerN = onePlusR.pow(tenureInstallments);

  const numerator = P.mul(r).mul(onePlusRPowerN);
  const denominator = onePlusRPowerN.minus(1);

  return numerator.dividedBy(denominator).toDecimalPlaces(2);
}

/**
 * Calculate total interest over the loan tenure
 */
export function calculateTotalInterest(
  principal: string | number | Decimal,
  annualInterestPercent: string | number | Decimal,
  tenureInstallments: number,
  frequency: Frequency,
  customPeriodDays?: number
): Decimal {
  const installmentAmount = calculateInstallmentAmount(
    principal,
    annualInterestPercent,
    tenureInstallments,
    frequency,
    customPeriodDays
  );

  const totalPayment = installmentAmount.mul(tenureInstallments);
  const totalInterest = totalPayment.minus(new Decimal(principal));

  return totalInterest.toDecimalPlaces(2);
}

/**
 * Calculate outstanding balance after k installments have been paid
 *
 * Uses iterative amortization schedule to ensure accuracy and
 * avoid rounding discrepancies.
 *
 * @param k Number of installments already paid
 * @returns Outstanding principal balance
 */
export function outstandingAfterK(
  principal: string | number | Decimal,
  annualInterestPercent: string | number | Decimal,
  tenureInstallments: number,
  frequency: Frequency,
  k: number,
  customPeriodDays?: number
): Decimal {
  if (k < 0) {
    throw new Error("Number of paid installments cannot be negative");
  }
  if (k >= tenureInstallments) {
    return new Decimal(0);
  }

  const installment = calculateInstallmentAmount(
    principal,
    annualInterestPercent,
    tenureInstallments,
    frequency,
    customPeriodDays
  );

  let remaining = new Decimal(principal);
  const annualRate = new Decimal(annualInterestPercent).dividedBy(100);
  const installmentsPerYear = getInstallmentsPerYear(frequency, customPeriodDays);
  const r = annualRate.dividedBy(installmentsPerYear);

  // Iterate through each installment to track principal reduction
  for (let i = 0; i < k; i++) {
    const interestForPeriod = remaining.mul(r);
    const principalPaid = Decimal.min(installment.minus(interestForPeriod), remaining);
    remaining = remaining.minus(principalPaid);

    // Prevent negative balances due to rounding
    if (remaining.lt(0)) {
      remaining = new Decimal(0);
    }
  }

  return remaining.toDecimalPlaces(2);
}

/**
 * Generate complete EMI schedule for a loan
 *
 * Returns an array of schedule items showing:
 * - Installment number
 * - Due date
 * - Principal and interest breakdown
 * - Outstanding balance after payment
 *
 * @param startDate Loan start date
 */
export function generateEMISchedule(
  terms: LoanTerms,
  startDate: Date
): EMIScheduleItem[] {
  const { principal, annualInterestPercent, tenureInstallments, frequency, customPeriodDays } =
    terms;

  const installmentAmount = calculateInstallmentAmount(
    principal,
    annualInterestPercent,
    tenureInstallments,
    frequency,
    customPeriodDays
  );

  let outstandingBalance = new Decimal(principal);
  const annualRate = new Decimal(annualInterestPercent).dividedBy(100);
  const installmentsPerYear = getInstallmentsPerYear(frequency, customPeriodDays);
  const r = annualRate.dividedBy(installmentsPerYear);

  const schedule: EMIScheduleItem[] = [];

  for (let i = 1; i <= tenureInstallments; i++) {
    // Calculate interest for this period
    const interestDue = outstandingBalance.mul(r).toDecimalPlaces(2);

    // Principal is the remainder of installment amount
    let principalDue = installmentAmount.minus(interestDue);

    // On last installment, adjust for any rounding differences
    if (i === tenureInstallments) {
      principalDue = outstandingBalance;
    }

    // Ensure principal doesn't exceed outstanding
    principalDue = Decimal.min(principalDue, outstandingBalance);

    const totalDue = principalDue.plus(interestDue);

    // Calculate due date based on frequency
    const dueDate = calculateDueDate(startDate, i, frequency, customPeriodDays);

    // Update outstanding balance
    const newBalance = outstandingBalance.minus(principalDue);
    outstandingBalance = newBalance.lt(0) ? new Decimal(0) : newBalance;

    schedule.push({
      installmentNumber: i,
      dueDate,
      principalDue: principalDue.toDecimalPlaces(2),
      interestDue: interestDue.toDecimalPlaces(2),
      totalDue: totalDue.toDecimalPlaces(2),
      outstandingBalance: outstandingBalance.toDecimalPlaces(2),
    });
  }

  return schedule;
}

/**
 * Calculate due date for a given installment number
 */
export function calculateDueDate(
  startDate: Date,
  installmentNumber: number,
  frequency: Frequency,
  customPeriodDays?: number
): Date {
  const date = new Date(startDate);

  switch (frequency) {
    case "DAILY":
      date.setDate(date.getDate() + installmentNumber);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + installmentNumber * 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + installmentNumber);
      break;
    case "QUARTERLY":
      date.setMonth(date.getMonth() + installmentNumber * 3);
      break;
    case "HALF_YEARLY":
      date.setMonth(date.getMonth() + installmentNumber * 6);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + installmentNumber);
      break;
    case "CUSTOM":
      if (!customPeriodDays) {
        throw new Error("Custom period days required for CUSTOM frequency");
      }
      date.setDate(date.getDate() + installmentNumber * customPeriodDays);
      break;
  }

  return date;
}

/**
 * Calculate preclosure amount
 *
 * Preclosure = Outstanding Principal + Accrued Interest (up to current date)
 * + Preclosure Penalty (if applicable)
 *
 * @param paidInstallments Number of installments already paid
 * @param penaltyPercent Penalty as percentage of outstanding (optional)
 */
export function calculatePreclosureAmount(
  terms: LoanTerms,
  paidInstallments: number,
  penaltyPercent: number = 0
): {
  outstandingPrincipal: Decimal;
  accruedInterest: Decimal;
  penalty: Decimal;
  totalPreclosure: Decimal;
} {
  const { principal, annualInterestPercent, tenureInstallments, frequency, customPeriodDays } =
    terms;

  // Calculate outstanding principal
  const outstandingPrincipal = outstandingAfterK(
    principal,
    annualInterestPercent,
    tenureInstallments,
    frequency,
    paidInstallments,
    customPeriodDays
  );

  // For preclosure, we typically waive remaining interest
  // Only count accrued interest if partially through current period
  const accruedInterest = new Decimal(0);

  // Calculate penalty if applicable
  const penalty = outstandingPrincipal.mul(penaltyPercent).dividedBy(100).toDecimalPlaces(2);

  const totalPreclosure = outstandingPrincipal.plus(accruedInterest).plus(penalty);

  return {
    outstandingPrincipal: outstandingPrincipal.toDecimalPlaces(2),
    accruedInterest: accruedInterest.toDecimalPlaces(2),
    penalty: penalty.toDecimalPlaces(2),
    totalPreclosure: totalPreclosure.toDecimalPlaces(2),
  };
}

/**
 * Allocate a collection amount to principal and interest
 *
 * Follows the standard practice: Pay interest first, then principal
 *
 * @param collectionAmount Amount collected
 * @param outstandingInterest Current outstanding interest
 * @param outstandingPrincipal Current outstanding principal
 */
export function allocateCollection(
  collectionAmount: string | number | Decimal,
  outstandingInterest: string | number | Decimal,
  outstandingPrincipal: string | number | Decimal
): {
  interestAmount: Decimal;
  principalAmount: Decimal;
  remaining: Decimal;
} {
  const amount = new Decimal(collectionAmount);
  const interest = new Decimal(outstandingInterest);
  const principal = new Decimal(outstandingPrincipal);

  // Pay interest first
  const interestAmount = Decimal.min(amount, interest);
  const afterInterest = amount.minus(interestAmount);

  // Pay principal with remainder
  const principalAmount = Decimal.min(afterInterest, principal);
  const remaining = afterInterest.minus(principalAmount);

  return {
    interestAmount: interestAmount.toDecimalPlaces(2),
    principalAmount: principalAmount.toDecimalPlaces(2),
    remaining: remaining.toDecimalPlaces(2),
  };
}

/**
 * Format a Decimal amount as currency string
 */
export function formatCurrency(amount: Decimal | string | number, currency = "₹"): string {
  const num = new Decimal(amount);
  return `${currency}${num.toFixed(2)}`;
}

/**
 * Validate loan terms
 */
export function validateLoanTerms(terms: LoanTerms): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const principal = new Decimal(terms.principal);
    if (principal.lte(0)) {
      errors.push("Principal must be greater than 0");
    }
  } catch {
    errors.push("Invalid principal amount");
  }

  try {
    const rate = new Decimal(terms.annualInterestPercent);
    if (rate.lt(0)) {
      errors.push("Interest rate cannot be negative");
    }
    if (rate.gt(100)) {
      errors.push("Interest rate cannot exceed 100%");
    }
  } catch {
    errors.push("Invalid interest rate");
  }

  if (terms.tenureInstallments <= 0) {
    errors.push("Tenure must be at least 1 installment");
  }

  if (terms.frequency === "CUSTOM" && !terms.customPeriodDays) {
    errors.push("Custom period days required for CUSTOM frequency");
  }

  if (terms.customPeriodDays && terms.customPeriodDays <= 0) {
    errors.push("Custom period days must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
