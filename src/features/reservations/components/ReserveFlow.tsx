"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CreateReservationError } from "@/data/contracts";
import { useDemo, useDemoQuery } from "@/data/demo/DemoProvider";
import { pickText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import { multiplyMoney } from "@/domain/money";
import { checkQuantity } from "@/domain/offering";
import { holdsCapacity } from "@/domain/reservation";
import { getOfferingDetail, type OfferingDetailView } from "@/features/meals/detail";
import { useQuantityMessage } from "@/features/meals/components/useQuantityMessage";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ErrorSummary } from "@/shared/ui/ErrorSummary";
import { FieldError } from "@/shared/ui/fields";
import { Icon } from "@/shared/ui/Icon";
import { MealImage } from "@/shared/ui/MealImage";
import { Notice } from "@/shared/ui/Notice";
import { QuantityStepper } from "@/shared/ui/QuantityStepper";
import { attemptKey, forgetAttempt } from "../checkout-attempt";
import styles from "./ReserveFlow.module.css";

type Step = 1 | 2 | 3;

/**
 * Simulated reservation: quantity → pickup time → review → demo confirmation.
 * Each step is a URL (…/reserve?step=2&qty=2&slot=18:45), so Back/Forward and reloads keep the
 * visitor's choices. Nothing here contacts a server or asks for payment or personal details.
 */
export function ReserveFlow({
  offeringId,
  menu,
  initial,
}: {
  offeringId: string;
  menu: MenuWindow;
  initial: OfferingDetailView | null;
}) {
  const { t, locale, href } = useI18n();
  const searchParams = useSearchParams();
  const { data: detail, ready } = useDemoQuery(
    `detail:${offeringId}`,
    (repos, now) => getOfferingDetail(repos.catalog, offeringId, menu, now),
    initial,
  );

  if (!detail) {
    if (!ready) return <p className={styles.loading}>{t.common.loading}</p>;
    return (
      <div className={styles.missing}>
        <h1>{t.detail.notFoundTitle}</h1>
        <p>{t.detail.notFoundText}</p>
        <Link href={href("/meals")} className={buttonClass()}>
          {t.detail.browseOthers}
        </Link>
      </div>
    );
  }

  const title = pickText(detail.meal.title, locale);
  const requestedStep = Number(searchParams.get("step") ?? "1");
  const qty = Number(searchParams.get("qty") ?? "1");
  const slot = searchParams.get("slot") ?? "";
  const qtyValid = checkQuantity(qty, detail.offering, detail.availability) === null;
  const slotValid = detail.slots.includes(slot);
  // Never show a later step whose inputs are missing or no longer valid.
  const step: Step = requestedStep >= 3 && qtyValid && slotValid ? 3 : requestedStep >= 2 && qtyValid ? 2 : 1;

  return <Flow detail={detail} title={title} step={step} qty={qty} slot={slot} />;
}

