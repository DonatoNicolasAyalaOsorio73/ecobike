import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING, enter } from "@/theme/motion";
import type { Reward } from "@/types/reward";
import StoreLogo from "./StoreLogo";

// Art for rewards without a logo: clean light surface; the only color on the
// card is the "available" chip (state), the richness comes from motion.
const ART: [string, string, string] = ["#FFFFFF", "#F3F5F1", "#E6E9E3"];

const SPACING = 16;
const RADIUS = 32;

// Web has no snapToInterval: native CSS scroll-snap gives the same "one card
// at a time" paging for touch swipes and trackpads.
const WEB_SNAP_CONTAINER = Platform.OS === "web" ? ({ scrollSnapType: "x mandatory" } as any) : undefined;
const WEB_SNAP_ITEM = Platform.OS === "web" ? ({ scrollSnapAlign: "center" } as any) : undefined;

interface Props {
  rewards: Reward[];
  availablePoints: number;
  width: number;
  onPress: (reward: Reward) => void;
}

/** 0 when the card is centered, ±1 one page away (worklet). */
function offset(scrollX: number, index: number, step: number) {
  "worklet";
  return scrollX / step - index;
}

/** Soft static light highlight inside the art. */
function Orb({ size, color, x, y }: { size: number; color: string; x: number; y: number }) {
  return <View style={[styles.orb, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: x, top: y }, ORB_BLUR]} />;
}

/** Clean card surface. Never moves on its own. */
function Art() {
  return (
    <LinearGradient colors={ART} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
      <Orb size={180} color="rgba(255,255,255,0.75)" x={-40} y={-30} />
      <Orb size={140} color="rgba(255,255,255,0.9)" x={150} y={170} />
    </LinearGradient>
  );
}

