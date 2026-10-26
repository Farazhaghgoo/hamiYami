"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { OfferingDraft, OfferingSnapshot } from "@/data/contracts";
import { DEMO_COOK_ID } from "@/data/demo";
import { useDemo, useDemoQuery } from "@/data/demo/DemoProvider";
import type { Meal } from "@/domain/catalog";
import { pickText } from "@/domain/localized";
import { schedulableRange } from "@/domain/menu-window";
import { eur } from "@/domain/money";
import { isUnusualPrice, priceStats, type PriceStats } from "@/domain/pricing";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ErrorSummary } from "@/shared/ui/ErrorSummary";
import { ChoiceGroup, SelectField, TextField, formStyles } from "@/shared/ui/fields";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import {
  collectIssues,
  CUTOFF_HOUR_OPTIONS,
  offeringFormSchema,
  offeringFormToDraft,
  offeringToForm,
  type FieldIssues,
  type OfferingField,
  type OfferingFormValues,
} from "../forms";
import { useIssueMessage } from "./useIssueMessage";
import styles from "./Workspace.module.css";

const FIELD_IDS: Record<OfferingField, string> = {
  mealId: "offering-meal",
  pickupDate: "offering-date",
  start: "offering-start",
  end: "offering-end",
  price: "offering-price",
  capacity: "offering-capacity",
  maxPerReservation: "offering-max",
  cutoffHours: "offering-cutoff",
  status: "offering-status",
};

/** Prices of other dishes on sale nearby, used to describe the local market to the cook. */
export interface LocalMarket {
  neighborhoodName: string;
  stats: PriceStats | null;
}

interface EditorData {
  meals: Meal[];
  existing: OfferingSnapshot | null;
  market: LocalMarket;
}

export function OfferingEditor({ offeringId, presetMealId }: { offeringId: string | null; presetMealId: string | null }) {
  const { t, href } = useI18n();
  const { anchor } = useDemo();
  const { data, ready } = useDemoQuery(
    `offering-editor:${offeringId}`,
    async (repos): Promise<EditorData> => {
      const range = schedulableRange(anchor);
      const [meals, snapshot, cook, neighborhoods] = await Promise.all([
        repos.cookWorkspace.listMeals(),
        offeringId ? repos.catalog.getOffering(offeringId) : null,
        repos.catalog.getCook(DEMO_COOK_ID),
        repos.catalog.listNeighborhoods(),
      ]);
      const local = cook
        ? await repos.catalog.listOfferings({ from: range.min, to: range.max, neighborhoodId: cook.neighborhoodId })
        : [];
      return {
        meals,
        // Only the demo cook's own offerings can be edited here.
        existing: snapshot && snapshot.offering.cookId === DEMO_COOK_ID ? snapshot : null,
        market: {
          neighborhoodName: neighborhoods.find((n) => n.id === cook?.neighborhoodId)?.name ?? "",
          stats: priceStats(
            local.filter((s) => s.offering.id !== offeringId).map((s) => s.offering.price.amountCents),
          ),
        },
      };
    },
    { meals: [], existing: null, market: { neighborhoodName: "", stats: null } },
  );

  if (!ready) return <p className={styles.muted}>{t.common.loading}</p>;
  if (offeringId && !data.existing) {
    return (
      <Notice tone="warning" role="alert">
        {t.validation.notFound} <Link href={href("/cook-workspace")}>{t.workspace.title}</Link>
      </Notice>
    );
  }
  if (!data.meals.length) {
    return (
      <Notice tone="info">
        {t.workspace.noMeals} <Link href={href("/cook-workspace/meals/new")}>{t.workspace.newMeal}</Link>
      </Notice>
    );
  }
  return (
    <OfferingForm
      key={offeringId ?? "new"}
      meals={data.meals}
      existing={data.existing}
      market={data.market}
      presetMealId={presetMealId}
    />
  );
}

