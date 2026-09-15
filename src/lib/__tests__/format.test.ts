import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/format";

describe("admin date formatting", () => {
  it("preserves the missing-date label", () => {
    expect(formatDateTime()).toBe("Not provided");
    expect(formatDateTime("")).toBe("Not provided");
  });

  it.each(["UTC", "America/Los_Angeles", "Asia/Tokyo"])(
    "uses Belgrade winter and summer offsets when the host timezone is %s",
    (timeZone) => {
      const script = `
        require("tsx/cjs");
        const { formatDateTime } = require(${JSON.stringify(resolve("src/lib/format.ts"))});
        process.stdout.write(JSON.stringify({
          hostTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dates: [
            formatDateTime("2026-01-15T12:00:00.000Z"),
            formatDateTime("2026-07-15T12:00:00.000Z"),
            formatDateTime("2026-07-15T23:30:00.000Z"),
          ],
        }));
      `;
      const output = execFileSync(process.execPath, ["-e", script], {
        env: { ...process.env, TZ: timeZone },
        encoding: "utf8",
      });

      expect(JSON.parse(output)).toEqual({
        hostTimeZone: timeZone,
        dates: [
          "Jan 15, 2026, 1:00 PM",
          "Jul 15, 2026, 2:00 PM",
          "Jul 16, 2026, 1:30 AM",
        ],
      });
    },
  );
});
