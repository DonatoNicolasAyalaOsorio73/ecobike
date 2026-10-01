import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInRight, FadeOutLeft, ZoomIn } from "react-native-reanimated";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassButton from "@/components/ui/GlassButton";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import Confetti from "@/components/ui/Confetti";
import { useTheme } from "@/theme/useTheme";
import { accents, type AccentName } from "@/theme/colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { updateUserProfile } from "@/services/auth.service";
import { DAILY_GOALS } from "@/utils/streak";

type Option = { value: string; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: AccentName };

const REASONS: Option[] = [
  { value: "Movilidad", title: "Moverme por la ciudad", subtitle: "Ir al trabajo o estudio", icon: "business", accent: "blue" },
  { value: "Salud", title: "Mejorar mi salud", subtitle: "Más energía cada día", icon: "heart", accent: "red" },
  { value: "Deporte", title: "Entrenar", subtitle: "Retos y velocidad", icon: "barbell", accent: "purple" },
  { value: "Planeta", title: "Cuidar el planeta", subtitle: "Menos CO₂, más aire limpio", icon: "earth", accent: "green" },
];

const DAILY: Option[] = DAILY_GOALS.map((g, i) => ({
  value: String(g.points),
  title: g.label,
  subtitle: `${g.points} puntos al día · ~${Math.round(Math.max(0, g.points - 20) / 10)} km`,
  icon: (["leaf", "bicycle", "flash", "rocket"] as const)[i],
  accent: (["green", "blue", "orange", "red"] as const)[i],
}));

const WEEKLY: Option[] = [
  { value: "15", title: "15 km", subtitle: "Para empezar con calma", icon: "walk", accent: "teal" },
  { value: "30", title: "30 km", subtitle: "Unos 3 recorridos", icon: "bicycle", accent: "green" },
  { value: "60", title: "60 km", subtitle: "Ciclista constante", icon: "trending-up", accent: "blue" },
  { value: "100", title: "100 km", subtitle: "Modo pro", icon: "trophy", accent: "gold" },
];

const STEPS = [
  { title: "¿Para qué vas a pedalear?", options: REASONS },
  { title: "Elige tu meta diaria", options: DAILY },
  { title: "¿Cuántos km a la semana?", options: WEEKLY },
] as const;

function OptionCard({ o, selected, onPress, index }: { o: Option; selected: boolean; onPress: () => void; index: number }) {
  const a = accents[o.accent];
  return (
    <Animated.View entering={FadeInRight.delay(index * 70).springify().damping(15)}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={`${o.title}. ${o.subtitle}`}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={({ pressed }) => [
          styles.option,
          selected ? { borderColor: a.base, backgroundColor: a.soft } : null,
          { transform: [{ translateY: pressed ? 2 : 0 }] },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: a.soft, borderColor: a.base }]}>
          <Ionicons name={o.icon} size={22} color={a.lip} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{o.title}</Text>
          <Text style={styles.optionSubtitle}>{o.subtitle}</Text>
        </View>
        {selected && (
          <Animated.View entering={ZoomIn.springify().damping(16)}>
            <Ionicons name="checkmark-circle" size={26} color={a.base} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** First-run personalization (Duolingo-style): reason, daily goal, weekly goal. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const update = useSettingsStore((s) => s.update);
  const dailyGoal = useSettingsStore((s) => s.dailyGoalPoints);
  const weeklyGoal = useSettingsStore((s) => s.weeklyGoalKm);
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const name = useAuthStore((s) => s.profile?.firstName);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", String(dailyGoal), String(weeklyGoal)]);
  const [saving, setSaving] = useState(false);
  const done = step === STEPS.length;

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      if (!skip) {
        await update({ dailyGoalPoints: Number(answers[1]) || 100, weeklyGoalKm: Number(answers[2]) || 30 });
        if (uid && answers[0]) await updateUserProfile(uid, { ridingGoal: answers[0] }).catch(() => {});
      }
      await update({ onboardingDone: true });
      router.replace("/(tabs)/map");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < STEPS.length) setStep(step + 1);
    else finish();
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Atrás" disabled={step === 0} onPress={() => setStep(step - 1)} hitSlop={10} style={{ opacity: step === 0 ? 0.3 : 1 }}>
            <Ionicons name="arrow-back" size={24} color={colors.inkSoft} />
          </Pressable>
          <DuoProgressBar value={step / STEPS.length} accent="green" style={{ flex: 1 }} />
          <Text style={[styles.skip, { color: colors.inkSoft }]} onPress={() => finish(true)} accessibilityRole="button">
            Omitir
          </Text>
        </View>

        {done ? (
          <View style={styles.doneWrap}>
            <Animated.View entering={ZoomIn.springify().damping(7)} style={[styles.doneIcon, { backgroundColor: accents.green.soft, borderColor: accents.green.base }]}>
              <Ionicons name="bicycle" size={64} color={accents.green.base} />
            </Animated.View>
            <Animated.Text entering={FadeInRight.delay(150).springify()} style={styles.doneTitle}>
              ¡Todo listo{name ? `, ${name}` : ""}!
            </Animated.Text>
            <Animated.Text entering={FadeInRight.delay(250).springify()} style={styles.doneText}>
              Tu meta: {answers[1]} puntos al día y {answers[2]} km a la semana. Puedes cambiarla cuando quieras en Ajustes.
            </Animated.Text>
            <Confetti />
          </View>
        ) : (
          <Animated.View key={step} entering={FadeInRight.springify().damping(16)} exiting={FadeOutLeft.duration(150)} style={{ flex: 1 }}>
            <Text style={[styles.question, { color: colors.ink }]} accessibilityRole="header">
              {STEPS[step].title}
            </Text>
            <ScrollView contentContainerStyle={{ gap: 12, padding: 20 }} showsVerticalScrollIndicator={false}>
              {STEPS[step].options.map((o, i) => (
                <OptionCard
                  key={o.value}
                  o={o}
                  index={i}
                  selected={answers[step] === o.value}
                  onPress={() => setAnswers((a) => a.map((v, j) => (j === step ? o.value : v)))}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={styles.footer}>
          <GlassButton
            label={done ? "¡Empezar a pedalear!" : "Continuar"}
            onPress={next}
            disabled={!done && !answers[step]}
            loading={saving}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 8 },
  skip: { fontWeight: "700" },
  question: { fontSize: 24, fontWeight: "700", paddingHorizontal: 20, marginTop: 24, letterSpacing: -0.4 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E3E7E1", borderBottomColor: "#D5DBD2", backgroundColor: "#FFFFFF" },
  optionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  optionTitle: { fontSize: 16.5, fontWeight: "700", color: "#1F2A22" },
  optionSubtitle: { fontSize: 13, color: "#6B776F", marginTop: 2 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  doneIcon: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", borderWidth: 4 },
  doneTitle: { fontSize: 28, fontWeight: "700", color: "#1F2A22", marginTop: 24, textAlign: "center" },
  doneText: { fontSize: 15, color: "#6B776F", marginTop: 10, textAlign: "center", lineHeight: 21 },
  footer: { padding: 20, paddingBottom: 26 },
});
