import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AssessmentLoading from "@/app/assessment/loading";

describe("assessment route loading", () => {
  it("renders an accessible loading message on the server", () => {
    const html = renderToStaticMarkup(<AssessmentLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Preparing your assessment…");
    expect(html).not.toContain("<form");
  });
});
