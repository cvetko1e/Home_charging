export class AssessmentServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AssessmentServiceError";
  }
}
