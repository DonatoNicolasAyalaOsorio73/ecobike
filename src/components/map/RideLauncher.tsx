import React, { useEffect } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import { LinearGradient } from "expo-linear-gradient";
import { GlintRing } from "@/components/ui/Glint";
import ProgressRing from "@/components/ui/ProgressRing";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING, enter, spring } from "@/theme/motion";
import { LIQUID_FILL, LIQUID_RIM } from "@/theme/glass";
import { type } from "@/theme/typography";
import { RIDE_GOAL_OPTIONS, type RideGoal } from "@/utils/rideGoals";

// Brand mark on its own #7BF510 field (square art; fits the circle with margin).
const LOGO = require("../../../assets/logo-mark.png");
const BUTTON = 84;
const DISC = BUTTON - 6; // 3 pt of clear glass around the green disc
const RING = BUTTON + 8;
// Same "bouncy" release the tab-bar lens uses (SwiftUI .bouncy).
const LENS_SPRING = spring(0.7, 0.5);

/** A soft ring that radiates out of the button every few seconds to draw the eye. */
function Beacon() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(1200, withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 2600 })), -1));
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - t.value), transform: [{ scale: 1 + 0.55 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.beacon, style]} />;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (goal: RideGoal | null) => void;
  /** 0..1+ weekly goal progress, drawn as a thin ring around the button. */
  weekProgress: number;
  disabled?: boolean;
  /** Distance from the bottom of the map (clears the tab bar). */
  bottom: number;
}

/**
 * The map's single entry point: a round EcoBike button. Tap it and the map
 * frosts over while the ride modes rise out of the button (closest first);
 * tap a mode to start, tap outside or the ✕ to close. The thin ring around
 * the button is this week's goal progress (lime = progress, functional).
 */
export default function RideLauncher({ open, onOpenChange, onSelect, weekProgress, disabled, bottom }: Props) {
  const { colors } = useTheme();
  const turn = useSharedValue(0);
  const press = useSharedValue(0);
  const entry = useSharedValue(0);
  const still = useReducedMotion();
  // Pops in with a soft overshoot when the map opens.
  useEffect(() => {
    entry.value = still ? 1 : withDelay(250, withSpring(1, SPRING.bouncy));
  }, [entry, still]);
  const entryStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, entry.value * 1.5), transform: [{ scale: 0.6 + 0.4 * entry.value }] }));
  // iOS 26 glass controls magnify under the finger (not sink) and squash a little, like liquid.
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + 0.12 * press.value }, { scaleY: 1 + 0.06 * press.value }] }));
  useEffect(() => {
    turn.value = withSpring(open ? 1 : 0, SPRING.default);
  }, [open, turn]);
  // Logo fades/shrinks out as a ✕ rotates in: one button, two states.
  const logoStyle = useAnimatedStyle(() => ({ opacity: 1 - turn.value, transform: [{ scale: 1 - 0.3 * turn.value }] }));
  const closeStyle = useAnimatedStyle(() => ({ opacity: turn.value, transform: [{ rotate: `${(1 - turn.value) * -90}deg` }, { scale: 0.7 + 0.3 * turn.value }] }));

  const haptic = () => Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

  return (
    <>
      {open && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={() => onOpenChange(false)} style={StyleSheet.absoluteFill}>
            <GlassSurface radius={0} intensity={60} specular={false} borderColor="transparent" backgroundColor="rgba(246,248,244,0.55)" style={StyleSheet.absoluteFill} />
          </Pressable>
          <View pointerEvents="box-none" style={[styles.menu, { bottom: bottom + BUTTON + 22 }]}>
            <Animated.Text entering={enter()} style={[type.title2, styles.menuTitle, { color: colors.ink }]}>
              ¿Cómo quieres pedalear?
            </Animated.Text>
            {/* Rendered bottom-up so the option nearest the button arrives first. */}
            {RIDE_GOAL_OPTIONS.map((o, i) => (
              <Animated.View key={o.id} entering={enter((RIDE_GOAL_OPTIONS.length - 1 - i) * 35)}>
                <PressableScale
                  depth={0.04}
                  accessibilityLabel={`${o.label}. ${o.subtitle}`}
                  onPress={() => {
                    haptic();
                    onSelect(o.goal);
                  }}
                >
                  <GlassSurface radius={18} intensity={50} backgroundColor="rgba(255,255,255,0.82)" style={styles.option}>
                    <View style={[styles.optionIcon, { backgroundColor: o.goal ? colors.chipFill : colors.primary }]}>
                      <Ionicons name={o.icon as any} size={18} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]}>{o.label}</Text>
                      <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "400" }]} numberOfLines={1}>
                        {o.subtitle}
                      </Text>
                    </View>
                  </GlassSurface>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}

      <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
        {/* Beacon: a soft ring radiates from the button every few seconds (the button itself stays still). */}
        {!open && !still && <Beacon />}
        <Animated.View style={[styles.buttonWrap, elevation("mid"), entryStyle, pressStyle, disabled && { opacity: 0.5 }]}>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={open ? "Cerrar opciones de recorrido" : "Opciones de recorrido"}
            accessibilityHint={open ? undefined : `Meta semanal al ${Math.round(Math.min(999, weekProgress * 100))}%`}
            onPressIn={() => (press.value = withSpring(1, SPRING.press))}
            onPressOut={() => (press.value = withSpring(0, LENS_SPRING))}
            onPress={() => {
              haptic();
              onOpenChange(!open);
            }}
          >
            {/* Thin weekly-progress ring (translucent track, green arc). */}
            <ProgressRing progress={open ? 0 : Math.min(1, weekProgress)} size={RING} thickness={3} trackColor="rgba(255,255,255,0.45)">
              {/* Clear Liquid Glass lens (same material as the tab bar) holding a tinted-glass brand disc. */}
              <GlassSurface radius={BUTTON / 2} intensity={100} specular backgroundColor={LIQUID_FILL} borderColor="rgba(255,255,255,0.7)" style={[styles.button, styles.center, LIQUID_RIM]}>
                <Animated.View style={[styles.disc, DISC_VOLUME, logoStyle]}>
                  <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
                  {/* Specular reflection on top of the green: tinted glass, not a flat sticker. */}
                  <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]} locations={[0, 0.45, 0.6]} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                  {/* Light travelling around the glass edge. */}
                  {!open && <GlintRing size={DISC} width={2.5} />}
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, styles.center, closeStyle]}>
                  <Ionicons name="close" size={30} color={colors.ink} />
                </Animated.View>
              </GlassSurface>
            </ProgressRing>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

// Web: inner highlight on top and soft shade at the bottom give the green disc glass volume.
const DISC_VOLUME = Platform.OS === "web" ? ({ boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.75), inset 0 -3px 8px rgba(20,60,0,0.25)" } as object) : null;

const styles = StyleSheet.create({
  anchor: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  buttonWrap: { borderRadius: RING / 2 },
  button: { width: BUTTON, height: BUTTON },
  beacon: { position: "absolute", bottom: 0, width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: "rgba(123,245,16,0.95)" },
  center: { alignItems: "center", justifyContent: "center" },
  // Green disc inset in the glass lens; the square art is drawn a bit smaller so nothing touches the edge.
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: "#7BF510", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: DISC * 0.92, height: DISC * 0.92 },
  menu: { position: "absolute", left: 24, right: 24, gap: 8, alignSelf: "center", maxWidth: 380, marginHorizontal: "auto" } as any,
  menuTitle: { textAlign: "center", marginBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
