import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";

export function formResolver<T extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
) {
  return zodResolver(schema) as unknown as Resolver<T>;
}
