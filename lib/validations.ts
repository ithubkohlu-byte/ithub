// Centralized Zod schemas.
//
// These validate on the CLIENT before any Supabase call is made, so a bad
// value never leaves the browser. They deliberately mirror (not replace)
// the database CHECK constraints in sql/schema.sql — the database is still
// the source of truth and the last line of defense, this is just an early,
// friendlier error message.
//
// Usage pattern (see components/apply/ApplyWizard.tsx submitStep1 for a
// worked example):
//
//   const parsed = accountSchema.safeParse(form);
//   if (!parsed.success) return setError(firstError(parsed));

import { z } from "zod";

// Pakistani mobile numbers: 03XXXXXXXXX (11 digits) or +923XXXXXXXXX.
const phoneRegex = /^(?:\+92|0)3\d{9}$/;
// CNIC with or without dashes: 12345-1234567-1 or 1234512345671.
const cnicRegex = /^\d{5}-?\d{7}-?\d{1}$/;
const usernameRegex = /^[A-Za-z0-9_]{3,20}$/;

export const accountSchema = z
  .object({
    full_name: z.string().trim().min(3, "Full name must be at least 3 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX)."),
    username: z
      .string()
      .trim()
      .regex(usernameRegex, "Username must be 3-20 characters: letters, numbers, or underscore only."),
    password: z.string().optional().default(""),
    confirm_password: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    // Password is only required for email/password signup. OAuth accounts
    // (Google/Facebook/GitHub) skip this — the caller only runs this check
    // for the password path.
    if (data.password || data.confirm_password) {
      if (data.password.length < 6) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password must be at least 6 characters." });
      }
      if (data.password !== data.confirm_password) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm_password"], message: "Passwords do not match." });
      }
    }
  });

export const personalInfoSchema = z.object({
  father_name: z.string().trim().min(3, "Father's name must be at least 3 characters."),
  dob: z.string().min(1, "Date of birth is required."),
  gender: z.string().min(1, "Select a gender."),
  address: z.string().trim().min(5, "Enter your full address."),
  city: z.string().trim().min(2, "City is required."),
  student_cnic: z.string().trim().regex(cnicRegex, "Enter a valid CNIC (XXXXX-XXXXXXX-X)."),
  father_cnic: z.string().trim().regex(cnicRegex, "Enter a valid father's CNIC (XXXXX-XXXXXXX-X)."),
});

export const academicInfoSchema = z.object({
  matric_board: z.string().trim().min(2, "Matric board is required."),
  matric_year: z
    .string()
    .regex(/^\d{4}$/, "Enter a valid 4-digit year.")
    .refine((y) => Number(y) >= 1990 && Number(y) <= new Date().getFullYear(), "Enter a realistic year."),
  matric_total: z.string().regex(/^\d+$/, "Total marks must be a number."),
  matric_obtained: z.string().regex(/^\d+$/, "Obtained marks must be a number."),
  fsc_board: z.string().trim().optional().default(""),
  fsc_year: z.string().optional().default(""),
  fsc_total: z.string().optional().default(""),
  fsc_obtained: z.string().optional().default(""),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or username."),
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Full name must be at least 3 characters."),
  username: z.string().trim().regex(usernameRegex, "Username must be 3-20 characters: letters, numbers, or underscore only."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid Pakistani mobile number."),
  confirm: z.string().min(6, "Password must be at least 6 characters."),
});

/** Returns the first validation error message, or null if the parse succeeded. */
export function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  if (result.success) return null;
  return result.error?.issues[0]?.message ?? "Please check the form and try again.";
}
