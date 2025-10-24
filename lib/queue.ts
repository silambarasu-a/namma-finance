/**
 * Background Job Queue using BullMQ
 *
 * Handles asynchronous tasks like:
 * - Generating EMI schedules
 * - Sending notifications
 * - Running daily interest accruals
 * - Generating monthly statements
 */

import { Queue, Worker, Job } from "bullmq";
import { redis } from "./cache";
import { prisma } from "./prisma";
import { generateEMISchedule, LoanTerms } from "./payments";

// Job types
export enum JobType {
  GENERATE_EMI_SCHEDULE = "generate-emi-schedule",
  SEND_EMAIL = "send-email",
  DAILY_INTEREST_ACCRUAL = "daily-interest-accrual",
  GENERATE_MONTHLY_STATEMENT = "generate-monthly-statement",
}

// Queue configuration
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
};

// Create queues
export const loanQueue = new Queue("loan-processing", queueConfig);
export const notificationQueue = new Queue("notifications", queueConfig);
export const reportQueue = new Queue("reports", queueConfig);

// ============================================================================
// JOB HANDLERS
// ============================================================================

/**
 * Generate and save EMI schedule for a loan
 */
async function handleGenerateEMISchedule(job: Job) {
  const { loanId } = job.data;

  console.log(`Generating EMI schedule for loan ${loanId}`);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
  });

  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const terms: LoanTerms = {
    principal: loan.principal,
    annualInterestPercent: loan.interestRate,
    tenureInstallments: loan.tenureInInstallments,
    frequency: loan.frequency,
    customPeriodDays: loan.customPeriodDays || undefined,
  };

  const schedule = generateEMISchedule(terms, loan.startDate);

  // Save schedule to database in batches
  const batchSize = 100;
  for (let i = 0; i < schedule.length; i += batchSize) {
    const batch = schedule.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((item) =>
        prisma.eMISchedule.create({
          data: {
            loanId,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            principalDue: item.principalDue.toString(),
            interestDue: item.interestDue.toString(),
            totalDue: item.totalDue.toString(),
          },
        })
      )
    );
  }

  console.log(`EMI schedule generated successfully for loan ${loanId}`);
}

/**
 * Send email notification
 */
async function handleSendEmail(job: Job) {
  const { to, subject, body, template } = job.data;

  console.log(`Sending email to ${to}: ${subject}`);

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log
  console.log("Email details:", { to, subject, template });

  // Simulate email sending
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`Email sent successfully to ${to}`);
}

/**
 * Run daily interest accrual
 */
async function handleDailyInterestAccrual(job: Job) {
  console.log("Running daily interest accrual");

  // Get all active loans
  const activeLoans = await prisma.loan.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      outstandingPrincipal: true,
      interestRate: true,
      frequency: true,
    },
  });

  console.log(`Processing ${activeLoans.length} active loans`);

  // Calculate and update accrued interest
  // This is a simplified version - actual implementation would be more complex
  for (const loan of activeLoans) {
    // Calculate daily interest
    // (This is just a placeholder - actual logic would depend on business rules)
    console.log(`Accruing interest for loan ${loan.id}`);
  }

  console.log("Daily interest accrual completed");
}

/**
 * Generate monthly statement
 */
async function handleGenerateMonthlyStatement(job: Job) {
  const { customerId, month, year } = job.data;

  console.log(`Generating monthly statement for customer ${customerId} - ${month}/${year}`);

  // Fetch customer loans and collections for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const collections = await prisma.collection.findMany({
    where: {
      loan: {
        customerId,
      },
      collectionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      loan: true,
    },
  });

  console.log(`Found ${collections.length} collections for statement`);

  // TODO: Generate PDF statement
  // For now, just return summary
  const summary = {
    customerId,
    month,
    year,
    totalCollections: collections.reduce((sum, c) => sum + Number(c.amount), 0),
    collectionCount: collections.length,
  };

  console.log("Statement summary:", summary);

  return summary;
}

// ============================================================================
// WORKERS
// ============================================================================

/**
 * Loan processing worker
 */
export const loanWorker = new Worker(
  "loan-processing",
  async (job: Job) => {
    switch (job.name) {
      case JobType.GENERATE_EMI_SCHEDULE:
        return handleGenerateEMISchedule(job);
      case JobType.DAILY_INTEREST_ACCRUAL:
        return handleDailyInterestAccrual(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 jobs concurrently
  }
);

/**
 * Notification worker
 */
export const notificationWorker = new Worker(
  "notifications",
  async (job: Job) => {
    switch (job.name) {
      case JobType.SEND_EMAIL:
        return handleSendEmail(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 10, // Process 10 emails concurrently
  }
);

/**
 * Report worker
 */
export const reportWorker = new Worker(
  "reports",
  async (job: Job) => {
    switch (job.name) {
      case JobType.GENERATE_MONTHLY_STATEMENT:
        return handleGenerateMonthlyStatement(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 3, // Process 3 reports concurrently
  }
);

// Event handlers
loanWorker.on("completed", (job) => {
  console.log(`Loan job ${job.id} completed`);
});

loanWorker.on("failed", (job, err) => {
  console.error(`Loan job ${job?.id} failed:`, err);
});

notificationWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});

reportWorker.on("completed", (job) => {
  console.log(`Report job ${job.id} completed`);
});

reportWorker.on("failed", (job, err) => {
  console.error(`Report job ${job?.id} failed:`, err);
});

// ============================================================================
// JOB CREATORS
// ============================================================================

/**
 * Queue EMI schedule generation
 */
export async function queueGenerateEMISchedule(loanId: string) {
  await loanQueue.add(JobType.GENERATE_EMI_SCHEDULE, { loanId });
}

/**
 * Queue email sending
 */
export async function queueSendEmail(data: {
  to: string;
  subject: string;
  body?: string;
  template?: string;
  variables?: Record<string, unknown>;
}) {
  await notificationQueue.add(JobType.SEND_EMAIL, data);
}

/**
 * Queue daily interest accrual
 */
export async function queueDailyInterestAccrual() {
  await loanQueue.add(JobType.DAILY_INTEREST_ACCRUAL, {}, { repeat: { pattern: "0 0 * * *" } }); // Run daily at midnight
}

/**
 * Queue monthly statement generation
 */
export async function queueMonthlyStatement(customerId: string, month: number, year: number) {
  await reportQueue.add(JobType.GENERATE_MONTHLY_STATEMENT, { customerId, month, year });
}
