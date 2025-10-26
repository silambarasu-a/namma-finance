/**
 * User Detail API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * DELETE /api/users/[id] - Delete a user (Admin or Manager with permission)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - Only ADMIN or MANAGER with canDeleteUsers
    if (user.role === "ADMIN") {
      // Admin can always delete
    } else if (user.role === "MANAGER") {
      // Manager needs explicit permission
      if (!user.canDeleteUsers) {
        return NextResponse.json(
          { error: "You don't have permission to delete users. Contact an admin." },
          { status: 403 }
        );
      }
    } else {
      // AGENT and CUSTOMER cannot delete
      return NextResponse.json(
        { error: "Only admins and authorized managers can delete users" },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Fetch user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: {
          include: {
            loans: { select: { id: true, status: true } },
          },
        },
      },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deletion of ADMIN by MANAGER
    if (user.role === "MANAGER" && userToDelete.role === "ADMIN") {
      return NextResponse.json(
        { error: "Managers cannot delete admin users" },
        { status: 403 }
      );
    }

    // If user is a customer, check for active loans
    if (userToDelete.customer) {
      const hasActiveLoans = userToDelete.customer.loans.some(
        (loan) => loan.status === "ACTIVE" || loan.status === "PENDING"
      );

      if (hasActiveLoans) {
        return NextResponse.json(
          {
            error: "Cannot delete customer user with active or pending loans",
            activeLoans: userToDelete.customer.loans.filter(
              (l) => l.status === "ACTIVE" || l.status === "PENDING"
            ).length,
          },
          { status: 400 }
        );
      }
    }

    // Check if user has created loans (as agent/admin/manager)
    const createdLoansCount = await prisma.loan.count({
      where: { createdById: userId },
    });

    if (createdLoansCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete user who has created loans",
          loansCreated: createdLoansCount,
        },
        { status: 400 }
      );
    }

    // Check if agent has collections
    const collectionsCount = await prisma.collection.count({
      where: { agentId: userId },
    });

    if (collectionsCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete agent who has recorded collections",
          collectionsRecorded: collectionsCount,
        },
        { status: 400 }
      );
    }

    // Store data for audit log before deletion
    const userData = {
      id: userToDelete.id,
      name: userToDelete.name,
      email: userToDelete.email,
      phone: userToDelete.phone,
      role: userToDelete.role,
    };

    // Delete user (cascades will handle related records based on schema)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: userId,
      beforeData: userData,
      afterData: null,
      ...clientInfo,
      remarks: `User ${userToDelete.name} (${userToDelete.role}) deleted by ${user.role}`,
    });

    return NextResponse.json({
      message: "User deleted successfully",
      deletedUser: {
        name: userToDelete.name,
        email: userToDelete.email,
        role: userToDelete.role,
      },
    });
  } catch (error) {
    console.error("User deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
