import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { ZoomIn } from "react-native-reanimated";
import { enter } from "@/theme/motion";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import { columnStyle, useLargeTitle } from "@/components/ui/LargeTitleScreen";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import ChoiceChips, { type Choice } from "@/components/ui/ChoiceChips";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import { useTheme } from "@/theme/useTheme";
import { accents } from "@/theme/colors";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useToastStore } from "@/stores/toastStore";
import { removeProfilePhoto, updateUserProfile, uploadProfilePhoto } from "@/services/auth.service";
import { isUsernameAvailable } from "@/services/social.service";
import { api } from "@/services/api";
import {
  BIO_MAX,
  isoToBirthInput,
  maskBirthDate,
  parseBirthDate,
  profileCompletion,
  validateName,
  validateUsername,
  type ProfileFormValues,
} from "@/domain/profileForm";

const BIKES: Choice[] = [
  { value: "Urbana", label: "Urbana", icon: "bicycle" },
  { value: "Ruta", label: "Ruta", icon: "speedometer" },
  { value: "Montaña", label: "Montaña", icon: "trail-sign" },
  { value: "Eléctrica", label: "Eléctrica", icon: "flash" },
  { value: "Plegable", label: "Plegable", icon: "git-compare" },
  { value: "BMX", label: "BMX", icon: "flame" },
];
const EXPERIENCE: Choice[] = [
  { value: "Principiante", label: "Principiante", icon: "leaf" },
  { value: "Intermedio", label: "Intermedio", icon: "trending-up" },
  { value: "Avanzado", label: "Avanzado", icon: "rocket" },
];
const GOALS: Choice[] = [
  { value: "Movilidad", label: "Moverme por la ciudad", icon: "business" },
  { value: "Salud", label: "Salud", icon: "heart" },
  { value: "Deporte", label: "Entrenar", icon: "barbell" },
  { value: "Planeta", label: "Cuidar el planeta", icon: "earth" },
];
const GENDERS: Choice[] = [
  { value: "Femenino", label: "Femenino" },
  { value: "Masculino", label: "Masculino" },
  { value: "Otro", label: "Otro" },
  { value: "Prefiero no decir", label: "Prefiero no decir" },
];

// Direct links / reloads have no history to go back to.
const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

