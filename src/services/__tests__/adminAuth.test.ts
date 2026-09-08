import { describe, expect, it } from "vitest";
import {
  hashAdminPassword,
  isAdminSessionExpired,
  verifyAdminPassword,
} from "@/services/adminAuth";

describe("admin authentication helpers", () => {
  it("verifies bcrypt password hashes", async () => {
    const passwordHash = await hashAdminPassword("correct-password");

    await expect(
      verifyAdminPassword("correct-password", passwordHash),
    ).resolves.toBe(true);
    await expect(
      verifyAdminPassword("wrong-password", passwordHash),
    ).resolves.toBe(false);
  });

  it("detects expired admin sessions", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");

    expect(isAdminSessionExpired(new Date("2026-09-08T11:59:59.000Z"), now)).toBe(
      true,
    );
    expect(isAdminSessionExpired(new Date("2026-09-08T12:01:00.000Z"), now)).toBe(
      false,
    );
  });
});
