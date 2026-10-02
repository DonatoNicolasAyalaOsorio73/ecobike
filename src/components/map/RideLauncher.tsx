import React, { useEffect } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import ProgressRing from "@/components/ui/ProgressRing";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING, enter } from "@/theme/motion";
import { type } from "@/theme/typography";
import { RIDE_GOAL_OPTIONS, type RideGoal } from "@/utils/rideGoals";

const LOGO = require("../../../assets/logo.png");
const BUTTON = 76;

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
        <PressableScale
          depth={0.08}
          disabled={disabled}
          accessibilityLabel={open ? "Cerrar opciones de recorrido" : "Opciones de recorrido"}
          accessibilityHint={open ? undefined : `Meta semanal al ${Math.round(Math.min(999, weekProgress * 100))}%`}
          onPress={() => {
            haptic();
            onOpenChange(!open);
          }}
          style={[styles.buttonWrap, elevation("mid"), disabled && { opacity: 0.5 }]}
        >
          <ProgressRing progress={open ? 0 : Math.min(1, weekProgress)} size={BUTTON + 10} thickness={4}>
            <View style={styles.button}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, logoStyle]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, closeStyle]}>
                <Ionicons name="close" size={30} color={colors.ink} />
              </Animated.View>
            </View>
          </ProgressRing>
        </PressableScale>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  buttonWrap: { borderRadius: (BUTTON + 10) / 2 },
  button: { width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, backgroundColor: "#FFFFFF", overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  // logo.png carries ~15% transparent padding, so it's drawn larger than the circle's inner area.
  logo: { width: BUTTON * 0.95, height: BUTTON * 0.95 },
  menu: { position: "absolute", left: 24, right: 24, gap: 8, alignSelf: "center", maxWidth: 380, marginHorizontal: "auto" } as any,
  menuTitle: { textAlign: "center", marginBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
