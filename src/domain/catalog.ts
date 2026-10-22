import { z } from "zod";
import { allergenSchema, dietaryTagSchema } from "./food-info";
import { idSchema } from "./ids";
import { localizedTextSchema } from "./localized";

export const neighborhoodSchema = z.object({
  id: idSchema,
  name: z.string(),
  /** Only pilot neighborhoods have offerings; others are shown as "not yet available". */
  isPilot: z.boolean(),
  pickupPoints: z.array(
    z.object({
      id: idSchema,
      /** General area only. Exact addresses would be shared after a confirmed real order. */
      area: localizedTextSchema,
    }),
  ),
});
export type Neighborhood = z.infer<typeof neighborhoodSchema>;

/**
 * Onboarding checks a real cook could complete. Demo profiles have none: the type exists so that
 * screens are written to show completed checks only when real evidence exists.
 */
export const onboardingCheckSchema = z.enum([
  "identity_confirmed",
  "food_business_registration_reviewed",
  "kitchen_assessment_completed",
]);
export type OnboardingCheck = z.infer<typeof onboardingCheckSchema>;

export const cookProfileSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  neighborhoodId: idSchema,
  pickupPointId: idSchema,
  cookingStyle: localizedTextSchema,
  bio: localizedTextSchema,
  /** Always true in this demo. Screens label fictional profiles explicitly. */
  isFictional: z.literal(true),
  completedChecks: z.array(onboardingCheckSchema).max(0),
});
export type CookProfile = z.infer<typeof cookProfileSchema>;

export const mealImageSchema = z.object({
  src: z.string().startsWith("/assets/images/"),
  width: z.int().positive(),
  height: z.int().positive(),
  alt: localizedTextSchema,
});
export type MealImage = z.infer<typeof mealImageSchema>;

export const mealSchema = z.object({
  id: idSchema,
  cookId: idSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
  portion: localizedTextSchema,
  ingredients: localizedTextSchema,
  /** Allergens the recipe contains, as declared by the cook. */
  allergens: z.array(allergenSchema),
  /** Possible cross-contact the cook has declared ("may contain"). */
  mayContain: z.array(allergenSchema),
  dietary: z.array(dietaryTagSchema),
  /** Null means no photo yet: screens show a neutral placeholder rather than an unrelated image. */
  image: mealImageSchema.nullable(),
});
export type Meal = z.infer<typeof mealSchema>;
