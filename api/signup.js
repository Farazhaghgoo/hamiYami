/*
 * POST /api/signup — serverless function (Vercel Node.js runtime).
 *
 * Required environment variables (set in the hosting dashboard, never in client code):
 *   SUPABASE_URL          e.g. https://<project-ref>.supabase.co
 *   SUPABASE_SECRET_KEY   a secret (sb_secret_…) or legacy service_role key
 * Optional:
 *   ALLOWED_ORIGINS       comma-separated origins allowed to post, e.g. https://<your-domain>
 */
import { handleSignup, parseOrigins, supabaseStore } from "../lib/signup.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const { SUPABASE_URL, SUPABASE_SECRET_KEY, ALLOWED_ORIGINS } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(503).json({ ok: false, error: "not_configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = null;
    }
  }

  const result = await handleSignup({
    body,
    origin: req.headers.origin,
    allowedOrigins: parseOrigins(ALLOWED_ORIGINS),
    store: supabaseStore({ url: SUPABASE_URL, key: SUPABASE_SECRET_KEY }),
  });
  return res.status(result.status).json(result.json);
}
