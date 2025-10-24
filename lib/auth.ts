/**
 * Authentication & Authorization Library
 *
 * Provides JWT-based authentication with refresh tokens, role-based access control,
 * and session management for the financing application.
 *
 * Features:
 * - Secure password hashing with bcrypt
 * - JWT access tokens (short-lived)
 * - JWT refresh tokens (long-lived, rotated)
 * - Role-based authorization helpers
 * - Agent-customer assignment validation
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-in-production"
);

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Verify JWT access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error("Access token verification failed:", error);
    return null;
  }
}

/**
 * Verify JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error("Refresh token verification failed:", error);
    return null;
  }
}

/**
 * Set authentication cookies (access + refresh tokens)
 */
export async function setAuthCookies(userId: string, email: string, role: Role): Promise<void> {
  const payload: JWTPayload = { userId, email, role };

  const accessToken = await generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);

  const cookieStore = await cookies();

  // Set access token cookie (httpOnly, secure in production)
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes in seconds
    path: "/",
  });

  // Set refresh token cookie
  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

/**
 * Get session user from cookies (Server Components)
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  // Fetch full user details from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

/**
 * Get session user from request (API Routes & Middleware)
 */
export async function getSessionUserFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  // Fetch full user details from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return false;
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return false;
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
  });

  if (!user) {
    return false;
  }

  // Generate new access token
  const newAccessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Set new access token cookie
  cookieStore.set("access_token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes
    path: "/",
  });

  return true;
}

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

/**
 * Check if user has required role
 */
export function hasRole(user: SessionUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin or manager
 */
export function isAdminOrManager(user: SessionUser | null): boolean {
  return hasRole(user, "ADMIN", "MANAGER");
}

/**
 * Check if user is admin
 */
export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, "ADMIN");
}

/**
 * Check if user is agent
 */
export function isAgent(user: SessionUser | null): boolean {
  return hasRole(user, "AGENT");
}

/**
 * Check if user is customer
 */
export function isCustomer(user: SessionUser | null): boolean {
  return hasRole(user, "CUSTOMER");
}

/**
 * Verify agent has access to customer
 *
 * Agents can only access customers assigned to them.
 * Admins and managers have access to all customers.
 */
export async function canAccessCustomer(
  userId: string,
  customerId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  // Admins and managers have full access
  if (user.role === "ADMIN" || user.role === "MANAGER") {
    return true;
  }

  // Agents can only access assigned customers
  if (user.role === "AGENT") {
    const assignment = await prisma.agentAssignment.findFirst({
      where: {
        agentId: userId,
        customerId,
        isActive: true,
      },
    });
    return !!assignment;
  }

  // Customers can only access their own data
  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { userId: true },
    });
    return customer?.userId === userId;
  }

  return false;
}

/**
 * Verify agent has access to loan
 *
 * Checks if agent is assigned to the customer who owns the loan
 */
export async function canAccessLoan(userId: string, loanId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  // Admins and managers have full access
  if (user.role === "ADMIN" || user.role === "MANAGER") {
    return true;
  }

  // Get loan with customer
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { customerId: true },
  });

  if (!loan) return false;

  // Check customer access
  return canAccessCustomer(userId, loan.customerId);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require specific role - throws if user doesn't have role
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasRole(user, ...roles)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
  return user;
}
