import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./Illustrations.module.css";

/*
 * Pictures for the first two chapters. The photos are licensed stock that illustrate home cooking
 * (labelled as such); the drawings are decorative, so the visible caption carries their meaning.
 */

export function StoryPhoto({
  src,
  alt,
  note,
  width,
  height,
}: {
  src: string;
  alt: string;
  note: string;
  width: number;
  height: number;
}) {
  return (
    <figure className={styles.photo}>
      <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 900px) 600px, 100vw" />
      <figcaption className={styles.photoNote}>{note}</figcaption>
    </figure>
  );
}

function Art({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className={styles.art}>
      <div className={styles.drawing}>{children}</div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}

const TICKS = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);

/** A clock at ten to nine in the evening, under the moon. */
export function ClockArt({ caption }: { caption: string }) {
  return (
    <Art caption={caption}>
      <svg viewBox="0 0 240 190" aria-hidden="true" focusable="false">
        <path className={styles.accent} d="M206 18a20 20 0 1 0 16 32 16 16 0 1 1-16-32Z" />
        <circle className={styles.stroke} cx="112" cy="100" r="74" />
        {TICKS.map((angle) => (
          <line
            key={angle}
            className={styles.thin}
            x1={112 + 60 * Math.sin(angle)}
            y1={100 - 60 * Math.cos(angle)}
            x2={112 + 66 * Math.sin(angle)}
            y2={100 - 66 * Math.cos(angle)}
          />
        ))}
        <line className={styles.stroke} x1="112" y1="100" x2="76" y2="97" />
        <line className={`${styles.stroke} ${styles.minute}`} x1="112" y1="100" x2="67" y2="74" />
        <circle className={styles.accent} cx="112" cy="100" r="7" />
      </svg>
    </Art>
  );
}

/** A house with its door shut and a pot steaming behind the window. */
export function KitchenArt({ caption }: { caption: string }) {
  return (
    <Art caption={caption}>
      <svg viewBox="0 0 240 190" aria-hidden="true" focusable="false">
        <path className={styles.stroke} d="M34 92 120 26l86 66" />
        <rect className={styles.stroke} x="54" y="80" width="132" height="100" rx="6" />
        <rect className={styles.stroke} x="72" y="122" width="34" height="58" rx="4" />
        <circle className={styles.accent} cx="98" cy="153" r="3.5" />
        <rect className={`${styles.stroke} ${styles.window}`} x="122" y="100" width="48" height="46" rx="5" />
        <path className={styles.accent} d="M132 126h28v10a6 6 0 0 1-6 6h-16a6 6 0 0 1-6-6Z" />
        <path className={styles.thin} d="M129 126h34" />
        <path className={`${styles.thin} ${styles.steam}`} d="M140 120c-4-5 4-8 0-13" />
        <path className={`${styles.thin} ${styles.steam} ${styles.steamLate}`} d="M152 120c-4-5 4-8 0-13" />
      </svg>
    </Art>
  );
}

/** Two bowls at the same price, one far fuller than the other. */
export function BowlsArt({ caption, price }: { caption: string; price: string }) {
  return (
    <Art caption={caption}>
      <div className={styles.bowls}>
        {[true, false].map((full) => (
          <div key={String(full)} className={styles.bowl}>
            <svg viewBox="0 0 110 90" aria-hidden="true" focusable="false">
              <path
                className={styles.accent}
                d={full ? "M16 44c4-30 74-30 78 0Z" : "M36 44c4-10 34-10 38 0Z"}
              />
              <path className={styles.stroke} d="M8 44h94c0 24-20 40-47 40S8 68 8 44Z" />
            </svg>
            <span className={styles.tag}>{price}</span>
          </div>
        ))}
      </div>
    </Art>
  );
}

/** A plate surrounded by the questions people ask before trusting a dish. */
export function QuestionsArt({ caption, questions }: { caption: string; questions: string[] }) {
  return (
    <Art caption={caption}>
      <div className={styles.questions}>
        <svg viewBox="0 0 200 140" aria-hidden="true" focusable="false">
          <circle className={styles.stroke} cx="100" cy="70" r="56" />
          <circle className={styles.thin} cx="100" cy="70" r="38" />
          <path className={styles.thin} d="M24 34v28m-6-28v18a6 6 0 0 0 12 0V34M24 62v52" />
          <path className={styles.thin} d="M176 34c-8 8-8 28 0 34v46" />
        </svg>
        <ul className={styles.bubbles}>
          {questions.map((question) => (
            <li key={question} className={styles.bubble}>
              {question}
            </li>
          ))}
        </ul>
      </div>
    </Art>
  );
}
