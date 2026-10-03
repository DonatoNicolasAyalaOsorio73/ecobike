import React, { useEffect } from "react";
import { BackHandler, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import { LinearGradient } from "expo-linear-gradient";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { EASE_EMPHASIZED_DECEL, SPRING, enter } from "@/theme/motion";
import { LIQUID_FILL } from "@/theme/glass";
import { type } from "@/theme/typography";
import type { RideGoal } from "@/utils/rideGoals";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EcoRoutePanel from "./EcoRoutePanel";
import TrainingPanel from "./TrainingPanel";
import type { Place, RoutePrefs } from "@/services/routing";

type View3 = "menu" | "eco" | "training";
const MODES: { id: View3 | "free"; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "free", label: "Recorrido libre", subtitle: "Sin meta, pedalea a tu ritmo", icon: "bicycle" },
  { id: "eco", label: "Eco ruta", subtitle: "Busca un lugar y te llevamos por la ruta más verde", icon: "leaf" },
  { id: "training", label: "Entrenamiento", subtitle: "Tu propia meta en kilómetros o tiempo", icon: "stopwatch-outline" },
];

// Brand mark on its own #7BF510 field (square art; fits the circle with margin).
const LOGO = require("../../../assets/logo-mark.png");
const BUTTON = 84;
const DISC = BUTTON - 2; // the green disc fills the lens inside its 1 pt rim
// Tap trace: a white stroke drawn around the circle, just outside its rim.
const TRACE_SIZE = BUTTON + 10;
const TRACE_R = TRACE_SIZE / 2 - 2;
const TRACE_C = 2 * Math.PI * TRACE_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (goal: RideGoal | null) => void;
  /** 0..1+ weekly goal progress (read out to screen readers). */
  weekProgress: number;
  disabled?: boolean;
  /** Distance from the bottom of the map (clears the tab bar). */
  bottom: number;
  /** Rider position (origin for Eco ruta). */
  near: { lat: number; lng: number } | null;
  /** Eco ruta: a destination was picked; the map shows the route preview. */
  onEcoPick: (place: Place, prefs: RoutePrefs) => void;
  /** Eco ruta opened: refresh the rider's real position for local search. */
  onEcoOpen?: () => void;
}

/**
 * The map's single entry point: a round EcoBike button. Tap it and the map
 * frosts over while the three ride modes rise out of the button: Libre
 * (starts now), Eco ruta (search a place → greener bike route) and
 * Entrenamiento (your own km/time goal). Tap outside or the ✕ to close.
 */