type UsernameState = "idle" | "checking" | "ok" | "taken" | "invalid";

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const lt = useLargeTitle({ title: "Editar perfil", leading: <BackButton size={36} />, tabBar: false });
  const navigation = useNavigation();
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const local = useLocalProfileStore();
  const toast = useToastStore((s) => s.show);
  const isGuest = !firebaseUser;

  const initial: ProfileFormValues = useMemo(
    () => ({
      firstName: profile?.firstName ?? local.firstName ?? "",
      lastName: profile?.lastName ?? local.lastName ?? "",
      username: profile?.username ?? local.username,
      bio: profile?.bio ?? local.bio ?? "",
      birthDate: isoToBirthInput(profile?.birthDate ?? local.birthDate),
      gender: profile?.gender ?? local.gender ?? "",
      city: profile?.city ?? local.city ?? "",
      bikeType: profile?.bikeType ?? local.bikeType ?? "",
      experience: profile?.experience ?? local.experience ?? "",
      ridingGoal: profile?.ridingGoal ?? local.ridingGoal ?? "",
      hasPhoto: !!(profile?.photoURL ?? local.photoUri),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [v, setV] = useState<ProfileFormValues>(initial);
  const [photo, setPhoto] = useState<string | null>(profile?.photoURL ?? local.photoUri);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const allowLeave = useRef(false);

  const set = <K extends keyof ProfileFormValues>(k: K) => (value: ProfileFormValues[K]) => setV((s) => ({ ...s, [k]: value }));

  const dirty = (Object.keys(initial) as (keyof ProfileFormValues)[]).some((k) => k !== "hasPhoto" && initial[k] !== v[k]);
  const { ratio, nextHint } = profileCompletion({ ...v, hasPhoto: !!photo });
  const birth = parseBirthDate(v.birthDate);
  const errors = {
    firstName: validateName(v.firstName, "nombre"),
    lastName: v.lastName.trim() ? validateName(v.lastName, "apellido") : null,
    username: isGuest ? null : validateUsername(v.username),
    birthDate: birth.error,
    bio: v.bio.length > BIO_MAX ? `Máximo ${BIO_MAX} caracteres.` : null,
  };
  const hasErrors = Object.values(errors).some(Boolean) || usernameState === "taken";

  // Live username availability (debounced). The server re-validates on save.
  useEffect(() => {
    if (isGuest) return;
    const wanted = v.username.trim().replace(/^@/, "").toLowerCase();
    if (wanted === initial.username) return setUsernameState("idle");
    if (validateUsername(wanted)) return setUsernameState("invalid");
    setUsernameState("checking");
    const t = setTimeout(() => {
      isUsernameAvailable(wanted, firebaseUser!.uid)
        .then((ok) => setUsernameState(ok ? "ok" : "taken"))
        .catch(() => setUsernameState("idle"));
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.username]);

  // Unsaved-changes guard for the back button and swipe-back.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove" as any, (e: any) => {
      if (!dirty || allowLeave.current) return;
      e.preventDefault();
      setConfirmLeave(true);
    });
    return unsub;
  }, [navigation, dirty]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast("Permite el acceso a tus fotos para cambiar tu imagen.", "error");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    if (isGuest) {
      await local.update({ photoUri: uri });
      return setPhoto(uri);
    }
    setPhotoBusy(true);
    try {
      setPhoto(await uploadProfilePhoto(firebaseUser!.uid, uri));
      await refreshProfile();
      toast("Foto actualizada.", "success");
    } catch {
      toast("No se pudo subir la foto.", "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const deletePhoto = async () => {
    setPhotoBusy(true);
    try {
      if (isGuest) await local.update({ photoUri: null });
      else {
        await removeProfilePhoto(firebaseUser!.uid);
        await refreshProfile();
      }
      setPhoto(null);
    } catch {
      toast("No se pudo quitar la foto.", "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    setShowErrors(true);
    if (hasErrors) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return toast("Revisa los campos marcados.", "error");
    }
    setSaving(true);
    const data = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      bio: v.bio.trim(),
      birthDate: birth.iso,
      gender: v.gender || null,
      city: v.city.trim(),
      bikeType: v.bikeType,
      experience: v.experience || null,
      ridingGoal: v.ridingGoal || null,
    };
    try {
      if (isGuest) {
        await local.update({
          ...data,
          displayName: `${data.firstName} ${data.lastName}`.trim() || "Ciclista invitado",
          gender: data.gender ?? "",
          experience: data.experience ?? "",
          ridingGoal: data.ridingGoal ?? "",
        });
      } else {
        const wanted = v.username.trim().replace(/^@/, "").toLowerCase();
        if (wanted !== initial.username) await api("me", "POST", { username: wanted });
        await updateUserProfile(firebaseUser!.uid, data);
        await refreshProfile();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSaved(true);
      allowLeave.current = true;
      setTimeout(() => goBack(), 650);
    } catch (e: any) {
      toast(e?.message ?? "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const usernameRight =
    usernameState === "checking" ? (
      <ActivityIndicator size="small" color={colors.inkSoft} />
    ) : usernameState === "ok" ? (
      <Ionicons name="checkmark-circle" size={20} color={accents.green.lip} />
    ) : usernameState === "taken" ? (
      <Ionicons name="close-circle" size={20} color={colors.danger} />
    ) : null;

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Animated.ScrollView
            onScroll={lt.onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[lt.contentContainerStyle, styles.scroll, columnStyle]}
            showsVerticalScrollIndicator={lt.showsVerticalScrollIndicator}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ marginHorizontal: -20 }}>{lt.header}</View>
            {/* Completion */}
            <GlassCard>
              <View style={styles.completionHead}>
                <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>Perfil {Math.round(ratio * 100)}% completo</Text>
                {ratio === 1 && (
                  <Animated.View entering={ZoomIn.springify().damping(16)}>
                    <Ionicons name="ribbon" size={22} color={accents.gold.lip} />
                  </Animated.View>
                )}
              </View>
              <DuoProgressBar value={ratio} accent={ratio === 1 ? "gold" : "green"} />
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 8 }}>{nextHint ? `Siguiente: ${nextHint.toLowerCase()}.` : "¡Perfil completo! Así tus amigos te reconocen mejor."}</Text>
            </GlassCard>

            {/* Photo */}
            <Animated.View entering={enter(60)} style={styles.photoBlock}>
              <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                <View style={[styles.avatar, { borderColor: "transparent", backgroundColor: accents.green.soft }]}>
                  {photo ? <Image source={{ uri: photo }} style={styles.avatarImg} /> : <Ionicons name="person" size={48} color={accents.green.lip} />}
                  {photoBusy && (
                    <View style={[StyleSheet.absoluteFill, styles.avatarBusy]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                <View style={[styles.camera, { backgroundColor: accents.green.base, borderColor: "#fff" }]}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </Pressable>
              <View style={styles.photoActions}>
                <Text style={[styles.photoLink, { color: accents.green.lip }]} onPress={pickPhoto} accessibilityRole="button">
                  {photo ? "Cambiar foto" : "Agregar foto"}
                </Text>
                {photo && (
                  <Text style={[styles.photoLink, { color: colors.danger }]} onPress={deletePhoto} accessibilityRole="button">
                    Quitar
                  </Text>
                )}
              </View>
            </Animated.View>

            <Section title="Información básica" delay={100} />
            <GlassCard entranceDelay={100}>
              <GlassInput label="Nombre" icon="person-outline" value={v.firstName} onChangeText={set("firstName")} autoCapitalize="words" errorText={showErrors ? errors.firstName : null} />
              <GlassInput label="Apellido" icon="people-outline" value={v.lastName} onChangeText={set("lastName")} autoCapitalize="words" errorText={showErrors ? errors.lastName : null} />
              {!isGuest && (
                <GlassInput
                  label="Nombre de usuario"
                  icon="at-outline"
                  value={v.username}
                  onChangeText={(t) => set("username")(t.replace(/\s/g, "").toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect={false}
                  right={usernameRight}
                  errorText={usernameState === "taken" ? "Ese nombre de usuario ya está en uso." : usernameState === "invalid" || showErrors ? errors.username : null}
                  hint={usernameState === "ok" ? "¡Disponible!" : "Así te encuentran tus amigos."}
                />
              )}
              <GlassInput
                label="Biografía"
                icon="chatbox-ellipses-outline"
                value={v.bio}
                onChangeText={set("bio")}
                placeholder="Ej: Pedaleo al trabajo todos los días"
                multiline
                maxLength={BIO_MAX + 20}
                right={<Text style={{ color: v.bio.length > BIO_MAX ? colors.danger : colors.inkFaint, fontSize: 11.5, fontWeight: "700" }}>{v.bio.length}/{BIO_MAX}</Text>}
                errorText={errors.bio}
              />
            </GlassCard>

            <Section title="Sobre ti" delay={160} />
            <GlassCard entranceDelay={160}>
              <GlassInput
                label="Fecha de nacimiento"
                icon="calendar-outline"
                value={v.birthDate}
                onChangeText={(t) => set("birthDate")(maskBirthDate(t))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
                errorText={v.birthDate.length === 10 || showErrors ? errors.birthDate : null}
                hint="Opcional. No se muestra a otros usuarios."
              />
              <GlassInput label="Ciudad" icon="location-outline" value={v.city} onChangeText={set("city")} autoCapitalize="words" placeholder="Ej: Bogotá" />
              <Text style={[styles.fieldLabel, { color: colors.inkSoft }]}>Género</Text>
              <ChoiceChips choices={GENDERS} value={v.gender} onChange={set("gender")} accent="purple" accessibilityLabel="Género" />
            </GlassCard>

            <Section title="Tu bicicleta" delay={220} />
            <GlassCard entranceDelay={220}>
              <Text style={[styles.fieldLabel, { color: colors.inkSoft }]}>Tipo</Text>
              <ChoiceChips choices={BIKES} value={v.bikeType} onChange={set("bikeType")} accent="green" accessibilityLabel="Tipo de bicicleta" />
              <Text style={[styles.fieldLabel, { color: colors.inkSoft, marginTop: 16 }]}>Nivel</Text>
              <ChoiceChips choices={EXPERIENCE} value={v.experience} onChange={set("experience")} accent="blue" accessibilityLabel="Nivel" />
              <Text style={[styles.fieldLabel, { color: colors.inkSoft, marginTop: 16 }]}>¿Para qué pedaleas?</Text>
              <ChoiceChips choices={GOALS} value={v.ridingGoal} onChange={set("ridingGoal")} accent="orange" accessibilityLabel="Objetivo" />
            </GlassCard>

          </Animated.ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            {confirmLeave ? (
              <Animated.View entering={enter()} style={{ gap: 10 }}>
                <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "center" }}>¿Salir sin guardar los cambios?</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <GlassButton label="Seguir editando" variant="secondary" onPress={() => setConfirmLeave(false)} style={{ flex: 1 }} />
                  <GlassButton
                    label="Descartar"
                    variant="danger"
                    onPress={() => {
                      allowLeave.current = true;
                      goBack();
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </Animated.View>
            ) : (
              <GlassButton
                label={saved ? "¡Guardado!" : "Guardar cambios"}
                icon={saved ? "checkmark-circle" : "save-outline"}
                onPress={save}
                loading={saving}
                disabled={!dirty && !saved}
              />
            )}
          </View>
        </KeyboardAvoidingView>
        {lt.navBar}
    </View>
  );
}

function Section({ title, delay }: { title: string; delay: number }) {
  const { colors } = useTheme();
  return (
    <Animated.Text entering={enter(delay)} style={[styles.section, { color: colors.ink }]} accessibilityRole="header">
      {title}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  completionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  photoBlock: { alignItems: "center", marginTop: 20 },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarBusy: { backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  camera: { position: "absolute", right: 0, bottom: 4, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  photoActions: { flexDirection: "row", gap: 18, marginTop: 10 },
  photoLink: { fontWeight: "700", fontSize: 14 },
  section: { fontSize: 18, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  fieldLabel: { fontSize: 12.5, fontWeight: "700", marginBottom: 8, marginLeft: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, backgroundColor: "rgba(255,255,255,0.92)" },
});
