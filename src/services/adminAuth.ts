import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getAdminSessionDays } from "@/lib/env";
import { createOpaqueToken, hashSecret } from "@/lib/security";
import {
  findActiveAdminSessionByTokenHash,
  findAdminByEmail,
  insertAdminSession,
  invalidateAdminSession,
  toAdminSessionUser,
  upsertAdmin,
} from "@/repositories/admins";
import { failure, success } from "@/lib/result";
import type { Result } from "@/types/result";
import type {
  AdminRole,
  AdminSession,
  AdminSessionDocument,
  AdminSessionUser,
} from "@/types/admin";

const passwordSaltRounds = 12;
const genericLoginError = "Invalid email or password.";
const dummyPasswordHash =
  "$2b$12$dFx41ob9YAk26X4tK52DpuSz07PcqmFAqBb9Jt.tdcBLvh1j1An2m";

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, passwordSaltRounds);
}

export async function verifyAdminPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function isAdminSessionExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export async function createDevelopmentAdmin({
  email,
  password,
  role = "admin",
  active = true,
}: {
  email: string;
  password: string;
  role?: AdminRole;
  active?: boolean;
}): Promise<AdminSessionUser> {
  const now = new Date();
  const passwordHash = await hashAdminPassword(password);
  const admin = await upsertAdmin({
    email: normalizeAdminEmail(email),
    passwordHash,
    role,
    active,
    createdAt: now,
    updatedAt: now,
  });

  if (!admin) {
    throw new Error("Development admin could not be saved.");
  }

  return toAdminSessionUser(admin);
}

export async function loginAdmin(email: string, password: string): Promise<Result<{
  admin: AdminSessionUser;
  sessionToken: string;
  expiresAt: Date;
}>> {
  const normalizedEmail = normalizeAdminEmail(email);
  const admin = await findAdminByEmail(normalizedEmail);
  // Always compare before rejecting missing/inactive accounts to retain timing protection.
  const passwordHash = admin?.passwordHash ?? dummyPasswordHash;
  const passwordMatches = await verifyAdminPassword(password, passwordHash);

  if (!admin || !admin.active || !passwordMatches) {
    return failure("INVALID_CREDENTIALS", genericLoginError);
  }

  const sessionToken = createOpaqueToken();
  const expiresAt = new Date(
    Date.now() + getAdminSessionDays() * 24 * 60 * 60 * 1000,
  );
  const session: AdminSessionDocument = {
    _id: new ObjectId(),
    adminId: admin._id,
    sessionTokenHash: hashSecret(sessionToken),
    createdAt: new Date(),
    expiresAt,
  };

  await insertAdminSession(session);

  return success({
    admin: toAdminSessionUser(admin),
    sessionToken,
    expiresAt,
  });
}

export async function validateAdminSessionToken(
  sessionToken: string | undefined | null,
): Promise<Result<AdminSession>> {
  if (!sessionToken) {
    return failure("AUTH_REQUIRED", "Administrator authentication is required.");
  }

  const result = await findActiveAdminSessionByTokenHash(hashSecret(sessionToken));

  if (!result || isAdminSessionExpired(result.session.expiresAt)) {
    return failure("AUTH_REQUIRED", "Administrator authentication is required.");
  }

  return success({
    admin: toAdminSessionUser(result.admin),
    expiresAt: result.session.expiresAt.toISOString(),
  });
}

export async function logoutAdmin(sessionToken: string | undefined | null): Promise<void> {
  if (!sessionToken) {
    return;
  }

  await invalidateAdminSession(hashSecret(sessionToken));
}
