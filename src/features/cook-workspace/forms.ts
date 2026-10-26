import { z } from "zod";
import type { MealDraft, OfferingDraft } from "@/data/contracts";
import { PORTION_SIZE_LIMITS, type Meal } from "@/domain/catalog";
import { allergenSchema, dietaryTagSchema } from "@/domain/food-info";
import { sameText } from "@/domain/localized";
import { schedulableRange } from "@/domain/menu-window";
import { centsToInput, eur, parseEuroInput } from "@/domain/money";
import { OFFERING_LIMITS, type Offering } from "@/domain/offering";
import { civilDateSchema, localTimeSchema, pickupWindowSchema, type CivilDate } from "@/domain/time";

/*
 * Validation for the cook workspace forms. Messages are codes; the screens translate them.
 * The same schemas are the place to enforce these rules on a future server endpoint.
 */

export interface FieldIssue {
  code: string;
  min?: number;
  max?: number;
}
export type FieldIssues<K extends string = string> = Partial<Record<K, FieldIssue>>;

/** Keeps the first problem per field, in schema order. */
export function collectIssues(error: z.ZodError): FieldIssues {
  const issues: FieldIssues = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (issues[field]) continue;
    issues[field] = {
      code: issue.message,
      min: "minimum" in issue ? Number(issue.minimum) : undefined,
      max: "maximum" in issue ? Number(issue.maximum) : undefined,
    };
  }
  return issues;
}

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: "required" })
    .min(min, { error: "too_short" })
    .max(max, { error: "too_long" });

export const mealFormSchema = z.object({
  title: text(3, 80),
  description: text(10, 400),
  portion: text(3, 120),
  /** Optional weight or volume of a portion; empty means unknown. */
  portionAmount: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" || (/^\d+$/.test(v) && Number(v) >= PORTION_SIZE_LIMITS.min && Number(v) <= PORTION_SIZE_LIMITS.max),
      { error: "portion_size_range" },
    ),
  portionUnit: z.enum(["g", "ml"]),
  ingredients: text(3, 500),
  allergens: z.array(allergenSchema),
  mayContain: z.array(allergenSchema),
  dietary: z.array(dietaryTagSchema),
});
export type MealFormValues = z.input<typeof mealFormSchema>;
export type MealField = keyof MealFormValues;

export const EMPTY_MEAL_FORM: MealFormValues = {
  title: "",
  description: "",
  portion: "",
  portionAmount: "",
  portionUnit: "g",
  ingredients: "",
  allergens: [],
  mayContain: [],
  dietary: [],
};

export function mealToForm(meal: Meal, locale: "it" | "en"): MealFormValues {
  return {
    title: meal.title[locale],
    description: meal.description[locale],
    portion: meal.portion[locale],
    portionAmount: meal.portionSize ? String(meal.portionSize.amount) : "",
    portionUnit: meal.portionSize?.unit ?? "g",
    ingredients: meal.ingredients[locale],
    allergens: meal.allergens,
    mayContain: meal.mayContain,
    dietary: meal.dietary,
  };
}

/** Turns valid form values into a draft. Demo cooks write once; text is shown in both languages. */
export function mealFormToDraft(values: z.output<typeof mealFormSchema>, existing: Meal | null): MealDraft {
  const keep = (field: "title" | "description" | "portion" | "ingredients", value: string) =>
    // An unchanged field keeps both catalog translations instead of overwriting one with the other.
    existing && (existing[field].it === value || existing[field].en === value) ? existing[field] : sameText(value);
  return {
    id: existing?.id,
    title: keep("title", values.title),
    description: keep("description", values.description),
    portion: keep("portion", values.portion),
    ingredients: keep("ingredients", values.ingredients),
    allergens: values.allergens,
    mayContain: values.mayContain,
    dietary: values.dietary,
    image: existing?.image ?? null,
    ...(values.portionAmount
      ? { portionSize: { amount: Number(values.portionAmount), unit: values.portionUnit } }
      : {}),
  };
}

export const CUTOFF_HOUR_OPTIONS = [2, 4, 6, 12, 24] as const;

export interface OfferingFormValues {
  mealId: string;
  pickupDate: string;
  start: string;
  end: string;
  price: string;
  capacity: string;
  maxPerReservation: string;
  cutoffHours: string;
  status: "published" | "unpublished";
}
export type OfferingField = keyof OfferingFormValues;

const wholeNumber = (min: number, max: number, rangeCode: string) =>
  z
    .string()
    .trim()
    .min(1, { error: "required" })
    .regex(/^\d+$/, { error: "invalid_integer" })
    .transform(Number)
    .pipe(z.int().min(min, { error: rangeCode }).max(max, { error: rangeCode }));

/** Built per request because the allowed dates depend on "today" in Rome. */
export function offeringFormSchema(today: CivilDate) {
  const { min, max } = schedulableRange(today);
  return z
    .object({
      mealId: z.string().min(1, { error: "meal_not_found" }),
      pickupDate: civilDateSchema.refine((d) => d >= min && d <= max, { error: "date_out_of_range" }),
      start: localTimeSchema,
      end: localTimeSchema,
      price: z
        .string()
        .transform((value) => parseEuroInput(value))
        .refine(
          (cents): cents is number =>
            cents !== null && cents >= OFFERING_LIMITS.priceMinCents && cents <= OFFERING_LIMITS.priceMaxCents,
          { error: "invalid_price" },
        ),
      capacity: wholeNumber(1, OFFERING_LIMITS.capacityMax, "capacity_range"),
      maxPerReservation: wholeNumber(1, OFFERING_LIMITS.maxPerReservationMax, "max_per_reservation_range"),
      cutoffHours: z.enum(CUTOFF_HOUR_OPTIONS.map(String) as [string, ...string[]], { error: "choose_option" }),
      status: z.enum(["published", "unpublished"], { error: "choose_option" }),
    })
    .superRefine((values, ctx) => {
      const window = pickupWindowSchema.safeParse({ start: values.start, end: values.end });
      if (!window.success) {
        const issue = window.error.issues[0];
        ctx.addIssue({ code: "custom", message: issue?.message ?? "invalid_time", path: [issue?.path[0] === "end" ? "end" : "start"] });
      }
      if (values.maxPerReservation > values.capacity) {
        ctx.addIssue({ code: "custom", message: "max_above_capacity", path: ["maxPerReservation"] });
      }
    });
}

export function offeringToForm(offering: Offering, decimalSeparator: "," | "."): OfferingFormValues {
  return {
    mealId: offering.mealId,
    pickupDate: offering.pickupDate,
    start: offering.pickupWindow.start,
    end: offering.pickupWindow.end,
    price: centsToInput(offering.price.amountCents, decimalSeparator),
    capacity: String(offering.capacity),
    maxPerReservation: String(offering.maxPerReservation),
    cutoffHours: String(Math.round(offering.cutoffMinutesBefore / 60)),
    status: offering.status,
  };
}

export function offeringFormToDraft(
  values: z.output<ReturnType<typeof offeringFormSchema>>,
  existingId: string | undefined,
): OfferingDraft {
  return {
    id: existingId,
    mealId: values.mealId,
    pickupDate: values.pickupDate,
    pickupWindow: { start: values.start, end: values.end },
    price: eur(values.price),
    capacity: values.capacity,
    maxPerReservation: values.maxPerReservation,
    cutoffMinutesBefore: Number(values.cutoffHours) * 60,
    status: values.status,
  };
}
