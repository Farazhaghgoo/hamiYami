import { z } from "zod";
import { locales } from "@/i18n/config";

/*
 * One schema for the waitlist form, used by the browser for instant feedback and by the server as
 * the authority. Messages are codes; screens translate them (see WaitlistForm).
 */

export const AUDIENCES = ["customer", "cook"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const EXPERIENCE_OPTIONS = ["operates_food_business", "exploring", "other_or_prefer_not"] as const;

export const WAITLIST_LIMITS = {
  email: 254,
  city: 80,
  neighborhood: 80,
  mealsWanted: 300,
  dishes: 300,
} as const;

/** Collapses whitespace and strips control characters before validating. */
const cleaned = z.string().transform((value) =>
  value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const shared = {
  email: cleaned
    .pipe(z.string().min(1, { error: "email_required" }).max(WAITLIST_LIMITS.email, { error: "email_invalid" }))
    .pipe(z.string().regex(EMAIL_PATTERN, { error: "email_invalid" }))
    .transform((email) => email.toLowerCase()),
  city: cleaned.pipe(z.string().min(1, { error: "city_required" }).max(WAITLIST_LIMITS.city, { error: "too_long" })),
  neighborhood: cleaned.pipe(z.string().max(WAITLIST_LIMITS.neighborhood, { error: "too_long" })).default(""),
  marketingConsent: z.boolean().default(false),
  /** The consent version the visitor was shown. The server resolves its approved wording. */
  consentVersion: z.string().max(64).default(""),
  locale: z.enum(locales).default("it"),
};

export const customerSubmissionSchema = z.object({
  audience: z.literal("customer"),
  ...shared,
  mealsWanted: cleaned.pipe(z.string().max(WAITLIST_LIMITS.mealsWanted, { error: "too_long" })).default(""),
});

export const cookSubmissionSchema = z.object({
  audience: z.literal("cook"),
  ...shared,
  dishes: cleaned.pipe(z.string().min(1, { error: "dishes_required" }).max(WAITLIST_LIMITS.dishes, { error: "too_long" })),
  foodBusinessExperience: z.union([z.enum(EXPERIENCE_OPTIONS), z.literal("")], { error: "choose_option" }).default(""),
});

export const waitlistSubmissionSchema = z.discriminatedUnion(
  "audience",
  [customerSubmissionSchema, cookSubmissionSchema],
  { error: "choose_audience" },
);
export type WaitlistSubmission = z.output<typeof waitlistSubmissionSchema>;

/** What the browser sends: the submission plus two supplementary spam signals. */
export const waitlistRequestSchema = z.object({
  /** Hidden field people never see; bots often fill it. */
  hy_check: z.string().max(200).default(""),
  /** Time between page load and submit, in ms. */
  elapsedMs: z.number().nonnegative().optional(),
});

export type WaitlistField =
  | "audience"
  | "email"
  | "city"
  | "neighborhood"
  | "mealsWanted"
  | "dishes"
  | "foodBusinessExperience"
  | "marketingConsent";

/** Field → error code, first problem per field. */
export function waitlistErrors(error: z.ZodError): Partial<Record<WaitlistField, string>> {
  const errors: Partial<Record<WaitlistField, string>> = {};
  for (const issue of error.issues) {
    const field = (issue.path[0] ?? "audience") as WaitlistField;
    errors[field] ??= issue.message;
  }
  return errors;
}
