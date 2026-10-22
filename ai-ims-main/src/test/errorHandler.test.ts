import { describe, it, expect } from "vitest";
import { getZodErrors, getErrorMessage } from "@/utils/errorHandler";
import { ZodError, z } from "zod";

describe("getZodErrors", () => {
  it("extracts field errors from ZodError", () => {
    const schema = z.object({ email: z.string().email(), name: z.string().min(1) });
    const result = schema.safeParse({ email: "bad", name: "" });
    if (!result.success) {
      const errors = getZodErrors(result.error);
      expect(errors.email).toBeDefined();
      expect(errors.name).toBeDefined();
    }
  });

  it("returns first error for each field only", () => {
    const schema = z.object({ pw: z.string().min(6).regex(/^[a-z]+$/) });
    const result = schema.safeParse({ pw: "A" });
    if (!result.success) {
      const errors = getZodErrors(result.error);
      expect(typeof errors.pw).toBe("string");
    }
  });
});

describe("getErrorMessage", () => {
  it("extracts message from Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns string as-is", () => {
    expect(getErrorMessage("fail")).toBe("fail");
  });

  it("returns default for unknown", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });

  it("extracts first issue from ZodError", () => {
    const schema = z.string().email();
    const result = schema.safeParse("bad");
    if (!result.success) {
      const msg = getErrorMessage(result.error);
      expect(msg).toContain("email");
    }
  });
});
