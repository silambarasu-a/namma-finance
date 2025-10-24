/**
 * Audit Logging Utilities
 *
 * Track all money-related operations and critical actions for compliance and debugging.
 */

import { AuditAction } from "@prisma/client";
import { prisma } from "./prisma";

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  remarks?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        beforeData: data.beforeData as never,
        afterData: data.afterData as never,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        remarks: data.remarks,
      },
    });
  } catch (error) {
    // Don't throw - audit log failures shouldn't break operations
    console.error("Audit log creation failed:", error);
  }
}

/**
 * Helper to get client info from request
 */
export function getClientInfo(request?: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  if (!request) return {};

  return {
    ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}
