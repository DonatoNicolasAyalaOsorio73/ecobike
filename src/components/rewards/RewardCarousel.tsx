import React, { useEffect } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING } from "@/theme/motion";
import type { Reward } from "@/types/reward";

// Art for rewards without a logo. Color carries meaning: lime when you can
// redeem it now, a quiet neutral while it's still out of reach.
const ART_AFFORDABLE: [string, string, string] = ["#F4FCE6", "#C9F681", "#9EE23C"];
const ART_LOCKED: [string, string, string] = ["#FAFBF9", "#ECEFEA", "#D9DDD6"];

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

/** Soft light orb drifting inside the art (decorative, off with reduce motion). */
function Orb({ size, color, x, y, delay, still }: { size: number; color: string; x: number; y: number; delay: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, delay, still]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 26 }, { translateY: -t.value * 18 }, { scale: 1 + t.value * 0.12 }],
  }));
  return <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: x, top: y }, ORB_BLUR, style]} />;
}

/** Full-bleed card background: the store's image, or generated art. */
function Art({ reward, affordable, still }: { reward: Reward; affordable: boolean; still: boolean }) {
  if (reward.imageUrl) return <Image source={{ uri: reward.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  const g = affordable ? ART_AFFORDABLE : ART_LOCKED;
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
      <Orb size={180} color="rgba(255,255,255,0.75)" x={-40} y={-30} delay={0} still={still} />
      <Orb size={140} color={affordable ? "rgba(173,241,75,0.9)" : "rgba(200,205,198,0.9)"} x={150} y={170} delay={900} still={still} />
      <View style={styles.artIcon}>
        <Ionicons name={reward.icon as any} size={120} color="rgba(28,36,16,0.16)" />
      </View>
    </LinearGradient>
  );
}

function Card({ reward, index, cardWidth, cardHeight, step, scrollX, affordable, missing, still, onPress }: {
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
  const press = useSharedValue(0);
  const shine = useSharedValue(-1);
  const photo = !!reward.imageUrl;
  const ink = photo ? "#FFFFFF" : colors.ink;
  const inkSoft = photo ? "rgba(255,255,255,0.82)" : colors.inkSoft;

  // A band of light sweeps across redeemable cards every few seconds.
  useEffect(() => {
    if (still || !affordable) return;
    shine.value = withDelay(
      600 + index * 250,
      withRepeat(withSequence(withTiming(1.4, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), withTiming(1.4, { duration: 2600 }), withTiming(-1, { duration: 0 })), -1)
    );
  }, [shine, still, affordable, index]);

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
  const shineStyle = useAnimatedStyle(() => {
    const focus = 1 - Math.min(1, Math.abs(offset(scrollX.value, index, step)));
    return { opacity: focus * 0.55, transform: [{ translateX: shine.value * cardWidth }, { rotate: "18deg" }] };
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(520).springify().damping(18)} style={[{ width: cardWidth, marginRight: SPACING }, WEB_SNAP_ITEM]}>
      <Animated.View style={[{ borderRadius: RADIUS }, elevation("mid"), cardStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${reward.title}, ${reward.subtitle}, ${reward.pointsCost} puntos`}
          onPress={onPress}
          onPressIn={() => {
            press.value = withSpring(1, SPRING.press);
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          }}
          onPressOut={() => (press.value = withSpring(0, SPRING.momentum))}
          style={[styles.card, { height: cardHeight }]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
            <Art reward={reward} affordable={affordable} still={still} />
          </Animated.View>

          {/* Legibility: dark scrim under white text on photos, light scrim on art. */}
          <LinearGradient
            pointerEvents="none"
            colors={photo ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"] : ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]}
            style={styles.scrim}
          />
          {affordable && !still && (
            <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
              <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}

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

/** Blurred, enlarged copy of the focused card behind the carousel (Apple Music style). */
function Ambient({ rewards, availablePoints, step, scrollX }: { rewards: Reward[]; availablePoints: number; step: number; scrollX: SharedValue<number> }) {
  return (
    <View pointerEvents="none" style={styles.ambient}>
      {rewards.map((r, i) => (
        <AmbientLayer key={r.id} reward={r} index={i} step={step} scrollX={scrollX} affordable={availablePoints >= r.pointsCost} />
      ))}
      {Platform.OS === "web" ? null : <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />}
    </View>
  );
}

function AmbientLayer({ reward, index, step, scrollX, affordable }: { reward: Reward; index: number; step: number; scrollX: SharedValue<number>; affordable: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(offset(scrollX.value, index, step)), [0, 1], [0.85, 0], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 90, overflow: "hidden" }, AMBIENT_BLUR, style]}>
      <Art reward={reward} affordable={affordable} still />
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
 * Featured rewards: tall image-first cards in a 3D coverflow over an ambient
 * blur of the focused card. Every motion is scroll-driven on the UI thread
 * (no re-render per frame); "reduce motion" keeps paging but drops the
 * rotation, drifting orbs and light sweep.
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

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    runOnJS(setIndex)(Math.round(e.contentOffset.x / step));
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
      <Ambient rewards={rewards} availablePoints={availablePoints} step={step} scrollX={scrollX} />
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

// CSS blur on web (orbs and the ambient backdrop); on native the orbs stay
// soft translucent circles and a BlurView blurs the backdrop.
const ORB_BLUR = Platform.OS === "web" ? ({ filter: "blur(18px)" } as object) : { opacity: 0.6 };
const AMBIENT_BLUR = Platform.OS === "web" ? ({ filter: "blur(40px) saturate(140%)", transform: [{ scale: 1.2 }] } as object) : { transform: [{ scale: 1.2 }] };

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", justifyContent: "flex-end" },
  orb: { position: "absolute" },
  artIcon: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
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
  // A glow behind the cards, not a box: inset, heavily rounded, and on web
  // unclipped so the CSS blur feathers its own edges into the page.
  ambient: { position: "absolute", left: 28, right: 28, top: 14, bottom: 70, borderRadius: 90, opacity: 0.75, overflow: Platform.OS === "web" ? "visible" : "hidden" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  dot: { height: 7, borderRadius: 4 },
});
