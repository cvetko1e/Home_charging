import { Children, isValidElement, type ButtonHTMLAttributes, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getPreviousStep, isStepAvailable } from "@/lib/assessment-navigation";
import type { AssessmentStepNumber } from "@/types/assessment";
import { ProgressIndicator } from "../ProgressIndicator";
import { StepActions } from "../StepActions";
import { ReviewStep } from "../steps/ReviewStep";

function elements(node: ReactNode): ReactElement<{ children?: ReactNode; onEdit?: () => void }>[] {
  if (!isValidElement<{ children?: ReactNode; onEdit?: () => void }>(node)) return [];
  return [node, ...Children.toArray(node.props.children).flatMap(elements)];
}

function buttons(node: ReactNode) {
  return elements(node).filter((element) => element.type === "button") as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>[];
}

const clickEvent = {} as MouseEvent<HTMLButtonElement>;
const stepNumbers: AssessmentStepNumber[] = [1, 2, 3, 4, 5, 6, 7];

describe("assessment step navigation", () => {
  it("moves back through all survey steps and review without going before step one", () => {
    expect(stepNumbers.map(getPreviousStep)).toEqual([1, 1, 2, 3, 4, 5, 6]);
  });

  it.each([0, 1, 2, 3, 4, 5, 6])("unlocks only saved steps and the next step after %i saves", (lastCompletedStep) => {
    const onStepSelect = vi.fn();
    const progress = ProgressIndicator({ activeStep: 1, lastCompletedStep, onStepSelect });
    const progressButtons = buttons(progress);
    expect(progressButtons).toHaveLength(7);
    expect(stepNumbers.filter((step) => isStepAvailable(step, lastCompletedStep))).toEqual(
      stepNumbers.slice(0, lastCompletedStep + 1),
    );
    progressButtons.forEach((button, index) => {
      expect(button.props.disabled).toBe(index > lastCompletedStep);
      if (!button.props.disabled) button.props.onClick?.(clickEvent);
    });
    expect(onStepSelect.mock.calls.map(([step]) => step)).toEqual(stepNumbers.slice(0, lastCompletedStep + 1));
  });

  it("marks the selected progress step for assistive technology", () => {
    const html = renderToStaticMarkup(<ProgressIndicator activeStep={4} lastCompletedStep={5} onStepSelect={() => {}} />);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(buttons(ProgressIndicator({ activeStep: 4, lastCompletedStep: 5, onStepSelect: () => {} }))[3].props["aria-current"]).toBe("step");
  });

  it("keeps the Previous action and disables saving with its original label", () => {
    const onBack = vi.fn();
    const actions = StepActions({ isSaving: true, onBack });
    const [previous, save] = buttons(actions);
    previous.props.onClick?.(clickEvent);
    expect(onBack).toHaveBeenCalledOnce();
    expect(save.props.type).toBe("submit");
    expect(save.props.disabled).toBe(true);
    expect(renderToStaticMarkup(actions)).toContain("Saving...");
    expect(buttons(StepActions({ isSaving: false }))).toHaveLength(1);
  });

  it("edits all six sections from review and preserves back, submission and empty-value display", () => {
    const onEdit = vi.fn();
    const onBack = vi.fn();
    const onSubmit = vi.fn();
    const review = ReviewStep({
      isCompleting: false, onEdit, onBack, onSubmit,
      sections: { electricalPanel: { panelLocation: "Garage", mainBreakerCapacity: 200, availableSlots: 0 } },
    });
    for (const section of elements(review)) section.props.onEdit?.();
    expect(onEdit.mock.calls.map(([step]) => step)).toEqual([1, 2, 3, 4, 5, 6]);
    const [previous, submit] = buttons(review);
    previous.props.onClick?.(clickEvent);
    submit.props.onClick?.(clickEvent);
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
    const html = renderToStaticMarkup(review);
    expect(html).toContain("Review and submission");
    expect(html).toContain("Submit Assessment");
    expect(html).toContain("Not provided");
    expect(html).toMatch(/<dd[^>]*>0<\/dd>/);
  });

  it("disables review submission while completing", () => {
    const review = ReviewStep({ isCompleting: true, onEdit: () => {}, onBack: () => {}, onSubmit: () => {}, sections: {} });
    expect(buttons(review)[1].props.disabled).toBe(true);
    expect(renderToStaticMarkup(review)).toContain("Submitting...");
  });
});