function OfferingForm({
  meals,
  existing,
  market,
  presetMealId,
}: {
  meals: Meal[];
  existing: OfferingSnapshot | null;
  market: LocalMarket;
  presetMealId: string | null;
}) {
  const { t, locale, href, plural, format, money } = useI18n();
  const { anchor, repositories } = useDemo();
  const router = useRouter();
  const issueMessage = useIssueMessage();
  const range = schedulableRange(anchor);
  const decimal = locale === "it" ? "," : ".";
  const [values, setValues] = useState<OfferingFormValues>(() =>
    existing
      ? offeringToForm(existing.offering, decimal)
      : {
          mealId: meals.some((m) => m.id === presetMealId) ? (presetMealId ?? "") : "",
          pickupDate: range.min,
          start: "18:30",
          end: "19:30",
          price: "",
          capacity: "8",
          maxPerReservation: "4",
          cutoffHours: "6",
          status: "published",
        },
  );
  const [issues, setIssues] = useState<FieldIssues<OfferingField>>({});
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  const reserved = existing?.reservedPortions ?? 0;
  // An unusual price waiting for the cook's confirmation, and the last price they confirmed.
  const [unusual, setUnusual] = useState<OfferingDraft | null>(null);
  const confirmedCents = useRef<number | null>(null);

  const set = (field: OfferingField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (issues[field]) setIssues((current) => ({ ...current, [field]: undefined }));
  };
  const message = (field: OfferingField) => issueMessage(issues[field], { reserved });

  const labels: Record<OfferingField, string> = {
    mealId: t.offeringForm.meal,
    pickupDate: t.offeringForm.date,
    start: t.offeringForm.start,
    end: t.offeringForm.end,
    price: t.offeringForm.price,
    capacity: t.offeringForm.capacity,
    maxPerReservation: t.offeringForm.maxPerReservation,
    cutoffHours: t.offeringForm.cutoff,
    status: t.offeringForm.status,
  };
  const errorList = (Object.keys(FIELD_IDS) as OfferingField[])
    .filter((field) => issues[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: `${labels[field]}: ${message(field)}` }));

  function fail(next: FieldIssues<OfferingField>) {
    saving.current = false;
    setIssues(next);
    setAttempt((n) => n + 1);
  }

  async function save(draft: OfferingDraft) {
    saving.current = true;
    const result = await repositories.cookWorkspace.saveOffering(draft, new Date());
    if (!result.ok) {
      const field: OfferingField =
        result.error === "capacity_below_reserved" ? "capacity" : result.error === "date_in_past" ? "pickupDate" : "mealId";
      const code =
        result.error === "date_in_past"
          ? "date_out_of_range"
          : result.error === "capacity_below_reserved"
            ? "capacity_below_reserved"
            : result.error;
      return fail({ [field]: { code } });
    }
    router.push(href("/cook-workspace?saved=offering#offerings"));
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true;
        const parsed = offeringFormSchema(anchor).safeParse(values);
        if (!parsed.success) return fail(collectIssues(parsed.error) as FieldIssues<OfferingField>);

        const draft = offeringFormToDraft(parsed.data, existing?.offering.id);
        // No price control: an unusual price only asks for confirmation, once per value.
        if (isUnusualPrice(draft.price.amountCents, market.stats) && confirmedCents.current !== draft.price.amountCents) {
          saving.current = false;
          setUnusual(draft);
          return;
        }
        await save(draft);
      }}
    >
      <ErrorSummary errors={errorList} focusKey={attempt} />
      <div className={styles.formCard}>
        <SelectField
          id={FIELD_IDS.mealId}
          label={t.offeringForm.meal}
          value={values.mealId}
          onChange={(e) => set("mealId", e.target.value)}
          error={message("mealId")}
        >
          <option value="">{t.offeringForm.mealPlaceholder}</option>
          {meals.map((meal) => (
            <option key={meal.id} value={meal.id}>
              {pickText(meal.title, locale)}
            </option>
          ))}
        </SelectField>
        <TextField
          id={FIELD_IDS.pickupDate}
          label={t.offeringForm.date}
          hint={t.offeringForm.dateHint}
          type="date"
          min={range.min}
          max={range.max}
          value={values.pickupDate}
          onChange={(e) => set("pickupDate", e.target.value)}
          error={message("pickupDate")}
        />
        <div className={formStyles.row}>
          <TextField
            id={FIELD_IDS.start}
            label={t.offeringForm.start}
            type="time"
            step={900}
            value={values.start}
            onChange={(e) => set("start", e.target.value)}
            error={message("start")}
          />
          <TextField
            id={FIELD_IDS.end}
            label={t.offeringForm.end}
            type="time"
            step={900}
            value={values.end}
            onChange={(e) => set("end", e.target.value)}
            error={message("end")}
          />
        </div>
        <p className={formStyles.hint}>
          {t.offeringForm.windowHint} {t.common.romeTimeNote}
        </p>
      </div>

      <div className={styles.formCard}>
        <TextField
          id={FIELD_IDS.price}
          label={t.offeringForm.price}
          hint={t.offeringForm.priceHint}
          inputMode="decimal"
          autoComplete="off"
          value={values.price}
          onChange={(e) => set("price", e.target.value)}
          error={message("price")}
        />
        <div className={formStyles.row}>
          <TextField
            id={FIELD_IDS.capacity}
            label={t.offeringForm.capacity}
            hint={
              existing
                ? `${t.offeringForm.capacityHint} ${format(t.offeringForm.reserved, { count: reserved })}`
                : t.offeringForm.capacityHint
            }
            type="number"
            inputMode="numeric"
            min={Math.max(1, reserved)}
            max={60}
            value={values.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            error={message("capacity")}
          />
          <TextField
            id={FIELD_IDS.maxPerReservation}
            label={t.offeringForm.maxPerReservation}
            type="number"
            inputMode="numeric"
            min={1}
            max={8}
            value={values.maxPerReservation}
            onChange={(e) => set("maxPerReservation", e.target.value)}
            error={message("maxPerReservation")}
          />
        </div>
        <SelectField
          id={FIELD_IDS.cutoffHours}
          label={t.offeringForm.cutoff}
          value={values.cutoffHours}
          onChange={(e) => set("cutoffHours", e.target.value)}
          error={message("cutoffHours")}
        >
          {CUTOFF_HOUR_OPTIONS.map((hours) => (
            <option key={hours} value={String(hours)}>
              {plural(t.offeringForm.cutoffOption, hours)}
            </option>
          ))}
        </SelectField>
        <ChoiceGroup
          id={FIELD_IDS.status}
          legend={t.offeringForm.status}
          type="radio"
          name="status"
          options={[
            { value: "published", label: t.offeringForm.statusPublished },
            { value: "unpublished", label: t.offeringForm.statusUnpublished },
          ]}
          value={[values.status]}
          onChange={([next]) => set("status", next === "unpublished" ? "unpublished" : "published")}
          error={message("status")}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={buttonClass({ size: "lg" })}>
          <Icon name="check" />
          {t.offeringForm.save}
        </button>
        <Link href={href("/cook-workspace#offerings")} className={buttonClass({ variant: "quiet" })}>
          {t.common.cancel}
        </Link>
      </div>
      {unusual && market.stats ? (
        <ConfirmDialog
          open
          title={format(t.offeringForm.unusualTitle, { price: money(unusual.price) })}
          confirmLabel={format(t.offeringForm.unusualConfirm, { price: money(unusual.price) })}
          cancelLabel={t.offeringForm.unusualFix}
          tone="secondary"
          onClose={() => setUnusual(null)}
          onConfirm={() => {
            confirmedCents.current = unusual.price.amountCents;
            const draft = unusual;
            setUnusual(null);
            void save(draft);
          }}
        >
          <p>
            {format(t.offeringForm.unusualBody, {
              neighborhood: market.neighborhoodName,
              min: money(eur(market.stats.minCents)),
              max: money(eur(market.stats.maxCents)),
            })}
          </p>
        </ConfirmDialog>
      ) : null}
    </form>
  );
}
