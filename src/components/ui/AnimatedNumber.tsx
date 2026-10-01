import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useTweenedValue } from "@/hooks/useTweenedValue";

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Seconds to settle. Not a spring: a points counter that overshoots and
   * comes back reads as a glitch, so this eases out and stops. */
  duration?: number;
  format?: (value: number) => string;
}

/**
 * Counts from the previous value to the new one instead of snapping, so
 * earning points reads as something that *happened* rather than a number
 * that was silently different on the next render.
 */
export default function AnimatedNumber({ value, style, duration = 0.6, format }: Props) {
  const tweened = useTweenedValue(value, duration);
  const rounded = Math.round(tweened);
  return <Text style={style}>{format ? format(rounded) : rounded}</Text>;
}
