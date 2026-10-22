import type { SVGProps } from "react";
import styles from "./Icon.module.css";

/* Line icons carried over from the original landing page. Always decorative: pair them with text. */
const PATHS = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6v.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="m9 15.2 2 2 4-4" />
    </>
  ),
  bag: (
    <>
      <path d="M5.2 8.5h13.6l-1.1 11.5H6.3L5.2 8.5Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  pot: (
    <>
      <path d="M4.5 11h15v4a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5v-4Z" />
      <path d="M2.5 11h2M19.5 11h2" />
      <path d="M9.5 7.5c0-1.2 1-1.3 1-2.5M13.5 7.5c0-1.2 1-1.3 1-2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20.5a7 7 0 0 1 14 0" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  alert: (
    <>
      <path d="M12 3.8 2.8 19.5h18.4L12 3.8Z" />
      <path d="M12 10v4.2" />
      <path d="M12 17v.01" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20.5V12" />
      <path d="M12 12c0-4.4 2.9-6.8 7.5-6.8 0 4.4-2.9 6.8-7.5 6.8Z" />
      <path d="M12 14.5c0-3.3-2.3-5.4-6.2-5.4 0 3.3 2.3 5.4 6.2 5.4Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6.2v5.3c0 4.3 3 7.9 7 9 4-1.1 7-4.7 7-9V6.2l-7-2.7Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12V5.5a2 2 0 0 1 2-2H12l8.5 8.5a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0L3.5 12Z" />
      <circle cx="8.2" cy="8.2" r="1.6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4.6 1.4 6.1 2 6.5H4c.6-.4 2-1.9 2-6.5Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 13.8V5a2 2 0 0 1 4 0v8.8a4 4 0 1 1-4 0Z" />
      <path d="M12 17.6V9.5" />
    </>
  ),
  docSearch: (
    <>
      <path d="M12.5 20.5H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h6.5L18 8v2.5" />
      <path d="M13.5 3.5V8H18" />
      <circle cx="16.3" cy="16.3" r="3" />
      <path d="m18.5 18.5 2.3 2.3" />
    </>
  ),
  minus: <path d="M6 12h12" />,
  plus: <path d="M12 6v12M6 12h12" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ? `${styles.icon} ${className}` : styles.icon}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
