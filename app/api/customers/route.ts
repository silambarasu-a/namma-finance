import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  kycStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  idProof: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !["ADMIN", "MANAGER", "AGENT"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const kycStatus = searchParams.get("kycStatus");
    const agentId = searchParams.get("agentId");

    const where: any = {};

    // Role-based filtering
    if (user.role === "AGENT") {
      where.agentAssignments = {
        some: {
          agentId: user.id,
          isActive: true,
        },
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    // KYC status filter
    if (kycStatus) {
      where.kycStatus = kycStatus;
    }

    // Agent filter
    if (agentId && user.role !== "AGENT") {
      where.agentAssignments = {
        some: {
          agentId,
          isActive: true,
        },
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            isActive: true,
            createdAt: true,
          },
        },
        agentAssignments: {
          where: { isActive: true },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            loans: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    // Generate a unique email if not provided
    const emailToUse = data.email && data.email.trim() !== ""
      ? data.email.toLowerCase()
      : `customer-${Date.now()}-${Math.random().toString(36).substring(7)}@noreply.local`;

    // Check if email already exists (only if it's a real email)
    if (data.email && data.email.trim() !== "") {
      const existingUser = await prisma.user.findUnique({
        where: { email: emailToUse },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user and customer in a transaction
    const customer = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: emailToUse,
          password: hashedPassword,
          phone: data.phone,
          address: data.address,
          role: "CUSTOMER",
          isActive: true,
        },
      });

      const newCustomer = await tx.customer.create({
        data: {
          userId: newUser.id,
          kycStatus: data.kycStatus || "PENDING",
          idProof: data.idProof,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      return newCustomer;
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
