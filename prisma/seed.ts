/**
 * Database Seed Script
 *
 * Creates sample users, customers, loans, and collections for development and testing.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  console.log("Clearing existing data...");
  await prisma.collection.deleteMany();
  await prisma.eMISchedule.deleteMany();
  await prisma.loanCharge.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.agentAssignment.deleteMany();
  await prisma.borrowingRepayment.deleteMany();
  await prisma.borrowing.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log("Creating users...");
  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password,
      role: "ADMIN",
      phone: "+91 9876543210",
      address: "123 Admin Street, Chennai",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Manager User",
      email: "manager@example.com",
      password,
      role: "MANAGER",
      phone: "+91 9876543211",
      address: "456 Manager Avenue, Bangalore",
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: "Agent Rajesh",
      email: "agent1@example.com",
      password,
      role: "AGENT",
      phone: "+91 9876543212",
      address: "789 Agent Road, Mumbai",
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: "Agent Priya",
      email: "agent2@example.com",
      password,
      role: "AGENT",
      phone: "+91 9876543213",
      address: "321 Agent Lane, Delhi",
    },
  });

  // Create customers
  console.log("Creating customers...");
  const customers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ramesh Kumar",
        email: "ramesh@example.com",
        password,
        role: "CUSTOMER",
        phone: "+91 9876543214",
        address: "111 Customer Street, Chennai",
        customer: {
          create: {
            dob: new Date("1985-05-15"),
            idProof: "AADHAR-1234-5678-9012",
            kycStatus: "VERIFIED",
          },
        },
      },
      include: { customer: true },
    }),
    prisma.user.create({
      data: {
        name: "Lakshmi Devi",
        email: "lakshmi@example.com",
        password,
        role: "CUSTOMER",
        phone: "+91 9876543215",
        address: "222 Customer Avenue, Bangalore",
        customer: {
          create: {
            dob: new Date("1990-08-20"),
            idProof: "AADHAR-2345-6789-0123",
            kycStatus: "VERIFIED",
          },
        },
      },
      include: { customer: true },
    }),
    prisma.user.create({
      data: {
        name: "Suresh Patel",
        email: "suresh@example.com",
        password,
        role: "CUSTOMER",
        phone: "+91 9876543216",
        address: "333 Customer Road, Mumbai",
        customer: {
          create: {
            dob: new Date("1988-03-10"),
            idProof: "AADHAR-3456-7890-1234",
            kycStatus: "VERIFIED",
          },
        },
      },
      include: { customer: true },
    }),
  ]);

  // Assign agents to customers
  console.log("Assigning agents to customers...");
  await prisma.agentAssignment.createMany({
    data: [
      { agentId: agent1.id, customerId: customers[0].customer!.id },
      { agentId: agent1.id, customerId: customers[1].customer!.id },
      { agentId: agent2.id, customerId: customers[2].customer!.id },
    ],
  });

  // Create loans
  console.log("Creating loans...");
  const loan1 = await prisma.loan.create({
    data: {
      customerId: customers[0].customer!.id,
      createdById: manager.id,
      principal: "100000.00",
      interestRate: "12.000",
      frequency: "MONTHLY",
      tenureInInstallments: 12,
      installmentAmount: "8884.88",
      totalInterest: "6618.56",
      totalAmount: "106618.56",
      disbursedAmount: "98000.00",
      status: "ACTIVE",
      startDate: new Date("2024-01-01"),
      outstandingPrincipal: "100000.00",
      outstandingInterest: "6618.56",
      charges: {
        createMany: {
          data: [
            { type: "STAMP_DUTY", amount: "1000.00" },
            { type: "PROCESSING_FEE", amount: "1000.00" },
          ],
        },
      },
    },
  });

  const loan2 = await prisma.loan.create({
    data: {
      customerId: customers[1].customer!.id,
      createdById: manager.id,
      principal: "50000.00",
      interestRate: "15.000",
      frequency: "WEEKLY",
      tenureInInstallments: 52,
      installmentAmount: "1115.38",
      totalInterest: "8000.00",
      totalAmount: "58000.00",
      disbursedAmount: "49500.00",
      status: "ACTIVE",
      startDate: new Date("2024-02-01"),
      outstandingPrincipal: "50000.00",
      outstandingInterest: "8000.00",
      charges: {
        create: {
          type: "PROCESSING_FEE",
          amount: "500.00",
        },
      },
    },
  });

  const loan3 = await prisma.loan.create({
    data: {
      customerId: customers[2].customer!.id,
      createdById: admin.id,
      principal: "200000.00",
      interestRate: "10.000",
      frequency: "MONTHLY",
      tenureInInstallments: 24,
      installmentAmount: "9201.09",
      totalInterest: "20826.16",
      totalAmount: "220826.16",
      disbursedAmount: "197000.00",
      status: "ACTIVE",
      startDate: new Date("2024-03-01"),
      outstandingPrincipal: "200000.00",
      outstandingInterest: "20826.16",
      charges: {
        createMany: {
          data: [
            { type: "STAMP_DUTY", amount: "2000.00" },
            { type: "DOCUMENT_FEE", amount: "500.00" },
            { type: "PROCESSING_FEE", amount: "500.00" },
          ],
        },
      },
    },
  });

  // Create some collections
  console.log("Creating collections...");
  await prisma.collection.createMany({
    data: [
      {
        loanId: loan1.id,
        agentId: agent1.id,
        amount: "8884.88",
        principalAmount: "7884.88",
        interestAmount: "1000.00",
        collectionDate: new Date("2024-02-01"),
        receiptNumber: "RCP-001",
        paymentMethod: "CASH",
      },
      {
        loanId: loan1.id,
        agentId: agent1.id,
        amount: "8884.88",
        principalAmount: "7964.37",
        interestAmount: "920.51",
        collectionDate: new Date("2024-03-01"),
        receiptNumber: "RCP-002",
        paymentMethod: "UPI",
      },
      {
        loanId: loan2.id,
        agentId: agent1.id,
        amount: "1115.38",
        principalAmount: "971.15",
        interestAmount: "144.23",
        collectionDate: new Date("2024-02-08"),
        receiptNumber: "RCP-003",
        paymentMethod: "BANK_TRANSFER",
      },
    ],
  });

  // Update loan outstanding amounts after collections
  await prisma.loan.update({
    where: { id: loan1.id },
    data: {
      outstandingPrincipal: new Decimal("100000")
        .minus(new Decimal("7884.88"))
        .minus(new Decimal("7964.37"))
        .toString(),
      outstandingInterest: new Decimal("6618.56")
        .minus(new Decimal("1000.00"))
        .minus(new Decimal("920.51"))
        .toString(),
      totalCollected: "17769.76",
    },
  });

  await prisma.loan.update({
    where: { id: loan2.id },
    data: {
      outstandingPrincipal: new Decimal("50000").minus(new Decimal("971.15")).toString(),
      outstandingInterest: new Decimal("8000").minus(new Decimal("144.23")).toString(),
      totalCollected: "1115.38",
    },
  });

  // Create borrowings
  console.log("Creating borrowings (capital from lenders)...");
  await prisma.borrowing.create({
    data: {
      lenderName: "Capital Finance Ltd",
      lenderPhone: "+91 9800000001",
      lenderEmail: "contact@capitalfinance.com",
      amount: "500000.00",
      interestRate: "8.000",
      startDate: new Date("2024-01-01"),
      status: "ACTIVE",
      outstanding: "500000.00",
      repayments: {
        create: {
          amount: "50000.00",
          principalPaid: "46000.00",
          interestPaid: "4000.00",
          date: new Date("2024-02-01"),
        },
      },
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("\nTest Credentials:");
  console.log("==================");
  console.log("Admin:    admin@example.com / password123");
  console.log("Manager:  manager@example.com / password123");
  console.log("Agent 1:  agent1@example.com / password123");
  console.log("Agent 2:  agent2@example.com / password123");
  console.log("Customer: ramesh@example.com / password123");
  console.log("==================\n");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