function Card({ reward: source, index, cardWidth, cardHeight, step, scrollX, affordable, missing, still, onPress }: {
  reward: Reward;
  index: number;
  cardWidth: number;
  cardHeight: number;
  step: number;
  scrollX: SharedValue<number>;
  affordable: boolean;
  missing: number;
  still: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reward = source;
  const press = useSharedValue(0);
  const shine = useSharedValue(-1);
  const ink = colors.ink;
  const inkSoft = colors.inkSoft;

  // Coverflow: neighbours rotate away in 3D, shrink, sink and dim.
  const cardStyle = useAnimatedStyle(() => {
    const o = offset(scrollX.value, index, step);
    const a = Math.min(1, Math.abs(o));
    return {
      opacity: interpolate(a, [0, 1], [1, 0.55]),
      transform: [
        { perspective: 1000 },
        { translateY: interpolate(a, [0, 1], [0, 22]) },
        { rotateY: still ? "0deg" : `${interpolate(o, [-1, 0, 1], [18, 0, -18], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(a, [0, 1], [1, 0.86]) - press.value * 0.04 },
      ],
    };
  });
  // Parallax: art drifts against the swipe, text a little with it.
  const artStyle = useAnimatedStyle(() => {
    const o = offset(scrollX.value, index, step);
    return { transform: [{ translateX: interpolate(o, [-1, 0, 1], [-cardWidth * 0.25, 0, cardWidth * 0.25], Extrapolation.CLAMP) }, { scale: 1.3 }] };
  });
  const textStyle = useAnimatedStyle(() => {
    const o = offset(scrollX.value, index, step);
    return {
      opacity: interpolate(Math.abs(o), [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(o, [-1, 0, 1], [40, 0, -40], Extrapolation.CLAMP) }, { translateY: interpolate(Math.abs(o), [0, 1], [0, 16], Extrapolation.CLAMP) }],
    };
  });
  // The stamp only reacts to your finger: under a press it lifts, grows and tilts a little.
  const stampPressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * press.value }, { scale: 1 + 0.06 * press.value }, { rotate: `${still ? 0 : -4 * press.value}deg` }],
  }));
  const logoStyle = useAnimatedStyle(() => {
    const o = offset(scrollX.value, index, step);
    return { transform: [{ translateX: interpolate(o, [-1, 0, 1], [-cardWidth * 0.12, 0, cardWidth * 0.12], Extrapolation.CLAMP) }, { scale: interpolate(Math.abs(o), [0, 1], [1, 0.85], Extrapolation.CLAMP) }] };
  });
  const shineStyle = useAnimatedStyle(() => {
    const focus = 1 - Math.min(1, Math.abs(offset(scrollX.value, index, step)));
    return { opacity: focus * 0.55, transform: [{ translateX: shine.value * cardWidth }, { rotate: "18deg" }] };
  });

  return (
    <Animated.View entering={enter(Math.min(index, 4) * 90)} style={[{ width: cardWidth, marginRight: SPACING }, WEB_SNAP_ITEM]}>
      <Animated.View style={[{ borderRadius: RADIUS }, elevation("mid"), cardStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${reward.title}, ${reward.subtitle}, ${reward.pointsCost} puntos`}
          onPress={onPress}
          onPressIn={() => {
            press.value = withSpring(1, SPRING.press);
            // Redeemable cards answer the touch with one sweep of light.
            if (affordable && !still) shine.value = withSequence(withTiming(-1, { duration: 0 }), withTiming(1.4, { duration: 650, easing: Easing.out(Easing.cubic) }));
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          }}
          onPressOut={() => (press.value = withSpring(0, SPRING.momentum))}
          style={[styles.card, { height: cardHeight }]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
            <Art />
          </Animated.View>

          {/* Legibility: light scrim under the text. */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.92)"]}
            style={styles.scrim}
          />
          {affordable && !still && (
            <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
              <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}

          {/* Always a stamp: the logo, or the store's monogram when it has none. */}
          <Animated.View pointerEvents="none" style={[styles.stamp, logoStyle]}>
            <Animated.View style={stampPressStyle}>
              <StoreLogo uri={reward.imageUrl} name={reward.title} size={170} />
            </Animated.View>
          </Animated.View>

          <View style={styles.costPill}>
            <Ionicons name="ribbon" size={13} color={colors.ink} />
            <Text style={styles.costText}>{reward.pointsCost.toLocaleString("es-CO")}</Text>
          </View>

          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={[styles.title, { color: ink }]} numberOfLines={2}>
              {reward.title}
            </Text>
            {reward.subtitle ? (
              <Text style={[styles.subtitle, { color: inkSoft }]} numberOfLines={2}>
                {reward.subtitle}
              </Text>
            ) : null}
            <View style={[styles.status, affordable ? { backgroundColor: colors.primary } : styles.statusLocked]}>
              <Ionicons name={affordable ? "sparkles" : "lock-closed"} size={13} color={colors.ink} />
              <Text style={styles.statusText}>{affordable ? "Disponible para canjear" : `Te faltan ${missing.toLocaleString("es-CO")} pts`}</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function Arrow({ icon, label, disabled, onPress }: { icon: any; label: string; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, elevation("low"), { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
}

function Dot({ index, step, scrollX, onPress }: { index: number; step: number; scrollX: SharedValue<number>; onPress: () => void }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const a = Math.min(1, Math.abs(offset(scrollX.value, index, step)));
    return { width: interpolate(a, [0, 1], [22, 7]), opacity: interpolate(a, [0, 1], [1, 0.3]) };
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ir a la recompensa ${index + 1}`} onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.ink }, style]} />
    </Pressable>
  );
}

/**
 * Featured rewards: tall clean cards in a 3D coverflow, each with the
 * company logo as a large stamp (no box, no background). Nothing moves on
 * its own: every motion answers the finger (swipe drives the coverflow and
 * parallax on the UI thread; a press lifts the stamp and, on redeemable
 * cards, sweeps a light once). "Reduce motion" drops the 3D tilt.
 */
export default function RewardCarousel({ rewards, availablePoints, width, onPress }: Props) {
  const scrollX = useSharedValue(0);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const [index, setIndex] = React.useState(0);
  const still = useReducedMotion();
  const cardWidth = Math.min(300, width - 84);
  const cardHeight = Math.round(cardWidth * 1.3);
  const step = cardWidth + SPACING;
  const side = (width - cardWidth) / 2;

  // Crosses to JS only when the centered card changes (not on every frame),
  // clamped so iOS overscroll bounce never reports -1 or past the end.
  const lastIndex = useSharedValue(0);
  const count = rewards.length;
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    const i = Math.max(0, Math.min(count - 1, Math.round(e.contentOffset.x / step)));
    if (i !== lastIndex.value) {
      lastIndex.value = i;
      runOnJS(setIndex)(i);
    }
  });
  // Light tick when a new card settles in the center (not on first render).
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, [index]);

  const goTo = (i: number) => {
    const target = Math.max(0, Math.min(rewards.length - 1, i));
    ref.current?.scrollTo({ x: target * step, animated: true });
  };

  return (
    <View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Vertical padding: a horizontal ScrollView clips on both axes, which would cut shadows and the 3D tilt.
        contentContainerStyle={{ paddingLeft: side, paddingRight: side - SPACING, paddingVertical: 28 }}
        style={[WEB_SNAP_CONTAINER, { marginVertical: -28 }]}
      >
        {rewards.map((r, i) => (
          <Card
            key={r.id}
            reward={r}
            index={i}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            step={step}
            scrollX={scrollX}
            affordable={availablePoints >= r.pointsCost}
            missing={Math.max(0, r.pointsCost - availablePoints)}
            still={still}
            onPress={() => onPress(r)}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.controls}>
        <Arrow icon="chevron-back" label="Anterior" disabled={index <= 0} onPress={() => goTo(index - 1)} />
        <View style={[styles.dots, elevation("low")]}>
          {rewards.map((r, i) => (
            <Dot key={r.id} index={i} step={step} scrollX={scrollX} onPress={() => goTo(i)} />
          ))}
        </View>
        <Arrow icon="chevron-forward" label="Siguiente" disabled={index >= rewards.length - 1} onPress={() => goTo(index + 1)} />
      </View>
    </View>
  );
}

// CSS blur softens the orbs on web; native keeps them as translucent circles.
// Stamp shadow follows the logo's own shape (transparent PNG), not a box.
const ORB_BLUR = Platform.OS === "web" ? ({ filter: "blur(18px)" } as object) : { opacity: 0.6 };

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", justifyContent: "flex-end" },
  orb: { position: "absolute" },
  stamp: { position: "absolute", top: "12%", left: 0, right: 0, alignItems: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" },
  shine: { position: "absolute", top: -40, bottom: -40, left: -60, width: 70 },
  costPill: { position: "absolute", top: 16, left: 16, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.85)" },
  costText: { color: "#14171A", fontWeight: "700", fontSize: 13 },
  textBlock: { padding: 20, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { fontSize: 14.5, lineHeight: 19 },
  status: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusLocked: { backgroundColor: "rgba(255,255,255,0.85)" },
  statusText: { color: "#14171A", fontWeight: "700", fontSize: 12.5 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  dot: { height: 7, borderRadius: 4 },
});
