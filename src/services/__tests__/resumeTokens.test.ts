import { describe, expect, it } from "vitest";
import {
  createResumeToken,
  hashResumeToken,
  isResumeTokenMatch,
} from "@/services/assessments";

describe("resume tokens", () => {
  it("verifies a raw resume token against its stored hash", () => {
    const token = createResumeToken();
    const hash = hashResumeToken(token);

    expect(isResumeTokenMatch(token, hash)).toBe(true);
    expect(isResumeTokenMatch(`${token}x`, hash)).toBe(false);
  });
});
