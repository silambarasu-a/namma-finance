/**
 * Borrowings API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const whereClause: any = {};

    if (search) {
      whereClause.lenderName = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const borrowings = await prisma.borrowing.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal fields to strings for JSON serialization
    const serializedBorrowings = borrowings.map((borrowing) => ({
      id: borrowing.id,
      lenderName: borrowing.lenderName,
      amount: borrowing.amount.toString(),
      interestRate: borrowing.interestRate.toString(),
      startDate: borrowing.startDate.toISOString(),
      endDate: borrowing.endDate.toISOString(),
      status: borrowing.status,
      outstandingAmount: borrowing.outstandingAmount.toString(),
      totalPaid: borrowing.totalPaid.toString(),
      createdAt: borrowing.createdAt.toISOString(),
    }));

    return NextResponse.json({ borrowings: serializedBorrowings });
  } catch (error) {
    console.error("Error fetching borrowings:", error);
    return NextResponse.json(
      { error: "Failed to fetch borrowings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      lenderName,
      amount,
      interestRate,
      startDate,
      endDate,
      repaymentSchedule,
      notes,
    } = body;

    const borrowing = await prisma.borrowing.create({
      data: {
        lenderName,
        amount,
        interestRate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        repaymentSchedule,
        notes,
        status: "ACTIVE",
        outstandingAmount: amount,
        totalPaid: 0,
      },
    });

    return NextResponse.json({ borrowing }, { status: 201 });
  } catch (error) {
    console.error("Error creating borrowing:", error);
    return NextResponse.json(
      { error: "Failed to create borrowing" },
      { status: 500 }
    );
  }
}
