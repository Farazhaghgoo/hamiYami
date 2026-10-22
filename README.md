# HamiYami — prelaunch landing page

A responsive landing page that explains HamiYami, collects interest from customers and cooks, and is honest about what is still being built. Plain HTML, CSS and JavaScript with no build step and no front-end dependencies.

> **Status: preview, not launch-ready.** The page works end to end locally, but it must not be published as a live signup page until the blockers below are resolved.

## Launch blockers

| # | Blocker | Where | What's needed |
|---|---|---|---|
| 1 | **Signup collection isn't connected.** The form validates input, then tells visitors that nothing was sent. It never shows a success message without a real `{ "ok": true }` from a backend. | `public/assets/js/config.js` → `formEndpoint` | A deployed backend (see [Connecting the signup form](#connecting-the-signup-form)). |
| 2 | **No Privacy Notice.** `public/privacy.html` is a placeholder that says the notice isn't published yet. | `public/privacy.html` | A real notice written for the actual operator, processors and retention practices (see [Privacy Notice](#privacy-notice)). |
| 3 | **Photo licences need confirming.** The photos are Unsplash stock (see [Images](#images)). | `public/assets/images/` | Confirm that the Unsplash License suits your use, or replace the photos with your own. |
| 4 | **No production domain.** Canonical and `og:url`/`og:image` tags are commented out, and `noindex` is set. | `public/index.html` `<head>` | Add the real domain to those tags, then remove `<meta name="robots" content="noindex">` from `index.html` and `privacy.html`. |
| 5 | **Marketing consent decision.** An optional, unticked "news beyond the pilot" checkbox is included and its wording/version is stored. | `public/index.html` (`#su-marketing`) | Keep it only if you'll actually send such updates, with an unsubscribe route. Otherwise delete the `field-check` block. |

**Before publishing, also review:** the food-safety section (`#food-safety`) describes processes that are only *proposed*. Have it read by a qualified food-safety professional, and update it whenever a process is confirmed, changed or dropped.

**Not blockers, but worth deciding:**
- No partners/investors link is shown. One appears in the footer once `partnersContactUrl` is set to a real destination.
- The page is in English. For an Italian pilot, consider an Italian version.

## Run it locally

Requires Node.js 18+.

```bash
npm run dev
```

Opens a preview at http://localhost:4321. The dev server also offers a **development-only** `POST /api/signup` that stores submissions in `.data/signups.local.json` (git-ignored). To try the full form flow locally, set `formEndpoint: "/api/signup"` in `config.js` temporarily.

```bash
npm test
```

Runs the backend validation and storage tests (`tests/signup.test.js`).

## Project layout

```
public/                    ← the website (deploy this folder)
  index.html               all page copy and structure
  privacy.html             Privacy Notice placeholder (blocker 2)
  favicon.svg, favicon-32.png, apple-touch-icon.png
  assets/brand/            logo files used by the site (see Brand assets)
  assets/css/styles.css    design tokens (:root) and all styles
  assets/js/config.js      public settings: form endpoint, partners link, analytics hook
  assets/js/main.js        navigation, example dialogs, FAQ, form logic
  assets/fonts/            self-hosted Fraunces + Figtree (SIL Open Font License)
  assets/images/           optimised WebP photos + og-image.png
brand-source/              original logo files as supplied (not deployed)
api/signup.js              serverless signup function (Vercel)
lib/signup.js              validation, spam checks, Supabase storage (shared)
supabase/schema.sql        table for signups
scripts/dev-server.mjs     local preview server
scripts/og-image.html      source for the social sharing image
tests/signup.test.js
vercel.json                output folder + security headers
```

## Updating copy

All text lives in `public/index.html`, grouped by section comments (`Hero`, `Illustrative meal preview`, `How it works`, and so on). Edit the text between the tags and leave the attributes alone.

Keep these when editing:
- The "Illustrative meals and prices. These are not live listings." notice stays above the meal cards. The example dialogs say "demonstration only" and contain no order or payment controls.
- The food-safety section must stay future-facing. See [Food-safety section](#food-safety-section).
- Don't add ratings, testimonials, counts, partner logos, a launch city or date, or legal/licensing claims unless they are real and you hold the evidence.
- The form's success messages are in the two `data-success` blocks. Submit-button labels are in `data-label-customer` and `data-label-cook` on the submit button.
- Validation messages are in `main.js` and `lib/signup.js`. Keep the two in sync.

### Food-safety section

"Good food starts with trust." (`#food-safety`) sits after "How it works" and replaced the earlier trust section, so there is one trust section, not two. It contains four numbered cards, an accordion ("How we plan to put this into practice"), and a closing panel with both signup buttons.

HamiYami is prelaunch, so every statement here describes a plan. When editing it:
- Keep future-facing wording ("we plan to", "our proposed", "will"). Don't describe checks, records or recalls as already happening.
- Never use: "100% safe", "guaranteed hygiene", "government-approved kitchens", "certified by HamiYami", "every meal inspected", "AI-verified food safety".
- Don't claim that photos prove a meal is safe, or that provider agreements remove HamiYami's responsibility.
- Don't add professional partners, insurance, approvals, inspection scores, pilot results, targets or testimonials until they are real and documented.
- Keep the closing note: "These are planned processes, subject to professional review and pilot validation. No verification process can eliminate every food-safety risk."
- Once a process is actually running, update its wording, and the matching FAQ answer ("How will cooks be verified?"), at the same time.

The "Proposed workflow" strip (Prepare → Record checks → Label the batch → Confirm collection) is a plain ordered list. Its arrows are drawn in CSS, so screen readers hear just the four steps.

Colours, fonts, spacing and radii are CSS variables at the top of `styles.css`. Text colour pairs were chosen to meet WCAG AA. Re-check contrast if you change them.

## Brand assets

The logos were supplied by HamiYami. The originals are in `brand-source/`. For the site, they were traced into SVG so they stay sharp at any size and stay small:

| File | Used for |
|---|---|
| `public/assets/brand/hamiyami-wordmark.svg` | Header logo, Privacy Notice header, sharing image (red, `#BA2E1C` sampled from the supplied artwork) |
| `public/assets/brand/hamiyami-wordmark-light.svg` | Footer logo on the dark background (cream `#FFF8EF`) |
| `public/favicon.svg`, `public/assets/brand/hamiyami-icon.svg` | Browser tab icon (the "HY" icon) |
| `public/favicon-32.png` | PNG fallback for browsers without SVG favicons |
| `public/apple-touch-icon.png` | iOS home-screen icon (180×180, full-bleed red so iOS can round the corners) |
| `public/assets/brand/hamiyami-icon-512.png` | Spare high-resolution icon |

The traces were checked side by side against the originals, but they are close copies, not the master artwork. If the designer has vector originals (SVG, AI or PDF), drop them in with the same file names. The header size is set by `.wordmark img { height }` in `styles.css`. After changing the wordmark, run `npm run og-image` to refresh the sharing image.

## Images

| Slot | Files (in `public/assets/images/`) | Source (Unsplash License) |
|---|---|---|
| Hero | `hero-640/960/1280.webp` (4:5) | [Lorenzo Tomassetti](https://unsplash.com/photos/a-person-using-a-small-tool-to-cut-dough-HnFlyM638mc) |
| Lasagna card | `lasagna-480/800.webp` (4:3) | [Clare Andrews](https://unsplash.com/photos/freshly-baked-lasagna-with-a-basil-leaf-garnish-rBhXooUziZc) |
| Curry card | `curry-480/800.webp` (4:3) | [Weronika Krztoń](https://unsplash.com/photos/a-bowl-of-food-on-a-table-next-to-a-lemon-HJPd-_0bP-o) |
| Stuffed vegetables card | `stuffed-480/800.webp` (4:3) | [Compagnons](https://unsplash.com/photos/stainless-steel-fork-on-red-sauce-OWVF8-s-RYs) |
| Cook section | `cook-640/960.webp` (4:5) | [Nadya Spetnitskaya](https://unsplash.com/photos/person-making-dough-beside-brown-wooden-rolling-pin-tOYiQxF9-Ys) |
| Social sharing | `og-image.png` (1200×630) | Generated from `scripts/og-image.html` using the hero photo |

Each photo page showed the free Unsplash License and the photo wasn't marked Unsplash+. The Unsplash License allows commercial use without attribution. Model releases aren't guaranteed, so hands-only shots were chosen, and none of the photos shows a face, text or a logo. They are generic stock and are **not** presented as HamiYami cooks, customers or dishes.

To replace a photo:
1. Export WebP files at the same pixel sizes and aspect ratio, and overwrite the files.
2. If the proportions change, update the `width`/`height` attributes in `index.html`.
3. Rewrite the `alt` text to describe the new photo.
4. If the hero changes, run `npm run og-image` to regenerate the sharing image.

If the dish in a new photo differs, update that card's description and the example ingredients and allergens in its dialog to match.

## Connecting the signup form

The browser sends a JSON `POST` to `formEndpoint` and shows success **only** if the response is 2xx with `{ "ok": true }`. Any other response keeps the visitor's answers and shows an error. A `422` reply with `{ "ok": false, "errors": { "<field>": "message" } }` shows those messages inline.

### Option A — bundled function + Supabase (ready to deploy)

1. **Database.** Create a Supabase project. An EU region suits an Italian pilot. Run `supabase/schema.sql` in the SQL editor. The table has Row Level Security enabled and no policies, so the public key can't read or write it.
2. **Hosting.** Deploy this repository to Vercel. `vercel.json` serves `public/`, and `api/signup.js` becomes `/api/signup`.
3. **Environment variables** (Vercel → Project → Settings → Environment Variables; **never** in `config.js`):
   - `SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `SUPABASE_SECRET_KEY` — a secret key (`sb_secret_…`) or the legacy `service_role` key
   - `ALLOWED_ORIGINS` (recommended) — e.g. `https://<your-domain>`
4. **Turn it on.** Set `formEndpoint: "/api/signup"` in `public/assets/js/config.js`.
5. **Rate-limit** `/api/signup`, e.g. with a Vercel Firewall rule. Add a CAPTCHA such as Cloudflare Turnstile if spam shows up.
6. Submit a real test signup, check the row in Supabase, then delete it.

Only do step 4 once blocker 2 (Privacy Notice) is resolved.

### Option B — another backend or form service

Any endpoint that accepts this JSON and replies `{ "ok": true }` works. If a hosted form service holds the data, it becomes a processor and must be named in the Privacy Notice.

```json
{
  "audience": "customer | cook",
  "email": "…",
  "city": "…",
  "neighborhood": "… (may be empty)",
  "mealsWanted": "… (customers only, may be empty)",
  "dishes": "… (cooks only, required)",
  "foodBusinessExperience": "operates_food_business | exploring | other_or_prefer_not | \"\" (cooks only)",
  "marketingConsent": { "granted": true, "text": "exact checkbox wording", "version": "marketing-2026-10-v1" },
  "hy_check": "spam trap — must be empty",
  "elapsedMs": 12345
}
```

### What the bundled backend stores

`audience`, `email` (lower-cased), `city`, optional `neighborhood`, audience-specific `answers`, `created_at` (first signup) and `updated_at` (latest submission). If marketing consent was given, it also stores the exact wording, its version and the time of consent. Nothing else is stored: no address, ID, payment or other sensitive data.

- **Repeated signups** update the existing record for that email and audience, so there are no duplicates. The same person can register as both customer and cook. An unticked marketing box on a later submission doesn't erase an earlier opt-in. Withdrawals should go through your unsubscribe route.
- **Spam protection:** a hidden trap field, a minimum fill time, server-side validation and length limits, and an optional origin allow-list. Rejected submissions get an error, never a fake success.
- **No emails are sent.** Emails aren't verified either, so someone could submit another person's address. Add a confirmation email (double opt-in) once an email provider is chosen.
- **Logs** record only status codes and audience, never submitted values.
- When you change the consent wording, bump `data-consent-version` on the checkbox.

## Privacy Notice

`public/privacy.html` must be replaced with a real notice before signups are collected. Based on GDPR Art. 13, it needs at least:
- the controller's identity and contact details (the legal entity running HamiYami), and the DPO's contact if one is appointed
- each purpose and its legal basis: managing waitlist and cook interest, and (if kept) marketing updates based on consent
- the categories of data collected (listed above)
- recipients and processors: hosting (e.g. Vercel), database (e.g. Supabase), any email or analytics provider, and any transfers outside the EU with their safeguards
- how long the data is kept, or the criteria used to decide
- data-subject rights (access, rectification, erasure, restriction, objection, portability, withdrawing consent) and the right to complain to the Garante per la protezione dei dati personali
- how to unsubscribe, and how to ask for deletion

These details aren't known yet, so none have been invented. Have the final text reviewed by someone qualified.

**Current technology footprint** (useful for the notice and for consent decisions): the page sets no cookies and uses no local storage. Fonts and images are self-hosted, so loading the page makes no third-party requests. There are no analytics or advertising trackers, so no cookie banner is needed for the page as built. Revisit this if you add any.

## Analytics

Nothing is installed. To connect an approved tool, set `onAnalyticsEvent` in `config.js`. The page emits:

| Event | Props |
|---|---|
| `cta_click` | `audience` (`customer`/`cook`), `location` (`header`, `nav`, `menu`, `hero`, `food-safety`, `cooks-section`, `final-cta`, `example-dialog`) |
| `form_start` | `audience` — first input in the form, once per audience |
| `signup_complete` | `audience` — only after a confirmed successful submission |
| `example_meal_view` | `meal` (`lasagna`, `curry`, `stuffed-vegetables`) |

Emails and free-text answers are never passed to analytics, and personal data never goes in URLs. Check whether your chosen tool needs consent before you enable it.

## What was verified

- **Layouts:** 320, 375, 960, 1024, 1280, 1366 and 1600 px wide with no horizontal scrolling. The hero headline holds "Homemade food. / Made nearby." on desktop.
- **Navigation:** every nav link lands with its heading clear of the sticky header. The footer links use the same anchors. Every "Join the waitlist" / "I'd like to cook" / "Find meals near me" / "Register interest as a cook" button opens the form with the right audience selected and moves focus to the form heading.
- **Mobile menu:** opens and closes, closes on link click and Escape (focus returns to the toggle), and closes when focus or clicks leave it.
- **Example dialogs:** native modal, focus moves in and returns to the "View example" button, Escape and backdrop close it, and the only controls are Close and Join the waitlist.
- **FAQ:** a button-based accordion with `aria-expanded`. Answers start visible in the HTML and are collapsed by the script, so they stay readable without JavaScript (by design; not tested with JavaScript off).
- **Real keyboard and mouse input:** Tab moves focus out of the open menu and closes it, and clicking the backdrop closes a dialog and returns focus to its button.
- **Form:** required/format/length errors show inline with `aria-invalid` and `aria-describedby`, and focus moves to the first error. Errors clear as fields are fixed.
- **Form, no backend:** shows the "not connected" notice and sends nothing.
- **Form, local backend:** customer and cook success messages appear only after `{ ok: true }`. Double clicks send one request. Repeat signups update one record.
- **Form failures:** a 404, a non-JSON 200, a network failure and server field errors each show an error and keep the answers.
- **Accessibility basics:** skip link first in tab order, one `h1` with logical heading levels, alt text on every image, visible focus states, persistent labels, reduced-motion support, and no autoplaying media.
- **Content:** no fake claims, contacts, ratings or launch details, and no order or payment controls.
- **Food-safety section:**
  - Placed after "How it works", with no duplicate trust section left.
  - 2×2 cards from 760px and stacked on phones; no overflow at 375 or 768px.
  - The accordion works with mouse, Enter and Space, with correct `aria-expanded`/`aria-controls` and a visible focus ring.
  - "Join the waitlist" and "Register interest as a cook" open the form with customer and cook selected respectively.
  - A full-page text scan found none of the banned phrases and no present-tense safety claims.
