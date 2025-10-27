/**
 * Investments API Route
 * Track capital invested in the lending business
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createInvestmentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  source: z.string().min(1, "Source is required"),
  investmentDate: z.string().datetime(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get total investment amount
    const totalInvestment = await prisma.$queryRaw<Array<{ total: number | string }>>`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM (
        SELECT amount FROM investments
      ) AS combined
    `;

    // Get all investments
    const investments = await prisma.$queryRaw<
      Array<{
        id: string;
        amount: any;
        source: string;
        investment_date: Date;
        description: string | null;
        created_at: Date;
      }>
    >`
      SELECT *
      FROM investments
      ORDER BY investment_date DESC
    `;

    const total = parseFloat(totalInvestment[0]?.total?.toString() || "0");

    return NextResponse.json({
      totalInvestment: total.toFixed(2),
      investments: investments.map((inv) => ({
        id: inv.id,
        amount: parseFloat(inv.amount?.toString() || "0").toFixed(2),
        source: inv.source,
        investmentDate: inv.investment_date.toISOString(),
        description: inv.description,
        createdAt: inv.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching investments:", error);

    // If table doesn't exist, return empty data
    return NextResponse.json({
      totalInvestment: "0.00",
      investments: [],
      note: "Investment tracking table not yet created. Please run migrations.",
    });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createInvestmentSchema.parse(body);

    const investment = await prisma.$executeRaw`
      INSERT INTO investments (id, amount, source, investment_date, description, created_by_id, created_at, updated_at)
      VALUES (
        gen_random_uuid()::text,
        ${validatedData.amount},
        ${validatedData.source},
        ${new Date(validatedData.investmentDate)},
        ${validatedData.description || null},
        ${user.id},
        NOW(),
        NOW()
      )
    `;

    return NextResponse.json(
      { message: "Investment recorded successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating investment:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to record investment. Please ensure the investments table exists." },
      { status: 500 }
    );
  }
}
