import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import type { Reward } from "@/types/reward";

// Art for rewards without a logo: each card gets its own gradient.
const GRADIENTS: [string, string][] = [
  ["#ADF14B", "#3FB65E"],
  ["#2BC0A6", "#0E7C86"],
  ["#F6C453", "#E07B2E"],
  ["#7FD8F6", "#3769D6"],
  ["#C7A6F7", "#7A4FD6"],
];

const SPACING = 14;

// Web has no snapToInterval: native CSS scroll-snap gives the same "one card
// at a time" paging for touch swipes and trackpads.
const WEB_SNAP_CONTAINER = Platform.OS === "web" ? ({ scrollSnapType: "x mandatory" } as any) : undefined;
const WEB_SNAP_ITEM = Platform.OS === "web" ? ({ scrollSnapAlign: "center" } as any) : undefined;

function Arrow({ icon, label, disabled, onPress, color }: { icon: any; label: string; disabled: boolean; onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, { opacity: disabled ? 0.3 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] }]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

interface Props {
  rewards: Reward[];
  availablePoints: number;
  width: number;
  onPress: (reward: Reward) => void;
}

function Card({ reward, index, cardWidth, scrollX, affordable, missing, onPress }: {
  reward: Reward;
  index: number;
  cardWidth: number;
  scrollX: SharedValue<number>;
  affordable: boolean;
  missing: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const step = cardWidth + SPACING;
  const range = [(index - 1) * step, index * step, (index + 1) * step];

  // Focused card full size; neighbours shrink and dim (Wallet/App Store style).
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollX.value, range, [0.9, 1, 0.9], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollX.value, range, [0.6, 1, 0.6], Extrapolation.CLAMP),
  }));
  // Parallax: the art drifts slower than the card.
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, range, [-cardWidth * 0.18, 0, cardWidth * 0.18], Extrapolation.CLAMP) }, { scale: 1.25 }],
  }));

  const [from, to] = GRADIENTS[index % GRADIENTS.length];

  return (
    <Animated.View style={[{ width: cardWidth, marginRight: SPACING }, WEB_SNAP_ITEM, cardStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${reward.title}, ${reward.subtitle}, ${reward.pointsCost} puntos`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
            {reward.imageUrl ? (
              <Image source={{ uri: reward.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.art]}>
                <Ionicons name={reward.icon as any} size={110} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            )}
          </Animated.View>
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]} style={styles.scrim} />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {reward.title}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              {reward.subtitle}
            </Text>
          </View>
          <View style={[styles.costPill, { backgroundColor: colors.primary }]}>
            <Ionicons name="ribbon" size={13} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: "800", fontSize: 13, marginLeft: 4 }}>{reward.pointsCost.toLocaleString("es-CO")}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {affordable ? (
            <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 13.5 }}>Disponible para canjear</Text>
          ) : (
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>Te faltan {missing.toLocaleString("es-CO")} pts</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Dot({ index, step, scrollX, onPress }: { index: number; step: number; scrollX: SharedValue<number>; onPress: () => void }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const range = [(index - 1) * step, index * step, (index + 1) * step];
    return {
      width: interpolate(scrollX.value, range, [7, 22, 7], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ir a la recompensa ${index + 1}`} onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.primaryDark }, style]} />
    </Pressable>
  );
}

/** Image-first, snap-paging rewards carousel with scale + parallax on scroll. */
export default function RewardCarousel({ rewards, availablePoints, width, onPress }: Props) {
  const { colors } = useTheme();
  const scrollX = useSharedValue(0);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const [index, setIndex] = React.useState(0);
  const cardWidth = Math.min(320, width - 72);
  const step = cardWidth + SPACING;
  const side = (width - cardWidth) / 2;
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    runOnJS(setIndex)(Math.round(e.contentOffset.x / step));
  });
  const goTo = (i: number) => {
    const target = Math.max(0, Math.min(rewards.length - 1, i));
    ref.current?.scrollTo({ x: target * step, animated: true });
  };

  return (
    <View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        style={WEB_SNAP_CONTAINER}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingLeft: side, paddingRight: side - SPACING }}
      >
        {rewards.map((r, i) => (
          <Card
            key={r.id}
            reward={r}
            index={i}
            cardWidth={cardWidth}
            scrollX={scrollX}
            affordable={availablePoints >= r.pointsCost}
            missing={Math.max(0, r.pointsCost - availablePoints)}
            onPress={() => onPress(r)}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.controls}>
        <Arrow icon="chevron-back" label="Anterior" disabled={index <= 0} onPress={() => goTo(index - 1)} color={colors.primaryDark} />
        <View style={styles.dots}>
          {rewards.map((r, i) => (
            <Dot key={r.id} index={i} step={step} scrollX={scrollX} onPress={() => goTo(i)} />
          ))}
        </View>
        <Arrow icon="chevron-forward" label="Siguiente" disabled={index >= rewards.length - 1} onPress={() => goTo(index + 1)} color={colors.primaryDark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  hero: { height: 300, overflow: "hidden", justifyContent: "flex-end" },
  art: { alignItems: "center", justifyContent: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  heroText: { padding: 18 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  heroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 4 },
  costPill: { position: "absolute", top: 14, right: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 14 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  dot: { height: 7, borderRadius: 4 },
});
