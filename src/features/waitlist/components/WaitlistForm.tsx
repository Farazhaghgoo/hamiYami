"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ErrorSummary } from "@/shared/ui/ErrorSummary";
import { ChoiceGroup, FieldError, TextAreaField, TextField, formStyles } from "@/shared/ui/fields";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import { CURRENT_MARKETING_CONSENT, marketingConsentText } from "../consent";
import {
  EXPERIENCE_OPTIONS,
  WAITLIST_LIMITS,
  waitlistErrors,
  waitlistSubmissionSchema,
  type Audience,
  type WaitlistField,
} from "../schema";
import styles from "./WaitlistForm.module.css";

const REQUEST_TIMEOUT_MS = 15_000;

const FIELD_IDS: Record<WaitlistField, string> = {
  audience: "wl-audience",
  email: "wl-email",
  city: "wl-city",
  neighborhood: "wl-neighborhood",
  mealsWanted: "wl-meals",
  dishes: "wl-dishes",
  foodBusinessExperience: "wl-experience",
  marketingConsent: "wl-marketing",
};

interface Values {
  audience: Audience;
  email: string;
  city: string;
  neighborhood: string;
  mealsWanted: string;
  dishes: string;
  foodBusinessExperience: string;
  marketingConsent: boolean;
  hy_check: string;
}

type Status = { tone: "warning" | "error"; text: string } | null;

/**
 * Waitlist form. Validation uses the same schema as the server. When collection is not enabled on
 * the server, a valid submission says plainly that nothing was sent, and no request is made.
 * A success message appears only after the server confirms storage with { ok: true }.
 */
