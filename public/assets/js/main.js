/*
 * HamiYami landing page behaviour. No dependencies.
 * Settings come from config.js (window.HAMIYAMI_CONFIG).
 */
(function () {
  "use strict";

  const getConfig = () => window.HAMIYAMI_CONFIG || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Same rules as the server (lib/signup.js). Keep them in sync.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  const LIMITS = { email: 254, city: 80, neighborhood: 80, mealsWanted: 300, dishes: 300 };
  const REQUEST_TIMEOUT_MS = 15000;

  /* ---------- Analytics (does nothing unless config.onAnalyticsEvent is set) ---------- */

  // Only send audience, placement and meal ids here: never emails or free-text answers.
  function track(name, props) {
    const handler = getConfig().onAnalyticsEvent;
    if (typeof handler !== "function") return;
    try {
      handler(name, props || {});
    } catch (_) {
      // Analytics must never break the page.
    }
  }

  document.addEventListener("click", (event) => {
    const cta = event.target.closest("[data-cta]");
    if (cta) track("cta_click", { audience: cta.dataset.cta, location: cta.dataset.ctaLocation || "" });
  });

  /* ---------- Footer details ---------- */

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const partnersUrl = String(getConfig().partnersContactUrl || "").trim();
  if (partnersUrl) {
    const item = document.querySelector("[data-partners-item]");
    const link = document.querySelector("[data-partners-link]");
    if (item && link) {
      link.href = partnersUrl;
      item.hidden = false;
    }
  }

  /* ---------- Mobile navigation ---------- */

  const nav = document.querySelector(".site-nav");
  const navToggle = nav && nav.querySelector(".nav-toggle");

  function setMenu(open, returnFocus) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    if (!open && returnFocus) navToggle.focus();
  }

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });
    nav.querySelectorAll(".nav-menu a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
    nav.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !nav.contains(event.relatedTarget)) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) setMenu(false, true);
    });
    document.addEventListener("click", (event) => {
      if (nav.classList.contains("is-open") && !nav.contains(event.target)) setMenu(false);
    });
    window.matchMedia("(min-width: 860px)").addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  }

  /* ---------- Example meal dialogs (demonstration only) ---------- */

  let dialogTrigger = null;

  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.example);
      if (!dialog || typeof dialog.showModal !== "function") return;
      dialogTrigger = button;
      dialog.showModal();
      track("example_meal_view", { meal: button.dataset.exampleName || button.dataset.example });
    });
  });

  document.querySelectorAll(".example-dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      // A click on the dialog element itself is a click on the backdrop.
      if (event.target === dialog || event.target.closest("[data-close-dialog]")) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.dataset.keepFocus) {
        delete dialog.dataset.keepFocus;
      } else if (dialogTrigger) {
        dialogTrigger.focus();
      }
      dialogTrigger = null;
    });
  });

  /* ---------- FAQ accordion ---------- */

  document.querySelectorAll("[data-accordion] .accordion-trigger").forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    const setOpen = (open) => {
      button.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    };
    setOpen(false);
    button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  });

  /* ---------- Signup form ---------- */

  const signup = initSignup(document.getElementById("signup-form"));

  // Every "Join the waitlist" / "I'd like to cook" button leads to the form with the right audience selected.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-audience-link]");
    if (!link || !signup) return;
    event.preventDefault();

    const openDialog = link.closest("dialog[open]");
    if (openDialog) {
      openDialog.dataset.keepFocus = "true";
      openDialog.close();
    }
    setMenu(false);
    signup.prepare(link.dataset.audienceLink);

    const section = document.getElementById("signup");
    const title = document.getElementById("signup-title");
    section.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    if (title) title.focus({ preventScroll: true });
  });

  function initSignup(form) {
    if (!form) return null;

    const card = form.closest(".signup-card");
    const notice = card.querySelector("[data-connection-notice]");
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("[data-submit]");
    const successPanels = card.querySelectorAll("[data-success]");
    const startedAt = Date.now();
    const startedAudiences = new Set();
    let submitting = false;

    const endpoint = () => String(getConfig().formEndpoint || "").trim();
    const audience = () => (form.elements.audience.value === "cook" ? "cook" : "customer");
    const value = (name) => (form.elements[name] ? String(form.elements[name].value).trim() : "");

    function refreshConnectionNotice() {
      if (notice) notice.hidden = Boolean(endpoint());
    }

    function submitLabel() {
      return audience() === "cook" ? submit.dataset.labelCook : submit.dataset.labelCustomer;
    }

    function setAudience(next) {
      const selected = next === "cook" ? "cook" : "customer";
      form.querySelectorAll('input[name="audience"]').forEach((radio) => {
        radio.checked = radio.value === selected;
      });
      form.querySelectorAll("[data-audience-only]").forEach((group) => {
        const active = group.dataset.audienceOnly === selected;
        group.hidden = !active;
        group.querySelectorAll("input, textarea, select").forEach((control) => {
          control.disabled = !active;
          if (!active) clearFieldError(control);
        });
      });
      if (!submitting) submit.textContent = submitLabel();
    }

    function errorElement(control) {
      return control.id ? document.getElementById(control.id + "-error") : null;
    }

    function setFieldError(control, message) {
      control.setAttribute("aria-invalid", "true");
      const el = errorElement(control);
      if (el) {
        el.textContent = message;
        el.hidden = false;
      }
    }

    function clearFieldError(control) {
      control.removeAttribute("aria-invalid");
      const el = errorElement(control);
      if (el) {
        el.textContent = "";
        el.hidden = true;
      }
    }

    function tooLong(limit) {
      return "Please keep this under " + limit + " characters.";
    }

    // Returns [control, message] pairs, in form order.
    function validate() {
      const problems = [];
      const fields = form.elements;

      const email = value("email");
      if (!email) problems.push([fields.email, "Enter your email address."]);
      else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
        problems.push([fields.email, "Enter a valid email address, like name@example.com."]);
      }

      const city = value("city");
      if (!city) problems.push([fields.city, "Enter your city or town in Italy."]);
      else if (city.length > LIMITS.city) problems.push([fields.city, tooLong(LIMITS.city)]);

      if (value("neighborhood").length > LIMITS.neighborhood) {
        problems.push([fields.neighborhood, tooLong(LIMITS.neighborhood)]);
      }

      if (audience() === "customer") {
        if (value("mealsWanted").length > LIMITS.mealsWanted) {
          problems.push([fields.mealsWanted, tooLong(LIMITS.mealsWanted)]);
        }
      } else {
        const dishes = value("dishes");
        if (!dishes) problems.push([fields.dishes, "Tell us what you’d like to cook."]);
        else if (dishes.length > LIMITS.dishes) problems.push([fields.dishes, tooLong(LIMITS.dishes)]);
      }

      return problems;
    }

    function showStatus(message, tone) {
      status.textContent = message;
      status.dataset.tone = tone;
    }

    function clearStatus() {
      status.textContent = "";
      delete status.dataset.tone;
    }

    function setBusy(busy) {
      submitting = busy;
      // aria-disabled (not disabled) keeps keyboard focus on the button while sending.
      submit.setAttribute("aria-disabled", String(busy));
      form.setAttribute("aria-busy", String(busy));
      submit.textContent = busy ? "Sending…" : submitLabel();
    }

    function buildPayload() {
      const selected = audience();
      const payload = {
        audience: selected,
        email: value("email"),
        city: value("city"),
        neighborhood: value("neighborhood"),
        hy_check: form.elements.hy_check ? form.elements.hy_check.value : "",
        elapsedMs: Date.now() - startedAt,
      };
      if (selected === "customer") {
        payload.mealsWanted = value("mealsWanted");
      } else {
        const experience = form.querySelector('input[name="foodBusinessExperience"]:checked');
        payload.dishes = value("dishes");
        payload.foodBusinessExperience = experience ? experience.value : "";
      }
      const consent = form.elements.marketingConsent;
      if (consent) {
        const label = form.querySelector('label[for="' + consent.id + '"]');
        payload.marketingConsent = {
          granted: consent.checked,
          text: label ? label.textContent.replace(/\s+/g, " ").trim() : "",
          version: consent.dataset.consentVersion || "",
        };
      }
      return payload;
    }

    function postJson(url, payload) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
    }

    async function readJson(response) {
      try {
        return await response.json();
      } catch (_) {
        return null;
      }
    }

    function showForm() {
      successPanels.forEach((panel) => {
        panel.hidden = true;
      });
      form.hidden = false;
      refreshConnectionNotice();
    }

    function showSuccess(selected) {
      track("signup_complete", { audience: selected });
      form.reset();
      setAudience(selected);
      clearStatus();
      form.hidden = true;
      if (notice) notice.hidden = true;
      const panel = card.querySelector('[data-success="' + selected + '"]');
      if (panel) {
        panel.hidden = false;
        panel.focus();
      }
    }

    form.addEventListener("change", (event) => {
      if (event.target.name === "audience") {
        clearStatus();
        setAudience(event.target.value);
      }
    });

    form.addEventListener("input", (event) => {
      const control = event.target;
      if (control.name === "audience") return;

      const selected = audience();
      if (!startedAudiences.has(selected)) {
        startedAudiences.add(selected);
        track("form_start", { audience: selected });
      }

      // Once a field has been flagged, update its message as the person fixes it.
      if (control.getAttribute("aria-invalid") === "true") {
        const problem = validate().find(([c]) => c === control);
        if (problem) setFieldError(control, problem[1]);
        else clearFieldError(control);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting) return;

      clearStatus();
      form.querySelectorAll("[aria-invalid]").forEach(clearFieldError);

      const problems = validate();
      if (problems.length) {
        problems.forEach(([control, message]) => setFieldError(control, message));
        showStatus(
          problems.length === 1
            ? "Please correct the highlighted field."
            : "Please correct the " + problems.length + " highlighted fields.",
          "error"
        );
        problems[0][0].focus();
        return;
      }

      refreshConnectionNotice();
      const url = endpoint();
      if (!url) {
        // No backend configured: never pretend the signup worked.
        showStatus(
          "Signup collection isn’t connected yet, so your details were not sent or saved. Please check back soon.",
          "warning"
        );
        return;
      }

      const selected = audience();
      setBusy(true);
      try {
        const response = await postJson(url, buildPayload());
        const data = await readJson(response);

        if (response.ok && data && data.ok === true) {
          setBusy(false);
          showSuccess(selected);
          return;
        }

        const fieldErrors = data && data.errors && typeof data.errors === "object" ? data.errors : null;
        const flagged = fieldErrors
          ? Object.keys(fieldErrors).filter((name) => form.elements[name] && !form.elements[name].disabled)
          : [];

        if (flagged.length) {
          flagged.forEach((name) => setFieldError(form.elements[name], String(fieldErrors[name])));
          showStatus("Please correct the highlighted fields and try again.", "error");
          form.elements[flagged[0]].focus();
        } else if (response.status === 429) {
          showStatus("Too many attempts in a short time. Please wait a minute and try again.", "error");
        } else {
          showStatus(
            "Sorry, we couldn’t save your details just now. Your answers are still here, so please try again in a moment.",
            "error"
          );
        }
      } catch (_) {
        showStatus(
          "We couldn’t reach our signup service. Check your connection and try again. Your answers are still here.",
          "error"
        );
      } finally {
        if (submitting) setBusy(false);
      }
    });

    card.querySelectorAll("[data-signup-again]").forEach((button) => {
      button.addEventListener("click", () => {
        showForm();
        const checked = form.querySelector('input[name="audience"]:checked');
        if (checked) checked.focus();
      });
    });

    setAudience(audience());
    refreshConnectionNotice();

    return {
      prepare(next) {
        if (form.hidden) showForm();
        clearStatus();
        setAudience(next);
      },
    };
  }
})();
