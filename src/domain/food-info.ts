import { z } from "zod";

/**
 * The 14 allergens that EU Regulation 1169/2011 (Annex II) requires food businesses to declare.
 * Allergen information is factual and safety-relevant: it is kept apart from dietary preferences.
 */
export const ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;
export const allergenSchema = z.enum(ALLERGENS);
export type Allergen = z.infer<typeof allergenSchema>;

/**
 * Dietary preferences describe the style of a recipe as declared by the cook. They are a
 * browsing aid, never a guarantee about allergens or cross-contact.
 */
export const DIETARY_TAGS = ["vegetarian", "vegan", "pork_free"] as const;
export const dietaryTagSchema = z.enum(DIETARY_TAGS);
export type DietaryTag = z.infer<typeof dietaryTagSchema>;

/** Vegan recipes are also vegetarian; keeps cook-entered tags consistent. */
export function normalizeDietaryTags(tags: readonly DietaryTag[]): DietaryTag[] {
  const set = new Set(tags);
  if (set.has("vegan")) set.add("vegetarian");
  return DIETARY_TAGS.filter((tag) => set.has(tag));
}

export function sortAllergens(allergens: readonly Allergen[]): Allergen[] {
  const set = new Set(allergens);
  return ALLERGENS.filter((a) => set.has(a));
}
