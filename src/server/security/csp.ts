/**
 * Builds the Content-Security-Policy for one request. Next.js reads the nonce from this header and
 * applies it to its own scripts, so pages must render dynamically (see src/app/[locale]/layout.tsx).
 */
export function buildContentSecurityPolicy({
  nonce,
  isDev,
  upgradeInsecure,
}: {
  nonce: string;
  isDev: boolean;
  upgradeInsecure: boolean;
}): string {
  const directives: string[] = [
    "default-src 'self'",
    // React uses eval only in development, for debugging information.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // next/image writes small inline style attributes (e.g. color: transparent). Style attributes
    // cannot run script; <style> elements still need the nonce above.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (upgradeInsecure) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
