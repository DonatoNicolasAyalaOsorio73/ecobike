import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import SegmentedControl from "@/components/ui/SegmentedControl";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import type { RideGoal } from "@/domain/rideGoals";

const KM_PRESETS = [5, 10, 20, 42];
const MIN_PRESETS = [30, 45, 60, 90];
const KM_RANGE = { min: 1, max: 200, step: 1 };
const MIN_RANGE = { min: 10, max: 300, step: 5 };

/**
 * Entrenamiento: your own goal. Distance or time, quick presets plus a
 * stepper for any value; starts a ride that tracks progress toward it.
 */
export default function TrainingPanel({ onStart, onBack }: { onStart: (goal: RideGoal) => void; onBack: () => void }) {
  const { colors } = useTheme();
  const [kind, setKind] = useState<"distance" | "time">("distance");
  const [km, setKm] = useState(10);
  const [min, setMin] = useState(45);
  const value = kind === "distance" ? km : min;
  const range = kind === "distance" ? KM_RANGE : MIN_RANGE;
  const set = kind === "distance" ? setKm : setMin;
  const presets = kind === "distance" ? KM_PRESETS : MIN_PRESETS;

  const step = (dir: 1 | -1) => {
    Haptics.selectionAsync().catch(() => {});
    set((v) => Math.max(range.min, Math.min(range.max, v + dir * range.step)));
  };

  return (
    <View style={styles.wrap}>
      <Animated.View entering={enter()} style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver a los modos">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={[type.title2, { color: colors.ink, flex: 1 }]}>Entrenamiento</Text>
        <Ionicons name="stopwatch-outline" size={20} color={colors.ink} />
      </Animated.View>

      <Animated.View entering={enter(40)}>
        <SegmentedControl
          options={[
            { label: "Distancia", value: "distance" },
            { label: "Tiempo", value: "time" },
          ]}
          value={kind}
          onChange={setKind}
        />
      </Animated.View>

      {/* The goal, big, with +/− around it. */}
      <Animated.View entering={enter(80)} style={styles.stepper}>
        <StepButton icon="remove" label={kind === "distance" ? "Menos kilómetros" : "Menos minutos"} onPress={() => step(-1)} disabled={value <= range.min} />
        <View style={styles.valueBox} accessibilityLiveRegion="polite">
          <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
          <Text style={[type.subhead, { color: colors.inkSoft, fontWeight: "600" }]}>{kind === "distance" ? "km" : "min"}</Text>
        </View>
        <StepButton icon="add" label={kind === "distance" ? "Más kilómetros" : "Más minutos"} onPress={() => step(1)} disabled={value >= range.max} />
      </Animated.View>

      <Animated.View entering={enter(120)} style={styles.presets}>
        {presets.map((p) => {
          const on = p === value;
          return (
            <Pressable
              key={p}
              onPress={() => set(p)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.preset, { backgroundColor: on ? colors.primary : "rgba(255,255,255,0.82)" }]}
            >
              <Text style={[type.callout, { color: colors.ink, fontWeight: on ? "700" : "500" }]}>{kind === "distance" ? `${p} km` : `${p} min`}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={enter(160)}>
        <GlassButton
          label="Iniciar entrenamiento"
          icon="play"
          onPress={() => onStart(kind === "distance" ? { kind: "distance", meters: km * 1000 } : { kind: "time", seconds: min * 60 })}
        />
      </Animated.View>
    </View>
  );
}

function StepButton({ icon, label, onPress, disabled }: { icon: "add" | "remove"; label: string; onPress: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepBtn, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={26} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)" },
  valueBox: { alignItems: "center" },
  value: { fontSize: 56, fontWeight: "800", letterSpacing: -2 },
  presets: { flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  preset: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
});
