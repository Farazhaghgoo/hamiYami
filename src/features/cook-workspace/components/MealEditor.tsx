"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useDemo, useDemoQuery } from "@/data/demo/DemoProvider";
import type { Meal } from "@/domain/catalog";
import { ALLERGENS, DIETARY_TAGS } from "@/domain/food-info";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ErrorSummary } from "@/shared/ui/ErrorSummary";
import { ChoiceGroup, SelectField, TextAreaField, TextField, formStyles } from "@/shared/ui/fields";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import {
  collectIssues,
  EMPTY_MEAL_FORM,
  mealFormSchema,
  mealFormToDraft,
  mealToForm,
  type FieldIssues,
  type MealField,
  type MealFormValues,
} from "../forms";
import { useIssueMessage } from "./useIssueMessage";
import styles from "./Workspace.module.css";

const FIELD_IDS: Record<MealField, string> = {
  title: "meal-title",
  description: "meal-description",
  portion: "meal-portion",
  portionAmount: "meal-portion-amount",
  portionUnit: "meal-portion-unit",
  ingredients: "meal-ingredients",
  allergens: "meal-allergens",
  mayContain: "meal-may-contain",
  dietary: "meal-dietary",
};

export function MealEditor({ mealId }: { mealId: string | null }) {
  const { t, href } = useI18n();
  const { data: meal, ready } = useDemoQuery(
    `meal-editor:${mealId}`,
    async (repos) => (mealId ? ((await repos.cookWorkspace.listMeals()).find((m) => m.id === mealId) ?? null) : null),
    null as Meal | null,
  );

  if (mealId && !ready) return <p className={styles.muted}>{t.common.loading}</p>;
  if (mealId && !meal) {
    return (
      <Notice tone="warning" role="alert">
        {t.validation.notFound} <Link href={href("/cook-workspace")}>{t.workspace.title}</Link>
      </Notice>
    );
  }
  return <MealForm key={meal?.id ?? "new"} meal={meal} />;
}

