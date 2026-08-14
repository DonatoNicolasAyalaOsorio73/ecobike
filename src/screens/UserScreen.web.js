// Web: Rappi-style profile — glass header, stats cards, menu list.
// Keeps all original Firebase logic (fetch, edit, image upload, gender, logout).
import React, { useState, useEffect } from "react";
import {
  View, Text, Image, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Modal, ActivityIndicator, Alert, Switch, Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { getAuth, signOut, sendPasswordResetEmail } from "firebase/auth";
import { colors, glass } from "../theme";

const FAQS = [
  { q: "¿Cómo gano puntos?", a: "Activa el recorrido en el mapa y pedalea: cada tramo recorrido suma puntos automáticamente." },
  { q: "¿Cómo canjeo mis puntos?", a: "En la sección Puntos elige una tienda y toca “Canjear descuento”. Recibirás un código QR." },
  { q: "¿Dónde veo mis cupones?", a: "En Puntos, dentro de cada tienda, toca “Mis códigos” para ver tus QR canjeados." },
  { q: "¿Cómo agrego amigos?", a: "En Amigos, busca por nombre de usuario y toca Seguir." },
];

const GREEN = colors.brand;
const DARK = colors.textDark;

function ecoLevel(points) {
  if (points >= 1000) return { name: "EcoLeyenda", icon: "award" };
  if (points >= 500) return { name: "EcoPro", icon: "zap" };
  if (points >= 150) return { name: "EcoRider", icon: "trending-up" };
  return { name: "EcoNovato", icon: "smile" };
}

// Achievements computed from the user's real Firestore data — no backend needed
function buildAchievements(points, friends) {
  return [
    { icon: "play", title: "Primer pedaleo", desc: "Gana tu primer punto", done: points >= 1 },
    { icon: "trending-up", title: "En marcha", desc: "Acumula 150 puntos", done: points >= 150 },
    { icon: "zap", title: "EcoPro", desc: "Acumula 500 puntos", done: points >= 500 },
    { icon: "award", title: "EcoLeyenda", desc: "Acumula 1000 puntos", done: points >= 1000 },
    { icon: "user-plus", title: "Sociable", desc: "Sigue a tu primer amigo", done: friends >= 1 },
    { icon: "users", title: "Comunidad", desc: "Sigue a 5 amigos", done: friends >= 5 },
  ];
}

export default function UserScreen({ navigation }) {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;

  const [userData, setUserData] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataUpdated, setDataUpdated] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ push: true, email: false, weekly: true });
  const [privacyPrefs, setPrivacyPrefs] = useState({ privateProfile: false });
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!userUid) return;
    (async () => {
      const db = getFirestore();
      try {
        const snap = await getDoc(doc(db, "usuarios", userUid));
        if (snap.exists()) {
          const d = snap.data();
          setUserData(d);
          setEditedData(d);
          if (d.notificaciones) setNotifPrefs((p) => ({ ...p, ...d.notificaciones }));
          if (d.privacidad) setPrivacyPrefs((p) => ({ ...p, ...d.privacidad }));
        }
      } catch (e) {
        console.log("Error fetching user data:", e);
      }
    })();
  }, [userUid, dataUpdated]);

  const validateDate = (date) => {
    if (!date) return true; // optional
    const parts = date.split("/");
    if (parts.length !== 3) return false;
    const [d, m, y] = parts.map((p) => parseInt(p, 10));
    return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= new Date().getFullYear();
  };

  const handleInputChange = (field, value) =>
    setEditedData((prev) => ({ ...prev, [field]: value }));

  const handleImageSelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setEditedData((prev) => ({ ...prev, profileImageUrl: result.assets[0].uri }));
        setImageChanged(true);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo abrir la galería. Intenta de nuevo.");
    }
  };

  const handleSave = async () => {
    if (!validateDate(editedData.fechaNacimiento)) {
      Alert.alert("Fecha inválida", "Usa el formato dd/mm/yyyy con una fecha real.");
      return;
    }
    setIsLoading(true);
    const db = getFirestore();
    const userDocRef = doc(db, "usuarios", userUid);
    try {
      let payload = { ...editedData };
      if (imageChanged && selectedImage && selectedImage !== userData.profileImageUrl) {
        const storage = getStorage();
        const storageRef = ref(storage, `profileImages/${userUid}`);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        payload.profileImageUrl = await getDownloadURL(storageRef);
      }
      await updateDoc(userDocRef, payload);
      setIsEditing(false);
      setSelectedImage(null);
      setImageChanged(false);
      setDataUpdated((v) => !v);
      Alert.alert("Perfil actualizado", "Tus cambios se guardaron correctamente.");
    } catch (e) {
      console.log("Error updating data:", e);
      Alert.alert("Error al guardar", "No pudimos guardar tus cambios. Revisa tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmLogout = async () => {
    try {
      await signOut(authInstance);
      navigation.navigate("SignIn");
    } catch (e) {
      Alert.alert("Error", "No se pudo cerrar sesión.");
    } finally {
      setShowLogoutConfirmation(false);
    }
  };

  const saveNotifPrefs = async (next) => {
    setNotifPrefs(next);
    try {
      await updateDoc(doc(getFirestore(), "usuarios", userUid), { notificaciones: next });
    } catch {
      Alert.alert("Error", "No se pudieron guardar tus preferencias. Revisa tu conexión.");
    }
  };

  const savePrivacyPrefs = async (next) => {
    setPrivacyPrefs(next);
    try {
      await updateDoc(doc(getFirestore(), "usuarios", userUid), { privacidad: next });
    } catch {
      Alert.alert("Error", "No se pudo guardar el ajuste. Revisa tu conexión.");
    }
  };

  const handleChangePassword = async () => {
    if (!userData?.email) {
      Alert.alert("Sin correo", "No hay un correo asociado a esta cuenta.");
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(getAuth(), userData.email);
      Alert.alert("Correo enviado", `Te enviamos un enlace para cambiar tu contraseña a ${userData.email}. Revisa tu bandeja y spam.`);
    } catch {
      Alert.alert("Error", "No se pudo enviar el correo. Intenta de nuevo más tarde.");
    } finally {
      setSendingReset(false);
    }
  };

  const contactSupport = () => {
    Linking.openURL("mailto:soporte@ecobike.app?subject=Ayuda%20EcoBike").catch(() =>
      Alert.alert("Soporte", "Escríbenos a soporte@ecobike.app")
    );
  };

  if (!userData) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const points = userData.puntosAcumulados ?? 0;
  const friends = (userData.following || []).length;
  const level = ecoLevel(points);
  const displayName =
    [userData.nombres, userData.apellidos].filter(Boolean).join(" ") ||
    userData.username ||
    "Biker";
  const avatarUri = selectedImage || userData.profileImageUrl;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Glass profile header ── */}
      <View style={styles.headerCard}>
        <TouchableOpacity
          activeOpacity={isEditing ? 0.7 : 1}
          onPress={() => isEditing && handleImageSelect()}
          style={styles.avatarRing}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name={isEditing ? "camera" : "user"} size={44} color={colors.accent} />
            </View>
          )}
          {isEditing && (
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{displayName}</Text>
        {userData.username ? <Text style={styles.username}>@{userData.username}</Text> : null}

        <View style={styles.levelPill}>
          <Feather name={level.icon} size={13} color={colors.accent} />
          <Text style={styles.levelText}>{level.name}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{points}</Text>
          <Text style={styles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{friends}</Text>
          <Text style={styles.statLabel}>Amigos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{level.name.replace("Eco", "")}</Text>
          <Text style={styles.statLabel}>Nivel</Text>
        </View>
      </View>

      {/* ── Editable fields (only in edit mode) ── */}
      {isEditing ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Editar perfil</Text>
          <Field label="Nombres">
            <TextInput
              style={styles.input}
              value={editedData.nombres || ""}
              onChangeText={(v) => handleInputChange("nombres", v)}
              placeholder="Nombres"
            />
          </Field>
          <Field label="Apellidos">
            <TextInput
              style={styles.input}
              value={editedData.apellidos || ""}
              onChangeText={(v) => handleInputChange("apellidos", v)}
              placeholder="Apellidos"
            />
          </Field>
          <Field label="Usuario">
            <TextInput
              style={styles.input}
              value={editedData.username || ""}
              onChangeText={(v) => handleInputChange("username", v)}
              placeholder="Usuario"
            />
          </Field>
          <Field label="Género">
            <TouchableOpacity style={styles.input} onPress={() => setShowGenderModal(true)}>
              <Text style={{ color: editedData.sexo ? DARK : "#a0a8a0" }}>
                {editedData.sexo || "Seleccionar género"}
              </Text>
            </TouchableOpacity>
          </Field>
          <Field label="Fecha de nacimiento">
            <TextInput
              style={styles.input}
              value={editedData.fechaNacimiento || ""}
              onChangeText={(v) => handleInputChange("fechaNacimiento", v)}
              placeholder="dd/mm/yyyy"
              placeholderTextColor="#a0a8a0"
            />
          </Field>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Feather name="check" size={18} color={colors.onBrand} />
                <Text style={styles.primaryButtonText}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => {
              setIsEditing(false);
              setEditedData(userData);
              setSelectedImage(null);
              setImageChanged(false);
            }}
          >
            <Text style={styles.ghostButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── Read-only info card ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mi información</Text>
            <InfoRow icon="mail" label="Correo" value={userData.email} />
            <InfoRow icon="user" label="Usuario" value={userData.username} />
            <InfoRow icon="users" label="Género" value={userData.sexo} />
            <InfoRow icon="calendar" label="Nacimiento" value={userData.fechaNacimiento} last />
          </View>

          {/* ── Rappi-style menu ── */}
          <View style={styles.section}>
            <MenuItem icon="edit-3" label="Editar perfil" onPress={() => setIsEditing(true)} />
            <MenuItem icon="award" label="Mis logros" onPress={() => setShowAchievements(true)} />
            <MenuItem icon="bell" label="Notificaciones" onPress={() => setShowNotifModal(true)} />
            <MenuItem icon="shield" label="Privacidad y seguridad" onPress={() => setShowPrivacyModal(true)} />
            <MenuItem icon="help-circle" label="Ayuda y soporte" onPress={() => setShowHelpModal(true)} last />
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutConfirmation(true)}
          >
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <Text style={styles.version}>EcoBike · v1.0.0</Text>
        </>
      )}

      {/* ── Achievements modal ── */}
      <Modal visible={showAchievements} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mis logros</Text>
            <Text style={styles.modalSub}>
              {buildAchievements(points, friends).filter((a) => a.done).length} de{" "}
              {buildAchievements(points, friends).length} desbloqueados
            </Text>
            <View style={{ width: "100%" }}>
              {buildAchievements(points, friends).map((a) => (
                <View key={a.title} style={[styles.achRow, !a.done && { opacity: 0.45 }]}>
                  <View style={[styles.achIcon, a.done && styles.achIconDone]}>
                    <Feather name={a.done ? a.icon : "lock"} size={18} color={a.done ? colors.accent : "#8a9a80"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.achTitle}>{a.title}</Text>
                    <Text style={styles.achDesc}>{a.desc}</Text>
                  </View>
                  {a.done && <Feather name="check-circle" size={20} color={colors.success} />}
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowAchievements(false)}>
              <Text style={styles.ghostButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notifications modal ── */}
      <Modal visible={showNotifModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notificaciones</Text>
            <Text style={styles.modalSub}>Elige qué avisos quieres recibir.</Text>
            <View style={{ width: "100%" }}>
              <PrefRow
                label="Notificaciones push" desc="Alertas en tu dispositivo"
                value={notifPrefs.push}
                onValueChange={(v) => saveNotifPrefs({ ...notifPrefs, push: v })}
              />
              <PrefRow
                label="Correo electrónico" desc="Novedades y cupones"
                value={notifPrefs.email}
                onValueChange={(v) => saveNotifPrefs({ ...notifPrefs, email: v })}
              />
              <PrefRow
                label="Resumen semanal" desc="Tu progreso cada semana"
                value={notifPrefs.weekly}
                onValueChange={(v) => saveNotifPrefs({ ...notifPrefs, weekly: v })}
                last
              />
            </View>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowNotifModal(false)}>
              <Text style={styles.ghostButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Privacy & security modal ── */}
      <Modal visible={showPrivacyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Privacidad y seguridad</Text>
            <Text style={styles.modalSub}>Gestiona tu cuenta y tu privacidad.</Text>
            <View style={{ width: "100%" }}>
              <PrefRow
                label="Perfil privado" desc="Oculta tu perfil en búsquedas"
                value={privacyPrefs.privateProfile}
                onValueChange={(v) => savePrivacyPrefs({ ...privacyPrefs, privateProfile: v })}
                last
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, styles.modalPrimary]}
              onPress={handleChangePassword}
              disabled={sendingReset}
            >
              {sendingReset ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <>
                  <Feather name="lock" size={16} color={colors.onBrand} />
                  <Text style={styles.primaryButtonText}>Cambiar contraseña</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.ghostButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Help & support modal ── */}
      <Modal visible={showHelpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ayuda y soporte</Text>
            <Text style={styles.modalSub}>Preguntas frecuentes</Text>
            <View style={{ width: "100%" }}>
              {FAQS.map((f, i) => (
                <View key={f.q} style={[styles.faqRow, i !== FAQS.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <Text style={styles.faqA}>{f.a}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, styles.modalPrimary]}
              onPress={contactSupport}
            >
              <Feather name="mail" size={16} color={colors.onBrand} />
              <Text style={styles.primaryButtonText}>Contactar soporte</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowHelpModal(false)}>
              <Text style={styles.ghostButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Logout modal ── */}
      <Modal visible={showLogoutConfirmation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Feather name="log-out" size={26} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>¿Cerrar sesión?</Text>
            <Text style={styles.modalSub}>Tendrás que iniciar sesión de nuevo para continuar.</Text>
            <TouchableOpacity style={styles.dangerButton} onPress={confirmLogout}>
              <Text style={styles.dangerButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowLogoutConfirmation(false)}>
              <Text style={styles.ghostButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Gender modal ── */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona tu género</Text>
            {["Masculino", "Femenino", "Otro"].map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.genderOption}
                onPress={() => {
                  handleInputChange("sexo", g);
                  setShowGenderModal(false);
                }}
              >
                <Text style={styles.genderText}>{g}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.ghostButton} onPress={() => setShowGenderModal(false)}>
              <Text style={styles.ghostButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Feather name={icon} size={18} color={colors.textMuted2} style={{ width: 26 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value || "—"}</Text>
    </View>
  );
}

function PrefRow({ label, desc, value, onValueChange, last }) {
  return (
    <View style={[styles.prefRow, !last && styles.infoRowBorder]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.prefLabel}>{label}</Text>
        {desc ? <Text style={styles.prefDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#d3dccb", true: colors.brand }}
        thumbColor="#fff"
        ios_backgroundColor="#d3dccb"
      />
    </View>
  );
}

function MenuItem({ icon, label, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.infoRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuIcon}>
        <Feather name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={20} color="#c0ccb8" />
    </TouchableOpacity>
  );
}

const CARD = glass.card;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 120, alignItems: "center" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textMuted },

  headerCard: {
    ...CARD,
    width: "100%",
    borderRadius: 28,
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  avatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 54 },
  avatarPlaceholder: {
    width: "100%", height: "100%", borderRadius: 54,
    backgroundColor: "#eaf5db", alignItems: "center", justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  name: { fontSize: 22, fontWeight: "800", color: DARK, marginTop: 14 },
  username: { fontSize: 14, color: "#7a8a70", marginTop: 2 },
  levelPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 14, backgroundColor: "rgba(173,241,75,0.28)",
    borderWidth: 1, borderColor: "rgba(173,241,75,0.5)",
  },
  levelText: { fontSize: 13, fontWeight: "700", color: colors.accent },

  statsRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
  statCard: {
    ...CARD, flex: 1, borderRadius: 20, alignItems: "center", paddingVertical: 16,
  },
  statNumber: { fontSize: 20, fontWeight: "800", color: DARK },
  statLabel: { fontSize: 12, color: colors.textMuted3, marginTop: 3 },

  section: {
    ...CARD, width: "100%", borderRadius: 22, padding: 6, marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: colors.textMuted3,
    textTransform: "uppercase", letterSpacing: 0.5,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6, paddingHorizontal: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14, padding: 14, marginHorizontal: 6,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    color: DARK, fontSize: 15,
  },

  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  infoLabel: { fontSize: 14, color: colors.textMuted, width: 92 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: "600", color: DARK, textAlign: "right" },

  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 15 },
  menuIcon: {
    width: 34, height: 34, borderRadius: 12, marginRight: 12,
    backgroundColor: "rgba(173,241,75,0.22)", alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: DARK },

  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: GREEN, borderRadius: 18, paddingVertical: 16,
    marginHorizontal: 6, marginTop: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#7db82c", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 14,
  },
  primaryButtonText: { color: "#1a2e10", fontSize: 16, fontWeight: "800" },
  modalPrimary: { width: "100%", marginHorizontal: 0, marginTop: 8 },

  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  prefLabel: { fontSize: 15, fontWeight: "700", color: DARK },
  prefDesc: { fontSize: 12.5, color: colors.textMuted3, marginTop: 2 },

  faqRow: { paddingVertical: 12, paddingHorizontal: 4 },
  faqQ: { fontSize: 14.5, fontWeight: "700", color: DARK, marginBottom: 3 },
  faqA: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  ghostButton: { alignItems: "center", paddingVertical: 14, marginTop: 4, marginHorizontal: 6 },
  ghostButtonText: { color: colors.textMuted3, fontSize: 15, fontWeight: "600" },

  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 18, paddingVertical: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  version: { fontSize: 12, color: "#a0b098", marginTop: 18 },

  modalOverlay: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%", ...CARD,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 28, padding: 24, alignItems: "center",
  },
  modalIcon: {
    width: 56, height: 56, borderRadius: 28, marginBottom: 14,
    backgroundColor: "rgba(224,48,48,0.12)", alignItems: "center", justifyContent: "center",
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: DARK, marginBottom: 6, textAlign: "center" },
  modalSub: { fontSize: 14, color: colors.textMuted3, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  dangerButton: {
    width: "100%", backgroundColor: colors.danger, borderRadius: 16,
    paddingVertical: 15, alignItems: "center",
  },
  dangerButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  genderOption: {
    width: "100%", backgroundColor: "rgba(173,241,75,0.2)",
    borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(173,241,75,0.4)",
  },
  genderText: { fontSize: 16, fontWeight: "700", color: colors.accent },
});