export default function RideLauncher({ open, onOpenChange, onSelect, weekProgress, disabled, bottom, near, onEcoPick, onEcoOpen }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = React.useState<View3>("menu");
  const [prefs, setPrefs] = React.useState<RoutePrefs>({ avoidUnpaved: true, greener: true });
  // Every time the menu opens it starts at the three modes.
  useEffect(() => {
    if (open) setView("menu");
  }, [open]);
  // Android back closes a panel, then the menu, before it ever leaves the map.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (view !== "menu") setView("menu");
      else onOpenChange(false);
      return true;
    });
    return () => sub.remove();
  }, [open, view, onOpenChange]);
  const turn = useSharedValue(0);
  const press = useSharedValue(0);
  const entry = useSharedValue(0);
  const still = useReducedMotion();
  // Pops in with a soft overshoot when the map opens.
  useEffect(() => {
    entry.value = still ? 1 : withDelay(200, withTiming(1, { duration: 380, easing: EASE_EMPHASIZED_DECEL }));
  }, [entry, still]);
  // Minimal: a quiet fade-in with a hint of scale, a gentle press-in, and one line of light on tap.
  const entryStyle = useAnimatedStyle(() => ({ opacity: entry.value, transform: [{ scale: 0.94 + 0.06 * entry.value }] }));
  // iOS 26 glass controls magnify under the finger (not sink) and squash a little, like liquid.
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * press.value }] }));
  // Tap: a white line of light runs once around the circle until it closes, then fades.
  const trace = useSharedValue(0);
  const traceOpacity = useSharedValue(0);
  const traceProps = useAnimatedProps(() => ({ strokeDashoffset: TRACE_C * (1 - trace.value) }));
  const traceStyle = useAnimatedStyle(() => ({ opacity: traceOpacity.value }));
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

          {view === "menu" && (
            <View pointerEvents="box-none" style={[styles.menu, { bottom: bottom + BUTTON + 22 }]}>
              <Animated.Text entering={enter()} style={[type.title2, styles.menuTitle, { color: colors.ink }]}>
                ¿Cómo quieres pedalear?
              </Animated.Text>
              {/* Rendered bottom-up so the option nearest the button arrives first. */}
              {MODES.map((m, i) => (
                <Animated.View key={m.id} entering={enter((MODES.length - 1 - i) * 40)}>
                  <PressableScale
                    depth={0.04}
                    accessibilityLabel={`${m.label}. ${m.subtitle}`}
                    onPress={() => {
                      haptic();
                      if (m.id === "free") onSelect(null);
                      else {
                        if (m.id === "eco") onEcoOpen?.();
                        setView(m.id);
                      }
                    }}
                  >
                    <GlassSurface radius={18} intensity={50} backgroundColor="rgba(255,255,255,0.82)" style={styles.option}>
                      <View style={[styles.optionIcon, { backgroundColor: m.id === "free" ? colors.primary : colors.chipFill }]}>
                        <Ionicons name={m.icon} size={18} color={colors.ink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]}>{m.label}</Text>
                        <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "400" }]} numberOfLines={2}>
                          {m.subtitle}
                        </Text>
                      </View>
                      {m.id !== "free" && <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />}
                    </GlassSurface>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Eco ruta sits at the top (search field above the keyboard, like Maps). */}
          {view === "eco" && (
            // Spans from the top down to just above the button, so results scroll above the ✕ instead of under it.
            <View pointerEvents="box-none" style={[styles.panel, { top: insets.top + 12, bottom: bottom + BUTTON + 18 }]}>
              <EcoRoutePanel near={near} prefs={prefs} onPrefsChange={setPrefs} onBack={() => setView("menu")} onPick={(place) => onEcoPick(place, prefs)} />
            </View>
          )}

          {view === "training" && (
            <View pointerEvents="box-none" style={[styles.panel, { bottom: bottom + BUTTON + 22 }]}>
              <TrainingPanel onBack={() => setView("menu")} onStart={(goal) => onSelect(goal)} />
            </View>
          )}
        </Animated.View>
      )}

      <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
        {/* Beacon: a soft ring radiates from the button every few seconds (the button itself stays still). */}
        <Animated.View pointerEvents="none" style={[styles.trace, TRACE_GLOW, traceStyle]}>
          <Svg width={TRACE_SIZE} height={TRACE_SIZE} style={[{ transform: [{ rotate: "-90deg" }] }]}>
            <AnimatedCircle
              cx={TRACE_SIZE / 2}
              cy={TRACE_SIZE / 2}
              r={TRACE_R}
              stroke="#FFFFFF"
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={TRACE_C}
              animatedProps={traceProps}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.buttonWrap, elevation("mid"), entryStyle, pressStyle, disabled && { opacity: 0.5 }]}>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={open ? "Cerrar opciones de recorrido" : "Opciones de recorrido"}
            accessibilityHint={open ? undefined : `Meta semanal al ${Math.round(Math.min(999, weekProgress * 100))}%`}
            onPressIn={() => {
              press.value = withSpring(1, SPRING.press);
              if (!still) {
                traceOpacity.value = 1;
                trace.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
              }
            }}
            onPressOut={() => {
              press.value = withSpring(0, SPRING.default);
              // Let the line finish closing the circle, then fade it (quick taps still see the full loop).
              traceOpacity.value = withDelay(420, withTiming(0, { duration: 320 }));
            }}
            onPress={() => {
              haptic();
              onOpenChange(!open);
            }}
          >
            {/* One glass edge only: a 1 pt Liquid Glass rim around a tinted-glass brand disc. */}
            <GlassSurface radius={BUTTON / 2} intensity={100} specular backgroundColor={LIQUID_FILL} borderColor="rgba(255,255,255,0.85)" style={[styles.button, styles.center]}>
                <Animated.View style={[styles.disc, DISC_VOLUME, logoStyle]}>
                  <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
                  {/* Specular reflection on top of the green: tinted glass, not a flat sticker. */}
                  <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]} locations={[0, 0.45, 0.6]} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                                  </Animated.View>
                {/* Open state: a solid ink disc with a white ✕, visible over any background (map, results, cards). */}
                <Animated.View style={[StyleSheet.absoluteFill, styles.center, styles.closeDisc, closeStyle]}>
                  <Ionicons name="close" size={30} color="#FFFFFF" />
                </Animated.View>
            </GlassSurface>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

// Web: inner highlight on top and soft shade at the bottom give the green disc glass volume.
const DISC_VOLUME = Platform.OS === "web" ? ({ boxShadow: "inset 0 -3px 8px rgba(20,60,0,0.18)" } as object) : null;

// Web: the traced line glows softly (drop-shadow follows the stroke, not a box).
const TRACE_GLOW = Platform.OS === "web" ? ({ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.95)) drop-shadow(0 0 2px rgba(123,245,16,0.6))" } as object) : null;

const styles = StyleSheet.create({
  closeDisc: { borderRadius: BUTTON / 2, backgroundColor: "rgba(20,23,26,0.88)" },
  panel: { position: "absolute", left: 20, right: 20, maxWidth: 420, alignSelf: "center", marginHorizontal: "auto" } as any,
  anchor: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  buttonWrap: { borderRadius: BUTTON / 2 },
  button: { width: BUTTON, height: BUTTON },
  trace: { position: "absolute", bottom: -(TRACE_SIZE - BUTTON) / 2, width: TRACE_SIZE, height: TRACE_SIZE, zIndex: 2 },
  center: { alignItems: "center", justifyContent: "center" },
  // Green disc inset in the glass lens; the square art is drawn a bit smaller so nothing touches the edge.
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: "#7BF510", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: DISC * 0.92, height: DISC * 0.92 },
  menu: { position: "absolute", left: 24, right: 24, gap: 8, alignSelf: "center", maxWidth: 380, marginHorizontal: "auto" } as any,
  menuTitle: { textAlign: "center", marginBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
