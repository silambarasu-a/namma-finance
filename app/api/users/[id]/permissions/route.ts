/**
 * User Permissions API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const updatePermissionsSchema = z.object({
  canDeleteCollections: z.boolean(),
  canDeleteCustomers: z.boolean(),
  canDeleteUsers: z.boolean(),
});

/**
 * PATCH /api/users/[id]/permissions - Update manager permissions (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can modify permissions
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can modify user permissions" },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers should have these permissions modified
    if (targetUser.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Permissions can only be set for managers" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updatePermissionsSchema.parse(body);

    // Store old permissions for audit log
    const oldPermissions = {
      canDeleteCollections: targetUser.canDeleteCollections,
      canDeleteCustomers: targetUser.canDeleteCustomers,
      canDeleteUsers: targetUser.canDeleteUsers,
    };

    // Update user permissions
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        canDeleteCollections: validatedData.canDeleteCollections,
        canDeleteCustomers: validatedData.canDeleteCustomers,
        canDeleteUsers: validatedData.canDeleteUsers,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        canDeleteCollections: true,
        canDeleteCustomers: true,
        canDeleteUsers: true,
      },
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: userId,
      beforeData: oldPermissions,
      afterData: validatedData,
      ...clientInfo,
      remarks: `Permissions updated for manager ${targetUser.name} by admin ${user.name}`,
    });

    return NextResponse.json({
      message: "Permissions updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating permissions:", error);
    return NextResponse.json(
      {
        error: "Failed to update permissions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