function Flow({ detail, title, step, qty, slot }: { detail: OfferingDetailView; title: string; step: Step; qty: number; slot: string }) {
  const { t, format, href } = useI18n();
  const searchParams = useSearchParams();
  // Move focus to the step heading only after moving between steps, not on first arrival
  // (so the demo notice above is read first).
  const [shownStep, setShownStep] = useState(step);
  const [focusStep, setFocusStep] = useState(false);
  if (shownStep !== step) {
    setShownStep(step);
    setFocusStep(true);
  }

  return (
    <>
      <nav aria-label={t.detail.breadcrumb} className={styles.breadcrumb}>
        <Link href={href(`/meals/${detail.offering.id}`)}>
          <Icon name="arrowLeft" />
          {title}
        </Link>
      </nav>
      <h1 className={styles.title}>{format(t.reserve.title, { meal: title })}</h1>

      <Notice tone="demo" title={t.reserve.demoNoticeTitle} className={styles.demoNotice}>
        {t.reserve.demoNotice}
      </Notice>

      <ol className={styles.progress} aria-label={t.reserve.progressLabel}>
        {t.reserve.steps.map((name, index) => (
          <li key={name} aria-current={index + 1 === step ? "step" : undefined} data-done={index + 1 < step || undefined}>
            <span className={styles.progressNumber}>{index + 1 < step ? <Icon name="check" /> : index + 1}</span>
            {name}
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.main}>
          {step === 1 ? (
            <QuantityStep
              key={searchParams.toString()}
              detail={detail}
              initialQuantity={searchParams.get("qty")}
              slot={slot}
              focus={focusStep}
            />
          ) : step === 2 ? (
            <SlotStep key={searchParams.toString()} detail={detail} quantity={qty} initialSlot={slot} focus={focusStep} />
          ) : (
            <ReviewStep detail={detail} quantity={qty} slot={slot} focus={focusStep} />
          )}
        </div>
        <Summary detail={detail} quantity={step > 1 ? qty : null} slot={step > 2 ? slot : null} />
      </div>
    </>
  );
}

function useStepNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  return (step: Step, quantity: number, slot: string) => {
    const params = new URLSearchParams({ step: String(step), qty: String(quantity) });
    if (slot) params.set("slot", slot);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
}

/** Moves focus to the step heading when a new step appears, so the change is announced. */
function StepHeading({ children, focus }: { children: ReactNode; focus: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
    // Only on mount: each step mounts afresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <h2 ref={ref} tabIndex={-1} className={styles.stepTitle}>
      {children}
    </h2>
  );
}

function StepLabel({ step }: { step: Step }) {
  const { t, format } = useI18n();
  return format(t.reserve.stepOf, { current: step, total: 3, name: t.reserve.steps[step - 1] ?? "" });
}

function QuantityStep({
  detail,
  initialQuantity,
  slot,
  focus,
}: {
  detail: OfferingDetailView;
  /** The quantity from the URL, or null when none was given. */
  initialQuantity: string | null;
  slot: string;
  focus: boolean;
}) {
  const { t, format } = useI18n();
  const go = useStepNavigation();
  const [quantity, setQuantity] = useState(initialQuantity ?? "1");
  const [submitted, setSubmitted] = useState(0);
  const quantityMessage = useQuantityMessage(detail);
  const issue = checkQuantity(Number(quantity), detail.offering, detail.availability);
  const error = submitted && issue ? quantityMessage(issue) : undefined;
  // Arriving with an invalid quantity in the URL (e.g. more than is now left) shows the error at once.
  const urlError = !submitted && initialQuantity !== null && issue ? quantityMessage(issue) : undefined;
  const shown = error ?? urlError;

  if (!detail.availability.reservable) return <Unavailable detail={detail} />;

  return (
    <form
      noValidate
      className={styles.step}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted((n) => n + 1);
        if (issue) {
          document.getElementById("reserve-qty")?.focus();
          return;
        }
        go(2, Number(quantity), slot);
      }}
    >
      <StepHeading focus={focus}>
        <StepLabel step={1} />
      </StepHeading>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.reserve.quantityLegend}</legend>
        <QuantityStepper
          id="reserve-qty"
          value={quantity}
          min={1}
          max={detail.availability.maxQuantity}
          onChange={setQuantity}
          decreaseLabel={t.detail.decrease}
          increaseLabel={t.detail.increase}
          describedBy={`reserve-qty-hint${shown ? " reserve-qty-error" : ""}`}
          invalid={Boolean(shown)}
        />
        <p id="reserve-qty-hint" className={styles.hint}>
          {format(t.detail.maxPerReservation, { count: detail.availability.maxQuantity })}
        </p>
        <FieldError id="reserve-qty" error={shown} />
      </fieldset>
      <div className={styles.actions}>
        <button type="submit" className={buttonClass({ size: "lg" })}>
          {t.common.continue}
          <Icon name="arrowRight" />
        </button>
      </div>
    </form>
  );
}

