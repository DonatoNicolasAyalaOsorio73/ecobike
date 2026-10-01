/**
 * Motion tokens in Apple's vocabulary, not magic numbers.
 *
 * Apple deliberately replaced the physics triplet (mass/stiffness/damping)
 * with two designer-facing parameters — damping *ratio* and *response* — in
 * "Designing Fluid Interfaces". Reanimated only speaks the physics triplet,
 * so `spring()` converts, which keeps every call site readable as intent
 * ("critically damped, 0.4s response") instead of tuned-by-feel constants.
 *
 *   ω = 2π / response      (undamped natural frequency)
 *   stiffness k = m·ω²
 *   damping   c = 2·ζ·m·ω  (from ζ = c / 2√(k·m))
 */
export function spring(dampingRatio: number, response: number, mass = 1) {
  const omega = (2 * Math.PI) / response;
  return {
    mass,
    stiffness: mass * omega * omega,
    damping: 2 * dampingRatio * mass * omega,
  };
}

export const SPRING = {
  /** Default for anything the user didn't throw — critically damped, no
   * overshoot. Overshoot on a menu that merely appeared reads as wrong. */
  default: spring(1.0, 0.4),

  /** Press/release feedback. Shorter response so it lands under the finger
   * rather than trailing it. */
  press: spring(1.0, 0.25),

  /** Only for motion a gesture's own momentum preceded (a flick, a drag
   * release) — that's the one case where a little overshoot reads as
   * physical instead of decorative. */
  momentum: spring(0.8, 0.4),

  /** Sheets and drawers, per Apple's shipped values. */
  sheet: spring(0.8, 0.3),

  /** Playful overshoot (Duolingo-style): button release, badges popping in,
   * celebratory elements. Use for delight moments, not for plain layout. */
  bouncy: spring(0.45, 0.42),
} as const;

/**
 * Apple's momentum projection (the exponential-decay form from the
 * Designing Fluid Interfaces sample code — NOT the textbook v²/2a). Given a
 * release velocity, returns how much further the content would coast, so a
 * flick can snap to where the gesture was *going* rather than where the
 * finger happened to leave the screen.
 */
export function projectDecay(velocity: number, decelerationRate = 0.998) {
  return (velocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

/**
 * Progressive resistance past a boundary. A hard stop reads as "frozen";
 * resistance that grows with overshoot reads as "responsive, but there's
 * nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  "worklet";
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
