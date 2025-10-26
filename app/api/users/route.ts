/**
 * Users API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone number is required"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "CUSTOMER", // Exclude customers from users list
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        canDeleteCollections: true,
        canDeleteCustomers: true,
        canDeleteUsers: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  // Only ADMIN and MANAGER can create users
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Generate a unique email if not provided
    const emailToUse = validatedData.email && validatedData.email.trim() !== ""
      ? validatedData.email.toLowerCase()
      : `${validatedData.role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(7)}@noreply.local`;

    // Check if user already exists (only if it's a real email)
    if (validatedData.email && validatedData.email.trim() !== "") {
      const existingUser = await prisma.user.findUnique({
        where: { email: emailToUse },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: emailToUse,
        password: hashedPassword,
        phone: validatedData.phone,
        role: validatedData.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