function SlotStep({
  detail,
  quantity,
  initialSlot,
  focus,
}: {
  detail: OfferingDetailView;
  quantity: number;
  initialSlot: string;
  focus: boolean;
}) {
  const { t, locale, format } = useI18n();
  const go = useStepNavigation();
  const [slot, setSlot] = useState(detail.slots.includes(initialSlot) ? initialSlot : "");
  const [error, setError] = useState<string | undefined>(
    initialSlot && !detail.slots.includes(initialSlot) ? t.reserve.errorSlot : undefined,
  );

  if (!detail.availability.reservable) return <Unavailable detail={detail} />;

  return (
    <form
      noValidate
      className={styles.step}
      onSubmit={(event) => {
        event.preventDefault();
        if (!slot) {
          setError(t.reserve.slotRequired);
          document.getElementById("reserve-slot")?.focus();
          return;
        }
        go(3, quantity, slot);
      }}
    >
      <StepHeading focus={focus}>
        <StepLabel step={2} />
      </StepHeading>
      <fieldset className={styles.fieldset} aria-describedby={`reserve-slot-hint${error ? " reserve-slot-error" : ""}`}>
        <legend className={styles.legend}>{t.reserve.slotLegend}</legend>
        <p id="reserve-slot-hint" className={styles.hint}>
          {format(t.reserve.slotHint, { start: detail.offering.pickupWindow.start, end: detail.offering.pickupWindow.end })}
        </p>
        <div className={styles.slots}>
          {detail.slots.map((value, index) => (
            <label key={value} className={styles.slot}>
              <input
                id={index === 0 ? "reserve-slot" : undefined}
                type="radio"
                name="slot"
                value={value}
                checked={slot === value}
                onChange={() => {
                  setSlot(value);
                  setError(undefined);
                }}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
        <FieldError id="reserve-slot" error={error} />
      </fieldset>
      <p className={styles.place}>
        <Icon name="pin" />
        <span>
          <strong>{t.reserve.pickupPlace}:</strong>{" "}
          {format(t.detail.pickupWhere, { area: pickText(detail.pickupArea, locale), neighborhood: detail.neighborhoodName })}
        </span>
      </p>
      <div className={styles.actions}>
        <button type="submit" className={buttonClass({ size: "lg" })}>
          {t.common.continue}
          <Icon name="arrowRight" />
        </button>
        <button type="button" className={buttonClass({ variant: "quiet" })} onClick={() => go(1, quantity, slot)}>
          {t.reserve.changeQuantity}
        </button>
      </div>
    </form>
  );
}

function ReviewStep({
  detail,
  quantity,
  slot,
  focus,
}: {
  detail: OfferingDetailView;
  quantity: number;
  slot: string;
  focus: boolean;
}) {
  const { t, locale, format, href, date, money } = useI18n();
  const { repositories } = useDemo();
  const router = useRouter();
  const go = useStepNavigation();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CreateReservationError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const total = multiplyMoney(detail.offering.price, quantity);

  async function confirm() {
    // Guard against double clicks and repeated Enter presses while the first submit runs.
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);

    const input = { offeringId: detail.offering.id, quantity, slot };
    let result = await repositories.reservations.create(
      { ...input, idempotencyKey: attemptKey(input.offeringId, quantity, slot) },
      new Date(),
    );
    // The same choice was reserved before and has since been cancelled: this is a new attempt.
    if (result.ok && !holdsCapacity(result.value.status)) {
      forgetAttempt(input.offeringId);
      result = await repositories.reservations.create(
        { ...input, idempotencyKey: attemptKey(input.offeringId, quantity, slot) },
        new Date(),
      );
    }

    if (result.ok) {
      // Stay busy until the confirmation page replaces this one.
      router.replace(href(`/reservations/${result.value.id}?new=1`));
      return;
    }
    submitting.current = false;
    setBusy(false);
    setError(result.error);
    setAttempt((n) => n + 1);
  }

  const errorMessage =
    error === "not_reservable"
      ? t.reserve.errorUnavailable
      : error === "insufficient_capacity"
        ? t.reserve.errorCapacity
        : error === "invalid_slot"
          ? t.reserve.errorSlot
          : error === "offering_not_found"
            ? t.reserve.errorNotFound
            : error
              ? t.reserve.errorGeneric
              : null;

  return (
    <div className={styles.step}>
      <StepHeading focus={focus}>
        <StepLabel step={3} />
      </StepHeading>
      {errorMessage ? (
        <>
          <ErrorSummary errors={[{ fieldId: "reserve-confirm", message: errorMessage }]} focusKey={attempt} />
          <div className={styles.actions}>
            {error === "insufficient_capacity" || error === "invalid_quantity" ? (
              <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => go(1, quantity, slot)}>
                {t.reserve.recoverQuantity}
              </button>
            ) : error === "invalid_slot" ? (
              <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => go(2, quantity, slot)}>
                {t.reserve.changeSlot}
              </button>
            ) : (
              <Link href={href("/meals")} className={buttonClass({ variant: "secondary" })}>
                {t.reserve.recoverMeals}
              </Link>
            )}
          </div>
        </>
      ) : null}

      <h3 className={styles.reviewTitle}>{t.reserve.reviewTitle}</h3>
      <dl className={styles.review}>
        <div>
          <dt>{t.reserve.meal}</dt>
          <dd>{pickText(detail.meal.title, locale)}</dd>
        </div>
        <div>
          <dt>{t.reserve.cook}</dt>
          <dd>
            {detail.cook.displayName} <span className={styles.hint}>({t.common.fictionalProfile})</span>
          </dd>
        </div>
        <div>
          <dt>{t.reserve.when}</dt>
          <dd>
            {format(t.reserve.whenValue, { date: date(detail.offering.pickupDate), slot })}{" "}
            <button type="button" className={styles.inlineEdit} onClick={() => go(2, quantity, slot)}>
              {t.reserve.changeSlot}
            </button>
          </dd>
        </div>
        <div>
          <dt>{t.reserve.where}</dt>
          <dd>
            {format(t.detail.pickupWhere, { area: pickText(detail.pickupArea, locale), neighborhood: detail.neighborhoodName })}
          </dd>
        </div>
        <div>
          <dt>{t.detail.quantity}</dt>
          <dd>
            {quantity}{" "}
            <button type="button" className={styles.inlineEdit} onClick={() => go(1, quantity, slot)}>
              {t.reserve.changeQuantity}
            </button>
          </dd>
        </div>
        <div>
          <dt>{t.reserve.unitPrice}</dt>
          <dd>{money(detail.offering.price)}</dd>
        </div>
        <div className={styles.totalRow}>
          <dt>{t.reserve.total}</dt>
          <dd>{money(total)}</dd>
        </div>
      </dl>
      <p className={styles.noPayment}>
        <Icon name="check" />
        {t.reserve.noPayment}
      </p>
      <div className={styles.actions}>
        <button
          id="reserve-confirm"
          type="button"
          className={buttonClass({ size: "lg" })}
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={confirm}
        >
          {busy ? t.reserve.confirming : t.reserve.confirm}
        </button>
      </div>
    </div>
  );
}

