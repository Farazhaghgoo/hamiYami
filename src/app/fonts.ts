import localFont from "next/font/local";

// Self-hosted under the SIL Open Font License; no third-party font requests.
export const fraunces = localFont({
  src: "./fonts/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-fraunces",
});

export const figtree = localFont({
  src: "./fonts/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  display: "swap",
  variable: "--font-figtree",
});
