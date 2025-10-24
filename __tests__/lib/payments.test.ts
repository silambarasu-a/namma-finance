/**
 * Unit Tests for Payment Calculations
 *
 * Tests the core money calculation logic to ensure accuracy
 * across different scenarios and edge cases.
 */

import Decimal from "decimal.js";
import {
  calculateInstallmentAmount,
  calculateTotalInterest,
  outstandingAfterK,
  generateEMISchedule,
  calculatePreclosureAmount,
  allocateCollection,
  validateLoanTerms,
  getInstallmentsPerYear,
} from "@/lib/payments";

describe("Payment Calculations", () => {
  describe("calculateInstallmentAmount", () => {
    test("calculates monthly EMI correctly", () => {
      const emi = calculateInstallmentAmount(100000, 12, 12, "MONTHLY");
      // For a 100k loan at 12% annual for 12 months
      expect(emi.toNumber()).toBeCloseTo(8884.88, 2);
    });

    test("calculates daily installment correctly", () => {
      const emi = calculateInstallmentAmount(10000, 18, 30, "DAILY");
      expect(emi.toNumber()).toBeGreaterThan(0);
      expect(emi.toNumber()).toBeLessThan(10000);
    });

    test("handles zero interest rate", () => {
      const emi = calculateInstallmentAmount(12000, 0, 12, "MONTHLY");
      expect(emi.toNumber()).toBe(1000); // Principal / tenure
    });

    test("handles single installment", () => {
      const emi = calculateInstallmentAmount(10000, 12, 1, "MONTHLY");
      const expected = 10000 * (1 + 0.12 / 12); // Principal + 1 month interest
      expect(emi.toNumber()).toBeCloseTo(expected, 2);
    });

    test("handles quarterly frequency", () => {
      const emi = calculateInstallmentAmount(50000, 15, 4, "QUARTERLY");
      expect(emi.toNumber()).toBeGreaterThan(0);
      expect(emi.toNumber()).toBeLessThan(50000);
    });

    test("handles custom period days", () => {
      const emi = calculateInstallmentAmount(20000, 10, 10, "CUSTOM", 15);
      expect(emi.toNumber()).toBeGreaterThan(0);
    });

    test("throws error for negative principal", () => {
      expect(() => {
        calculateInstallmentAmount(-1000, 12, 12, "MONTHLY");
      }).toThrow();
    });

    test("throws error for zero tenure", () => {
      expect(() => {
        calculateInstallmentAmount(10000, 12, 0, "MONTHLY");
      }).toThrow();
    });
  });

  describe("calculateTotalInterest", () => {
    test("calculates total interest correctly", () => {
      const principal = new Decimal(100000);
      const totalInterest = calculateTotalInterest(100000, 12, 12, "MONTHLY");

      // Total payment = EMI * tenure
      const emi = calculateInstallmentAmount(100000, 12, 12, "MONTHLY");
      const totalPayment = emi.mul(12);
      const expectedInterest = totalPayment.minus(principal);

      expect(totalInterest.toNumber()).toBeCloseTo(expectedInterest.toNumber(), 2);
    });

    test("returns zero interest for 0% rate", () => {
      const totalInterest = calculateTotalInterest(10000, 0, 12, "MONTHLY");
      expect(totalInterest.toNumber()).toBe(0);
    });
  });

  describe("outstandingAfterK", () => {
    test("calculates outstanding after payments correctly", () => {
      const outstanding = outstandingAfterK(100000, 12, 12, "MONTHLY", 6);
      // After 6 months, roughly half the principal should be paid
      expect(outstanding.toNumber()).toBeGreaterThan(40000);
      expect(outstanding.toNumber()).toBeLessThan(60000);
    });

    test("returns zero after all installments", () => {
      const outstanding = outstandingAfterK(50000, 10, 10, "MONTHLY", 10);
      expect(outstanding.toNumber()).toBeCloseTo(0, 2);
    });

    test("returns full principal for k=0", () => {
      const principal = 75000;
      const outstanding = outstandingAfterK(principal, 15, 12, "MONTHLY", 0);
      expect(outstanding.toNumber()).toBe(principal);
    });

    test("handles daily frequency", () => {
      const outstanding = outstandingAfterK(10000, 18, 30, "DAILY", 15);
      expect(outstanding.toNumber()).toBeGreaterThan(0);
      expect(outstanding.toNumber()).toBeLessThan(10000);
    });

    test("throws error for negative k", () => {
      expect(() => {
        outstandingAfterK(10000, 12, 12, "MONTHLY", -1);
      }).toThrow();
    });
  });

  describe("generateEMISchedule", () => {
    test("generates correct number of schedule items", () => {
      const schedule = generateEMISchedule(
        {
          principal: 100000,
          annualInterestPercent: 12,
          tenureInstallments: 12,
          frequency: "MONTHLY",
        },
        new Date("2024-01-01")
      );

      expect(schedule).toHaveLength(12);
    });

    test("schedule has correct structure", () => {
      const schedule = generateEMISchedule(
        {
          principal: 50000,
          annualInterestPercent: 15,
          tenureInstallments: 6,
          frequency: "MONTHLY",
        },
        new Date("2024-01-01")
      );

      expect(schedule[0]).toHaveProperty("installmentNumber");
      expect(schedule[0]).toHaveProperty("dueDate");
      expect(schedule[0]).toHaveProperty("principalDue");
      expect(schedule[0]).toHaveProperty("interestDue");
      expect(schedule[0]).toHaveProperty("totalDue");
      expect(schedule[0]).toHaveProperty("outstandingBalance");
    });

    test("first installment has interest on full principal", () => {
      const principal = new Decimal(100000);
      const rate = 12;
      const schedule = generateEMISchedule(
        {
          principal: principal.toString(),
          annualInterestPercent: rate,
          tenureInstallments: 12,
          frequency: "MONTHLY",
        },
        new Date("2024-01-01")
      );

      const expectedInterest = principal.mul(rate / 100 / 12);
      expect(schedule[0].interestDue.toNumber()).toBeCloseTo(expectedInterest.toNumber(), 2);
    });

    test("last installment closes the loan", () => {
      const schedule = generateEMISchedule(
        {
          principal: 50000,
          annualInterestPercent: 10,
          tenureInstallments: 12,
          frequency: "MONTHLY",
        },
        new Date("2024-01-01")
      );

      const lastItem = schedule[schedule.length - 1];
      expect(lastItem.outstandingBalance.toNumber()).toBe(0);
    });

    test("total principal equals loan amount", () => {
      const principal = new Decimal(75000);
      const schedule = generateEMISchedule(
        {
          principal: principal.toString(),
          annualInterestPercent: 12,
          tenureInstallments: 10,
          frequency: "MONTHLY",
        },
        new Date("2024-01-01")
      );

      const totalPrincipal = schedule.reduce(
        (sum, item) => sum.plus(item.principalDue),
        new Decimal(0)
      );

      expect(totalPrincipal.toNumber()).toBeCloseTo(principal.toNumber(), 2);
    });
  });

  describe("calculatePreclosureAmount", () => {
    test("calculates preclosure without penalty", () => {
      const result = calculatePreclosureAmount(
        {
          principal: 100000,
          annualInterestPercent: 12,
          tenureInstallments: 12,
          frequency: "MONTHLY",
        },
        6,
        0
      );

      expect(result.outstandingPrincipal.toNumber()).toBeGreaterThan(0);
      expect(result.penalty.toNumber()).toBe(0);
      expect(result.totalPreclosure.eq(result.outstandingPrincipal)).toBe(true);
    });

    test("calculates preclosure with penalty", () => {
      const result = calculatePreclosureAmount(
        {
          principal: 100000,
          annualInterestPercent: 12,
          tenureInstallments: 12,
          frequency: "MONTHLY",
        },
        6,
        2 // 2% penalty
      );

      const expectedPenalty = result.outstandingPrincipal.mul(0.02);
      expect(result.penalty.toNumber()).toBeCloseTo(expectedPenalty.toNumber(), 2);
      expect(result.totalPreclosure.gt(result.outstandingPrincipal)).toBe(true);
    });

    test("preclosure at start equals principal", () => {
      const principal = new Decimal(50000);
      const result = calculatePreclosureAmount(
        {
          principal: principal.toString(),
          annualInterestPercent: 15,
          tenureInstallments: 10,
          frequency: "MONTHLY",
        },
        0,
        0
      );

      expect(result.outstandingPrincipal.toNumber()).toBe(principal.toNumber());
    });
  });

  describe("allocateCollection", () => {
    test("pays interest first, then principal", () => {
      const result = allocateCollection(1000, 300, 5000);

      expect(result.interestAmount.toNumber()).toBe(300);
      expect(result.principalAmount.toNumber()).toBe(700);
      expect(result.remaining.toNumber()).toBe(0);
    });

    test("handles partial interest payment", () => {
      const result = allocateCollection(200, 500, 3000);

      expect(result.interestAmount.toNumber()).toBe(200);
      expect(result.principalAmount.toNumber()).toBe(0);
      expect(result.remaining.toNumber()).toBe(0);
    });

    test("handles excess payment", () => {
      const result = allocateCollection(6000, 300, 5000);

      expect(result.interestAmount.toNumber()).toBe(300);
      expect(result.principalAmount.toNumber()).toBe(5000);
      expect(result.remaining.toNumber()).toBe(700);
    });

    test("handles zero outstanding", () => {
      const result = allocateCollection(1000, 0, 0);

      expect(result.interestAmount.toNumber()).toBe(0);
      expect(result.principalAmount.toNumber()).toBe(0);
      expect(result.remaining.toNumber()).toBe(1000);
    });
  });

  describe("validateLoanTerms", () => {
    test("validates correct terms", () => {
      const result = validateLoanTerms({
        principal: 100000,
        annualInterestPercent: 12,
        tenureInstallments: 12,
        frequency: "MONTHLY",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects negative principal", () => {
      const result = validateLoanTerms({
        principal: -1000,
        annualInterestPercent: 12,
        tenureInstallments: 12,
        frequency: "MONTHLY",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects invalid interest rate", () => {
      const result = validateLoanTerms({
        principal: 10000,
        annualInterestPercent: 150,
        tenureInstallments: 12,
        frequency: "MONTHLY",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Interest rate cannot exceed 100%");
    });

    test("rejects zero tenure", () => {
      const result = validateLoanTerms({
        principal: 10000,
        annualInterestPercent: 12,
        tenureInstallments: 0,
        frequency: "MONTHLY",
      });

      expect(result.valid).toBe(false);
    });

    test("requires customPeriodDays for CUSTOM frequency", () => {
      const result = validateLoanTerms({
        principal: 10000,
        annualInterestPercent: 12,
        tenureInstallments: 10,
        frequency: "CUSTOM",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Custom period days required for CUSTOM frequency");
    });
  });

  describe("getInstallmentsPerYear", () => {
    test("returns correct values for all frequencies", () => {
      expect(getInstallmentsPerYear("DAILY")).toBe(365);
      expect(getInstallmentsPerYear("WEEKLY")).toBe(52);
      expect(getInstallmentsPerYear("MONTHLY")).toBe(12);
      expect(getInstallmentsPerYear("QUARTERLY")).toBe(4);
      expect(getInstallmentsPerYear("HALF_YEARLY")).toBe(2);
      expect(getInstallmentsPerYear("YEARLY")).toBe(1);
    });

    test("calculates custom frequency correctly", () => {
      expect(getInstallmentsPerYear("CUSTOM", 10)).toBe(36);
      expect(getInstallmentsPerYear("CUSTOM", 30)).toBe(12);
    });
  });
});
