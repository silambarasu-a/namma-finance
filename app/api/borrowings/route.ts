/**
 * Borrowings API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const whereClause: Prisma.BorrowingWhereInput = {};

    if (search) {
      whereClause.lenderName = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (status) {
      whereClause.status = status as Prisma.BorrowingWhereInput["status"];
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
      endDate: borrowing.endDate ? borrowing.endDate.toISOString() : null,
      status: borrowing.status,
      outstandingAmount: borrowing.outstanding.toString(),
      totalPaid: borrowing.totalRepaid.toString(),
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
      lenderPhone,
      lenderEmail,
      amount,
      interestRate,
      startDate,
      endDate,
      notes,
    } = body;

    const borrowing = await prisma.borrowing.create({
      data: {
        lenderName,
        lenderPhone: lenderPhone || null,
        lenderEmail: lenderEmail || null,
        amount,
        interestRate,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: "ACTIVE",
        outstanding: amount,
        totalRepaid: 0,
        remarks: notes,
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
