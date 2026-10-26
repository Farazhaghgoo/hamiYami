"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import styles from "./Scrolly.module.css";

export interface ScrollyStep {
  key: string;
  /** The words of the step: always in the reading flow. */
  text: ReactNode;
  /** The picture for the step: pinned beside the words on wide screens, after them otherwise. */
  graphic: ReactNode;
}

const WIDE = "(min-width: 900px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const noopSubscribe = () => () => {};

/**
 * Scrollytelling: as a step's words cross the middle of the screen, its graphic takes the stage.
 * On narrow screens, and before JavaScript runs, each graphic simply follows its words, so nothing
 * needs scrolling tricks to be read. Each graphic is rendered once: in the pinned stage on wide
 * screens, inline otherwise. Graphics fade rather than move, and only without reduced motion.
 */
export function Scrolly({ steps, tone = "light" }: { steps: ScrollyStep[]; tone?: "light" | "dark" }) {
  const enhanced = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const [active, setActive] = useState(0);
  // Steps up to this one have been reached, so their charts have drawn themselves in.
  const [reached, setReached] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.step);
          setActive(index);
          setReached((previous) => Math.max(previous, index));
        }
      },
      // A line across the middle of the viewport.
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const element of stepRefs.current) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [steps.length]);

  const shown = (index: number) => (enhanced ? String(index <= reached) : undefined);

  return (
    <div className={styles.scrolly} data-tone={tone} data-wide={wide || undefined}>
      <div className={styles.steps}>
        {steps.map((step, index) => (
          <div
            key={step.key}
            ref={(element) => {
              stepRefs.current[index] = element;
            }}
            data-step={index}
            data-active={enhanced ? index === active : undefined}
            className={styles.step}
          >
            <div className={styles.card}>{step.text}</div>
            {wide ? null : (
              <div className={styles.inline} data-shown={shown(index)}>
                {step.graphic}
              </div>
            )}
          </div>
        ))}
      </div>
      {wide ? (
        <div className={styles.stage}>
          <div className={styles.pin}>
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={styles.layer}
                data-active={index === active}
                data-shown={shown(index)}
                inert={index !== active}
              >
                {step.graphic}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
