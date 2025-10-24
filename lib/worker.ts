/**
 * Background Worker Process
 *
 * Runs BullMQ workers to process background jobs.
 * Start with: npm run worker:dev
 */

import { loanWorker, notificationWorker, reportWorker } from "./queue";

console.log("🔧 Starting background workers...");
console.log("Loan Worker: Processing loan-related jobs");
console.log("Notification Worker: Processing email/SMS notifications");
console.log("Report Worker: Generating reports");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down workers...");
  await Promise.all([
    loanWorker.close(),
    notificationWorker.close(),
    reportWorker.close(),
  ]);
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down workers...");
  await Promise.all([
    loanWorker.close(),
    notificationWorker.close(),
    reportWorker.close(),
  ]);
  process.exit(0);
});

console.log("✅ Workers started successfully. Press Ctrl+C to stop.");
