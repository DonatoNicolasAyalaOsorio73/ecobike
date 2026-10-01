import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Eases a plain JS number from its previous value to the next one.
 *
 * For transforms/opacity use Reanimated (compositor-owned, interruptible).
 * This exists for the cases Reanimated can't own — SVG geometry and text
 * content — where the value has to round-trip through React state anyway.
 * Respects reduced motion by jumping straight to the target.
 */
export function useTweenedValue(value: number, duration = 0.6): number {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || duration <= 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    if (from === value) return;

    // Date.now() rather than performance.now(): millisecond resolution is
    // plenty for a sub-second tween, and it needs no engine polyfill on any
    // platform. rAF's timestamp argument is ignored for the same reason.
    const start = Date.now();
    const totalMs = duration * 1000;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / totalMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration, reducedMotion]);

  return display;
}