export function WaitlistForm({
  collectionEnabled,
  initialAudience = "customer",
}: {
  collectionEnabled: boolean;
  initialAudience?: Audience;
}) {
  const { t, locale, href, format } = useI18n();
  const blank: Values = {
    audience: initialAudience,
    email: "",
    city: "",
    neighborhood: "",
    mealsWanted: "",
    dishes: "",
    foodBusinessExperience: "",
    marketingConsent: false,
    hy_check: "",
  };
  const [values, setValues] = useState<Values>(blank);
  const [errors, setErrors] = useState<Partial<Record<WaitlistField, string>>>({});
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [succeeded, setSucceeded] = useState<Audience | null>(null);
  const startedAt = useRef(0);
  const sending = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (succeeded) successRef.current?.focus();
  }, [succeeded]);

  const v = t.validation;
  const messageFor = (code: string | undefined, field: WaitlistField): string | undefined => {
    if (!code) return undefined;
    const max = WAITLIST_LIMITS[field as keyof typeof WAITLIST_LIMITS];
    return (
      {
        email_required: v.emailRequired,
        email_invalid: v.invalidEmail,
        city_required: v.cityRequired,
        dishes_required: v.dishesRequired,
        too_long: format(v.tooLong, { max: max ?? 0 }),
        consent_outdated: v.consentOutdated,
        choose_audience: v.chooseAudience,
      }[code] ?? v.chooseOption
    );
  };
  const error = (field: WaitlistField) => messageFor(errors[field], field);

  function set<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setStatus(null);
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const labels: Record<WaitlistField, string> = {
    audience: t.waitlist.audienceLegend,
    email: t.waitlist.email,
    city: t.waitlist.city,
    neighborhood: t.waitlist.neighborhood,
    mealsWanted: t.waitlist.mealsWanted,
    dishes: t.waitlist.dishes,
    foodBusinessExperience: t.waitlist.experience,
    marketingConsent: t.waitlist.marketingLegend,
  };
  const summary = (Object.keys(FIELD_IDS) as WaitlistField[])
    .filter((field) => errors[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: `${labels[field]}: ${error(field)}` }));

  async function submit() {
    if (sending.current) return;
    setStatus(null);

    const payload = {
      audience: values.audience,
      email: values.email,
      city: values.city,
      neighborhood: values.neighborhood,
      marketingConsent: values.marketingConsent,
      consentVersion: CURRENT_MARKETING_CONSENT,
      locale,
      ...(values.audience === "customer"
        ? { mealsWanted: values.mealsWanted }
        : { dishes: values.dishes, foodBusinessExperience: values.foodBusinessExperience }),
    };
    const parsed = waitlistSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(waitlistErrors(parsed.error));
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});

    if (!collectionEnabled) {
      // Never pretend: nothing is sent while collection is switched off.
      setStatus({ tone: "warning", text: t.waitlist.notSent });
      return;
    }

    sending.current = true;
    setBusy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, hy_check: values.hy_check, elapsedMs: Date.now() - startedAt.current }),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      const body = data && typeof data === "object" ? (data as { ok?: unknown; errors?: unknown; error?: unknown }) : {};

      if (response.ok && body.ok === true) {
        setSucceeded(values.audience);
        setValues({ ...blank, audience: values.audience });
        return;
      }
      if (response.status === 422 && body.errors && typeof body.errors === "object") {
        setErrors(body.errors as Partial<Record<WaitlistField, string>>);
        setAttempt((n) => n + 1);
      } else if (response.status === 429) {
        setStatus({ tone: "error", text: t.waitlist.errorRateLimited });
      } else if (response.status === 400 || response.status === 403) {
        setStatus({ tone: "error", text: t.waitlist.errorRejected });
      } else {
        setStatus({ tone: "error", text: t.waitlist.errorGeneric });
      }
    } catch {
      setStatus({ tone: "error", text: t.waitlist.errorNetwork });
    } finally {
      clearTimeout(timer);
      sending.current = false;
      setBusy(false);
    }
  }

  if (succeeded) {
    return (
      <div ref={successRef} tabIndex={-1} className={styles.success} role="status">
        <span className={styles.successIcon}>
          <Icon name="check" />
        </span>
        <p>{succeeded === "cook" ? t.waitlist.successCook : t.waitlist.successCustomer}</p>
        <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setSucceeded(null)}>
          {t.waitlist.again}
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      noValidate
      aria-busy={busy || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!collectionEnabled ? (
        <Notice tone="warning" title={t.waitlist.disabledTitle}>
          {t.waitlist.disabledText}
        </Notice>
      ) : null}

      <ErrorSummary errors={summary} focusKey={attempt} />

      <ChoiceGroup
        id={FIELD_IDS.audience}
        legend={t.waitlist.audienceLegend}
        type="radio"
        name="audience"
        options={[
          { value: "customer", label: t.waitlist.audienceCustomer },
          { value: "cook", label: t.waitlist.audienceCook },
        ]}
        value={[values.audience]}
        onChange={([next]) => set("audience", next === "cook" ? "cook" : "customer")}
        error={error("audience")}
      />

      <p className={formStyles.hint}>{t.waitlist.requiredNote}</p>

      <TextField
        id={FIELD_IDS.email}
        label={t.waitlist.email}
        type="email"
        autoComplete="email"
        inputMode="email"
        maxLength={WAITLIST_LIMITS.email}
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        error={error("email")}
      />
      <div className={formStyles.row}>
        <TextField
          id={FIELD_IDS.city}
          label={t.waitlist.city}
          autoComplete="address-level2"
          maxLength={WAITLIST_LIMITS.city}
          value={values.city}
          onChange={(e) => set("city", e.target.value)}
          error={error("city")}
        />
        <TextField
          id={FIELD_IDS.neighborhood}
          label={t.waitlist.neighborhood}
          optionalLabel={t.common.optional}
          maxLength={WAITLIST_LIMITS.neighborhood}
          value={values.neighborhood}
          onChange={(e) => set("neighborhood", e.target.value)}
          error={error("neighborhood")}
        />
      </div>

      {values.audience === "customer" ? (
        <TextAreaField
          id={FIELD_IDS.mealsWanted}
          label={t.waitlist.mealsWanted}
          optionalLabel={t.common.optional}
          rows={3}
          maxLength={WAITLIST_LIMITS.mealsWanted}
          value={values.mealsWanted}
          onChange={(e) => set("mealsWanted", e.target.value)}
          error={error("mealsWanted")}
        />
      ) : (
        <>
          <TextAreaField
            id={FIELD_IDS.dishes}
            label={t.waitlist.dishes}
            rows={3}
            maxLength={WAITLIST_LIMITS.dishes}
            value={values.dishes}
            onChange={(e) => set("dishes", e.target.value)}
            error={error("dishes")}
          />
          <ChoiceGroup
            id={FIELD_IDS.foodBusinessExperience}
            legend={t.waitlist.experience}
            optionalLabel={t.common.optional}
            type="radio"
            name="foodBusinessExperience"
            options={EXPERIENCE_OPTIONS.map((option) => ({ value: option, label: t.waitlist.experienceOptions[option] }))}
            value={[values.foodBusinessExperience]}
            onChange={([next]) => set("foodBusinessExperience", next ?? "")}
            error={error("foodBusinessExperience")}
          />
        </>
      )}

      {/* Spam trap: hidden from people and assistive technology, often filled in by bots. */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor="wl-hy-check">{t.waitlist.trap}</label>
        <input
          id="wl-hy-check"
          name="hy_check"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.hy_check}
          onChange={(e) => set("hy_check", e.target.value)}
        />
      </div>

      <div className={styles.consent}>
        <input
          id={FIELD_IDS.marketingConsent}
          type="checkbox"
          checked={values.marketingConsent}
          onChange={(e) => set("marketingConsent", e.target.checked)}
          aria-describedby={errors.marketingConsent ? `${FIELD_IDS.marketingConsent}-error` : undefined}
        />
        <label htmlFor={FIELD_IDS.marketingConsent}>{marketingConsentText(locale)}</label>
      </div>
      <FieldError id={FIELD_IDS.marketingConsent} error={error("marketingConsent")} />

      <p className={styles.privacy}>
        {t.waitlist.privacy.split("{link}")[0]}
        <Link href={href("/privacy")}>{t.waitlist.privacyLink}</Link>
        {t.waitlist.privacy.split("{link}")[1]}
      </p>

      <div role="status" aria-live="polite" className={styles.status}>
        {status ? (
          <Notice tone={status.tone} role={status.tone === "error" ? "alert" : undefined}>
            {status.text}
          </Notice>
        ) : null}
      </div>

      <button
        type="submit"
        className={buttonClass({ size: "lg", block: true })}
        aria-disabled={busy || undefined}
      >
        {busy ? t.waitlist.sending : values.audience === "cook" ? t.waitlist.submitCook : t.waitlist.submitCustomer}
      </button>
      {values.audience === "cook" ? <p className={formStyles.hint}>{t.waitlist.notApproval}</p> : null}
    </form>
  );
}
