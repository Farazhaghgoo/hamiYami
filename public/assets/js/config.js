/*
 * HamiYami site settings.
 *
 * This file is public: everyone can read it in their browser.
 * Never put secret keys, passwords or signup records here.
 * See README.md for what each setting does and what must be in place before launch.
 */
window.HAMIYAMI_CONFIG = {
  // URL that receives signups as a JSON POST and answers { "ok": true } once the signup is stored.
  // Leave it empty until a real backend and an accurate Privacy Notice are in place:
  // the form then says that collection isn't connected yet and sends nothing.
  // With the bundled backend (api/signup.js) this becomes "/api/signup".
  formEndpoint: "",

  // Link for partners and investors. Set it only to a real, monitored destination,
  // e.g. "mailto:partners@<your-domain>" or a contact page URL. Empty hides the footer link.
  partnersContactUrl: "",

  // Optional analytics hook, called as onAnalyticsEvent(eventName, props).
  // Props never contain email addresses or free-text answers.
  // Events: cta_click, form_start, signup_complete, example_meal_view (see README.md).
  // Example for a privacy-friendly tool such as Plausible:
  //   onAnalyticsEvent: (name, props) => window.plausible && window.plausible(name, { props }),
  onAnalyticsEvent: null,
};