function MealForm({ meal }: { meal: Meal | null }) {
  const { t, locale, href } = useI18n();
  const { repositories } = useDemo();
  const router = useRouter();
  const issueMessage = useIssueMessage();
  const [values, setValues] = useState<MealFormValues>(meal ? mealToForm(meal, locale) : EMPTY_MEAL_FORM);
  const [issues, setIssues] = useState<FieldIssues<MealField>>({});
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);

  const set = <K extends MealField>(field: K, value: MealFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as it is edited after a failed submit.
    if (issues[field]) setIssues((current) => ({ ...current, [field]: undefined }));
  };
  const message = (field: MealField) => issueMessage(issues[field]);

  const errorList = (Object.keys(FIELD_IDS) as MealField[])
    .filter((field) => issues[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: `${fieldLabel(field)}: ${message(field)}` }));

  function fieldLabel(field: MealField): string {
    const labels: Record<MealField, string> = {
      title: t.mealForm.name,
      description: t.mealForm.description,
      portion: t.mealForm.portion,
      portionAmount: t.mealForm.portionAmount,
      portionUnit: t.mealForm.portionUnit,
      ingredients: t.mealForm.ingredients,
      allergens: t.mealForm.allergens,
      mayContain: t.mealForm.mayContain,
      dietary: t.mealForm.dietary,
    };
    return labels[field];
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving.current) return;
        const parsed = mealFormSchema.safeParse(values);
        if (!parsed.success) {
          setIssues(collectIssues(parsed.error) as FieldIssues<MealField>);
          setAttempt((n) => n + 1);
          return;
        }
        saving.current = true;
        const result = await repositories.cookWorkspace.saveMeal(mealFormToDraft(parsed.data, meal));
        if (!result.ok) {
          saving.current = false;
          setIssues({ title: { code: "not_found" } });
          setAttempt((n) => n + 1);
          return;
        }
        router.push(href("/cook-workspace?saved=meal#meals"));
      }}
    >
      <ErrorSummary errors={errorList} focusKey={attempt} />
      <div className={styles.formCard}>
        <p className={formStyles.hint}>{t.mealForm.language}</p>
        <TextField
          id={FIELD_IDS.title}
          label={t.mealForm.name}
          value={values.title}
          maxLength={80}
          onChange={(e) => set("title", e.target.value)}
          error={message("title")}
        />
        <TextAreaField
          id={FIELD_IDS.description}
          label={t.mealForm.description}
          hint={t.mealForm.descriptionHint}
          value={values.description}
          maxLength={400}
          rows={3}
          onChange={(e) => set("description", e.target.value)}
          error={message("description")}
        />
        <TextField
          id={FIELD_IDS.portion}
          label={t.mealForm.portion}
          hint={t.mealForm.portionHint}
          value={values.portion}
          maxLength={120}
          onChange={(e) => set("portion", e.target.value)}
          error={message("portion")}
        />
        <div className={formStyles.row}>
          <TextField
            id={FIELD_IDS.portionAmount}
            label={t.mealForm.portionAmount}
            optionalLabel={t.common.optional}
            // The hint sits under both fields, so it is linked here by hand.
            aria-describedby={["meal-portion-size-hint", issues.portionAmount ? `${FIELD_IDS.portionAmount}-error` : ""]
              .filter(Boolean)
              .join(" ")}
            type="number"
            inputMode="numeric"
            min={20}
            max={3000}
            value={values.portionAmount}
            onChange={(e) => set("portionAmount", e.target.value)}
            error={message("portionAmount")}
          />
          <SelectField
            id={FIELD_IDS.portionUnit}
            label={t.mealForm.portionUnit}
            value={values.portionUnit}
            onChange={(e) => set("portionUnit", e.target.value === "ml" ? "ml" : "g")}
            error={message("portionUnit")}
          >
            <option value="g">{t.mealForm.unitG}</option>
            <option value="ml">{t.mealForm.unitMl}</option>
          </SelectField>
        </div>
        <p id="meal-portion-size-hint" className={formStyles.hint}>
          {t.mealForm.portionSizeHint}
        </p>
        <TextAreaField
          id={FIELD_IDS.ingredients}
          label={t.mealForm.ingredients}
          hint={t.mealForm.ingredientsHint}
          value={values.ingredients}
          maxLength={500}
          rows={3}
          onChange={(e) => set("ingredients", e.target.value)}
          error={message("ingredients")}
        />
      </div>

      <div className={styles.formCard}>
        <ChoiceGroup
          id={FIELD_IDS.allergens}
          legend={t.mealForm.allergens}
          hint={t.mealForm.allergensHint}
          type="checkbox"
          name="allergens"
          grid
          options={ALLERGENS.map((a) => ({ value: a, label: t.food.allergens[a] }))}
          value={values.allergens}
          onChange={(next) => set("allergens", next as MealFormValues["allergens"])}
          error={message("allergens")}
        />
        <ChoiceGroup
          id={FIELD_IDS.mayContain}
          legend={t.mealForm.mayContain}
          hint={t.mealForm.mayContainHint}
          optionalLabel={t.common.optional}
          type="checkbox"
          name="mayContain"
          grid
          options={ALLERGENS.map((a) => ({
            value: a,
            label: t.food.allergens[a],
            disabled: values.allergens.includes(a),
          }))}
          value={values.mayContain.filter((a) => !values.allergens.includes(a))}
          onChange={(next) => set("mayContain", next as MealFormValues["mayContain"])}
          error={message("mayContain")}
        />
        <ChoiceGroup
          id={FIELD_IDS.dietary}
          legend={t.mealForm.dietary}
          hint={t.meals.dietaryNote}
          optionalLabel={t.common.optional}
          type="checkbox"
          name="dietary"
          options={DIETARY_TAGS.map((d) => ({ value: d, label: t.food.dietary[d] }))}
          value={values.dietary}
          onChange={(next) => set("dietary", next as MealFormValues["dietary"])}
          error={message("dietary")}
        />
        <div>
          <p className={formStyles.label}>{t.mealForm.photo}</p>
          <p className={formStyles.hint}>{t.mealForm.photoNote}</p>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={buttonClass({ size: "lg" })}>
          <Icon name="check" />
          {t.mealForm.save}
        </button>
        <Link href={href("/cook-workspace#meals")} className={buttonClass({ variant: "quiet" })}>
          {t.mealForm.cancel}
        </Link>
      </div>
    </form>
  );
}
