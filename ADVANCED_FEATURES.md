# Advanced Features - Namma Finance

This document explains the advanced loan features: **Interest-Only Loans**, **Bullet Payments**, **Late Fees**, **Penalties**, and **Top-Up Loans**.

## 📊 Table of Contents

1. [Interest-Only Loans](#interest-only-loans)
2. [Bullet Payment Loans](#bullet-payment-loans)
3. [Late Fees](#late-fees)
4. [Penalties](#penalties)
5. [Top-Up Loans](#top-up-loans)
6. [Collection Priority Order](#collection-priority-order)
7. [API Examples](#api-examples)

---

## 1. Interest-Only Loans

### What is an Interest-Only Loan?

In an interest-only loan, the customer pays **ONLY the interest** each period. The principal amount remains unchanged throughout the loan tenure.

### Use Cases
- **Business loans** where customer needs cash flow relief
- **Short-term financing** where principal will be paid from future income
- **Agricultural loans** where farmer pays interest monthly and principal after harvest

### Example

**Loan Details:**
- Principal: ₹1,00,000
- Interest Rate: 12% per annum
- Frequency: Monthly
- Tenure: 12 months

**Payment Schedule:**
- **Monthly Payment**: ₹1,000 (₹1,00,000 × 12% / 12)
- **Principal Outstanding**: ₹1,00,000 (remains constant)
- **At Maturity**: Customer must pay principal (₹1,00,000) or refinance

**Total Interest Paid**: ₹1,000 × 12 = ₹12,000

### Database Fields

```typescript
repaymentType: "INTEREST_ONLY"
```

### Calculation

```typescript
import { calculateInterestOnlyInstallment } from "@/lib/payments-advanced";

const monthlyInterest = calculateInterestOnlyInstallment(
  100000,    // principal
  12,        // annual interest %
  "MONTHLY"  // frequency
);
// Result: ₹1,000.00
```

---

## 2. Bullet Payment Loans

### What is a Bullet Payment Loan?

Similar to interest-only, but specifically structured so that:
- Customer pays **interest only** during the tenure
- **Full principal** is paid at maturity (in the last installment)

### Use Cases
- **Project financing** where returns come at project completion
- **Real estate development** where repayment comes from property sale
- **Seasonal business** where lump sum available at year-end

### Example

**Loan Details:**
- Principal: ₹2,00,000
- Interest Rate: 15% per annum
- Frequency: Monthly
- Tenure: 12 months

**Payment Schedule:**
- **Months 1-11**: ₹2,500 (interest only)
- **Month 12**: ₹2,02,500 (₹2,500 interest + ₹2,00,000 principal)

**Total Interest Paid**: ₹2,500 × 12 = ₹30,000

### Database Fields

```typescript
repaymentType: "BULLET_PAYMENT"
```

### Calculation

```typescript
import { calculateBulletPaymentSchedule } from "@/lib/payments-advanced";

const schedule = calculateBulletPaymentSchedule({
  principal: 200000,
  annualInterestPercent: 15,
  tenureInstallments: 12,
  frequency: "MONTHLY",
  repaymentType: "BULLET_PAYMENT"
});

console.log(schedule);
// {
//   periodicInterest: "2500.00",
//   finalPayment: "202500.00",
//   totalInterest: "30000.00",
//   totalPayment: "230000.00"
// }
```

---

## 3. Late Fees

### What are Late Fees?

Charges applied when a customer fails to pay an installment by the due date.

### Configuration

Each loan can have:
- **`lateFeeRate`**: Daily late fee as percentage (e.g., 0.1% per day)
- **`gracePeriodDays`**: Days before late fee kicks in (e.g., 3 days grace)

### Example 1: Percentage-Based Late Fee

**Loan Details:**
- Installment Amount: ₹10,000
- Late Fee Rate: 0.5% per day
- Grace Period: 3 days
- Due Date: January 1st
- Payment Date: January 8th

**Calculation:**
- Days Overdue: 7 days
- Days After Grace: 7 - 3 = 4 days
- Late Fee: ₹10,000 × 0.5% × 4 = ₹200

### Example 2: Flat Late Fee

Some institutions charge a flat fee (e.g., ₹100 per day) instead of percentage.

### Database Schema

```typescript
model LateFee {
  id           String   @id
  loanId       String
  amount       Decimal  // Late fee amount
  daysOverdue  Int      // Days payment was late
  dueDate      DateTime // Original due date
  appliedDate  DateTime // When late fee was charged
  isPaid       Boolean  @default(false)
}
```

### Calculation

```typescript
import { calculateLateFee, calculateOverdueDaysWithGrace } from "@/lib/payments-advanced";

const dueDate = new Date("2025-01-01");
const paidDate = new Date("2025-01-08");
const gracePeriod = 3;

// Calculate overdue days (excluding grace period)
const overdueDays = calculateOverdueDaysWithGrace(dueDate, gracePeriod, paidDate);
// Result: 4 days

// Calculate late fee
const lateFee = calculateLateFee(
  overdueDays,
  0.5,     // 0.5% per day
  10000    // installment amount
);
// Result: ₹200.00
```

---

## 4. Penalties

### What are Penalties?

One-time charges for specific events (different from recurring late fees).

### Common Penalty Scenarios

1. **Bounced Check**: ₹500 flat fee
2. **Preclosure Penalty**: 2% of outstanding principal
3. **Default Penalty**: 5% of outstanding amount
4. **Document Non-Compliance**: ₹1,000 flat fee

### Database Schema

```typescript
model Penalty {
  id          String   @id
  loanId      String
  amount      Decimal
  reason      String   // "BOUNCED_CHECK", "PRECLOSURE", "DEFAULT"
  appliedDate DateTime
  isPaid      Boolean  @default(false)
}
```

### Calculation

```typescript
import { calculatePenalty } from "@/lib/payments-advanced";

// Example 1: Bounced check (flat fee)
const bouncedCheckPenalty = calculatePenalty(
  "BOUNCED_CHECK",
  0,          // rate (not used)
  0,          // base amount (not used)
  500         // flat amount
);
// Result: { amount: "500.00", reason: "BOUNCED_CHECK" }

// Example 2: Preclosure penalty (percentage)
const preclosurePenalty = calculatePenalty(
  "PRECLOSURE",
  2,          // 2% penalty
  50000       // outstanding principal
);
// Result: { amount: "1000.00", reason: "PRECLOSURE" }
```

---

## 5. Top-Up Loans

### What is a Top-Up Loan?

When a customer needs **additional funds** on an existing loan, instead of creating a separate loan, you can "top-up" the existing loan.

### How It Works

1. Customer has an active loan with outstanding principal
2. Customer requests additional amount (top-up)
3. System calculates:
   - New principal = Outstanding principal + Top-up amount
   - New EMI based on new principal
   - Charges deducted from top-up amount
4. Old loan is closed (marked as PRECLOSED)
5. New loan created with combined amount

### Example

**Existing Loan:**
- Original Principal: ₹1,00,000
- Outstanding Principal: ₹60,000
- Current EMI: ₹8,885
- Remaining Tenure: 8 months

**Top-Up Request:**
- Top-Up Amount: ₹40,000
- Charges: ₹1,000

**New Loan:**
- New Principal: ₹60,000 + ₹40,000 = ₹1,00,000
- Disbursed Amount: ₹40,000 - ₹1,000 = ₹39,000
- New EMI: ₹12,500 (approximately)
- Increment in EMI: ₹12,500 - ₹8,885 = ₹3,615

### Database Fields

```typescript
model Loan {
  // ... other fields

  // Top-up specific
  isTopUp         Boolean  @default(false)
  topUpAmount     Decimal? // Amount that was topped up
  originalLoanId  String?  // Reference to original loan
  originalLoan    Loan?    @relation("LoanTopUps", ...)
  topUpLoans      Loan[]   @relation("LoanTopUps")
}
```

### API Endpoint

**POST /api/loans/topup**

```bash
curl -X POST http://localhost:3000/api/loans/topup \
  -H "Content-Type: application/json" \
  -d '{
    "loanId": "clx123...",
    "topUpAmount": "40000",
    "charges": [
      { "type": "PROCESSING_FEE", "amount": "1000" }
    ]
  }'
```

**Response:**

```json
{
  "message": "Top-up loan created successfully",
  "oldLoan": {
    "id": "clx123...",
    "loanNumber": "LOAN-001",
    "status": "PRECLOSED"
  },
  "newLoan": {
    "id": "clx456...",
    "loanNumber": "LOAN-002",
    "principal": "100000.00",
    "installmentAmount": "12500.00"
  },
  "topUpDetails": {
    "topUpAmount": "40000.00",
    "previousPrincipal": "100000.00",
    "previousOutstanding": "60000.00",
    "newPrincipal": "100000.00",
    "previousInstallment": "8885.00",
    "newInstallment": "12500.00",
    "incrementInEMI": "3615.00",
    "disbursedAmount": "39000.00"
  }
}
```

---

## 6. Collection Priority Order

When a customer makes a payment, the amount is allocated in this priority:

### Priority Order

1. **Late Fees** (pay first)
2. **Penalties** (pay second)
3. **Interest** (pay third)
4. **Principal** (pay last)

### Example

**Loan Status:**
- Outstanding Principal: ₹50,000
- Outstanding Interest: ₹5,000
- Unpaid Late Fees: ₹200
- Unpaid Penalties: ₹500

**Customer Pays: ₹6,000**

**Allocation:**
1. Late Fees: ₹200 (fully paid)
2. Penalties: ₹500 (fully paid)
3. Interest: ₹5,000 (fully paid)
4. Principal: ₹300 (partial payment)
5. Remaining: ₹0

**New Outstanding:**
- Principal: ₹49,700
- Interest: ₹0
- Late Fees: ₹0
- Penalties: ₹0

### Code

```typescript
import { allocateCollectionWithFees } from "@/lib/payments-advanced";

const allocation = allocateCollectionWithFees(
  6000,   // collection amount
  200,    // unpaid late fees
  500,    // unpaid penalties
  5000,   // outstanding interest
  50000   // outstanding principal
);

console.log(allocation);
// {
//   lateFeeAmount: "200.00",
//   penaltyAmount: "500.00",
//   interestAmount: "5000.00",
//   principalAmount: "300.00",
//   remaining: "0.00"
// }
```

---

## 7. API Examples

### Create Interest-Only Loan

```bash
POST /api/loans
Content-Type: application/json

{
  "customerId": "clx...",
  "principal": "100000",
  "interestRate": "12.0",
  "frequency": "MONTHLY",
  "repaymentType": "INTEREST_ONLY",
  "tenureInstallments": 12,
  "charges": [
    { "type": "PROCESSING_FEE", "amount": "1000" }
  ]
}
```

### Record Collection with Late Fees

If a payment is late, the system automatically:
1. Calculates late fee based on `lateFeeRate` and `gracePeriodDays`
2. Creates `LateFee` record
3. Includes late fee in total outstanding

### Apply Penalty

```bash
POST /api/loans/{loanId}/penalty
Content-Type: application/json

{
  "reason": "BOUNCED_CHECK",
  "amount": "500.00"
}
```

### Create Top-Up Loan

```bash
POST /api/loans/topup
Content-Type: application/json

{
  "loanId": "clx123...",
  "topUpAmount": "50000",
  "newTenure": 12,
  "charges": [
    { "type": "STAMP_DUTY", "amount": "500" },
    { "type": "PROCESSING_FEE", "amount": "1000" }
  ],
  "remarks": "Additional funds for business expansion"
}
```

---

## 🎯 Key Takeaways

1. **Interest-Only Loans**: Customer pays only interest, principal stays constant
2. **Bullet Payments**: Interest-only + principal at maturity
3. **Late Fees**: Automatic based on overdue days and grace period
4. **Penalties**: One-time charges for specific events
5. **Top-Ups**: Add money to existing loan without creating separate loan
6. **Collection Priority**: Late Fees → Penalties → Interest → Principal

## 📚 Related Files

- **Schema**: [prisma/schema.prisma](prisma/schema.prisma)
- **Calculations**: [lib/payments-advanced.ts](lib/payments-advanced.ts)
- **Top-Up API**: [app/api/loans/topup/route.ts](app/api/loans/topup/route.ts)
- **Tests**: [__tests__/lib/payments-advanced.test.ts](__tests__/lib/payments-advanced.test.ts) *(to be created)*

---

**Need Help?** See [README.md](README.md) for main documentation.
