import { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export const getZodErrors = (error: ZodError): FieldErrors => {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Validation failed";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
};