function Unavailable({ detail }: { detail: OfferingDetailView }) {
  const { t, href } = useI18n();
  return (
    <div className={styles.step}>
      <Notice tone="warning" role="alert" title={t.detail.closedTitle}>
        {t.reserve.errorUnavailable}
      </Notice>
      <div className={styles.actions}>
        <Link href={href(`/meals/${detail.offering.id}`)} className={buttonClass({ variant: "secondary" })}>
          {t.detail.otherDates}
        </Link>
        <Link href={href("/meals")} className={buttonClass({ variant: "quiet" })}>
          {t.reserve.recoverMeals}
        </Link>
      </div>
    </div>
  );
}

function Summary({ detail, quantity, slot }: { detail: OfferingDetailView; quantity: number | null; slot: string | null }) {
  const { t, locale, date, money, format } = useI18n();
  const title = pickText(detail.meal.title, locale);
  return (
    <aside className={styles.summary} aria-label={title}>
      <MealImage image={detail.meal.image} title={title} sizes="(min-width: 860px) 320px, 100vw" className={styles.summaryImage} />
      <div className={styles.summaryBody}>
        <p className={styles.summaryTitle}>{title}</p>
        <p className={styles.hint}>
          {format(t.detail.pickupWhen, {
            date: date(detail.offering.pickupDate),
            start: detail.offering.pickupWindow.start,
            end: detail.offering.pickupWindow.end,
          })}
        </p>
        <p>
          {money(detail.offering.price)} {t.common.perPortion}
        </p>
        {quantity ? (
          <p>
            <strong>
              {t.detail.quantity}: {quantity}
              {slot ? ` · ${slot}` : ""}
            </strong>
          </p>
        ) : null}
      </div>
    </aside>
  );
}
