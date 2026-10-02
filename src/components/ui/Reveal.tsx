import React, { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from "react-native-reanimated";

interface ScrollReveal {
  scrollY: SharedValue<number>;
  viewportH: SharedValue<number>;
  /** The scroll content node positions are measured against. */
  contentRef: RefObject<View | null>;
  /** Bumped when the content size changes, so positions get re-measured. */
  version: number;
}

export const ScrollRevealContext = createContext<ScrollReveal | null>(null);

const DISTANCE = 140; // px of travel into the viewport over which an item settles

/**
 * Scroll-driven reveal (Flutter-style): as an item crosses the bottom edge of
 * the viewport it fades in, rises and grows to full size, tracking the
 * scroll 1:1 on the UI thread. Items already on screen are untouched.
 * Outside a ScrollRevealContext (or with reduce motion) it's a plain View.
 */
export default function Reveal({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const ctx = useContext(ScrollRevealContext);
  const reduce = useReducedMotion();
  const ref = useRef<View>(null);
  const top = useSharedValue(-1); // unknown until measured → fully visible

  const measure = () => {
    const content = ctx?.contentRef.current;
    if (!content || !ref.current) return;
    ref.current.measureLayout(content as any, (_x, y) => (top.value = y), () => {});
  };
  // Content above may grow/shrink without this view's own layout changing.
  useEffect(measure, [ctx?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const animated = useAnimatedStyle(() => {
    if (!ctx || reduce || top.value < 0 || ctx.viewportH.value === 0) return {};
    const p = interpolate(ctx.scrollY.value + ctx.viewportH.value - top.value, [0, DISTANCE], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * 32 }, { scale: 0.95 + 0.05 * p }] };
  });

  if (!ctx) return <View style={style}>{children}</View>;
  return (
    <Animated.View ref={ref} onLayout={measure} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
