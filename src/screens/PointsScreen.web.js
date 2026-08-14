// Web: Dimensions.get("window") returns browser window size, breaking the carousel.
// This file uses the iPhone 15 Pro frame dimensions (393×852) instead.
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  StyleSheet, Text, View, Image, SafeAreaView, Animated,
  TouchableOpacity, Modal, TouchableHighlight, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore, doc, getDoc, collection, addDoc, updateDoc, getDocs,
} from "@firebase/firestore";
import { getAuth } from "@firebase/auth";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, glass, shadows } from "../theme";

const PHONE_W = 393;
const PHONE_H = 852;
const ANCHO_CONTENEDOR = PHONE_W * 0.7;
const ESPACIO_CONTENEDOR = (PHONE_W - ANCHO_CONTENEDOR) / 2;
const ESPACIO = 10;
const ALTURA_BACKDROP = PHONE_H * 0.5;

const STORE_IMAGES = [
  require("./assets/merced.png"),
  require("./assets/red.png"),
  require("./assets/andino.png"),
];

const FALLBACK_STORES = [
  { id: 1, name: "La Merced",     logo: STORE_IMAGES[0], pointsRequired: 1 },
  { id: 2, name: "Red en linea",  logo: STORE_IMAGES[1], pointsRequired: 150 },
  { id: 3, name: "Centro Andino", logo: STORE_IMAGES[2], pointsRequired: 250 },
];

// Accepts a URL string, a bundled require, or nothing — always yields a source
// so cards/backdrops never render blank when Firestore stores lack a logo.
function imgSrc(logo, index = 0) {
  if (typeof logo === "string" && logo.trim()) return { uri: logo };
  if (logo && typeof logo !== "string") return logo; // bundled require
  return STORE_IMAGES[index % STORE_IMAGES.length];
}

// Liquid-glass QR card: frosted panel framing the QR + short code label
function QrCard({ code }) {
  return (
    <View style={styles.qrGlassCard}>
      <View style={styles.qrInner}>
        <QRCode value={code} size={168} backgroundColor="transparent" color={colors.ink} />
      </View>
      <Text style={styles.codesText}>{code.slice(0, 6)} · {code.slice(6, 12)}</Text>
    </View>
  );
}

function Backdrop({ scrollX, stores }) {
  return (
    <View style={[{ position: "absolute", height: ALTURA_BACKDROP, top: 0, width: PHONE_W }, StyleSheet.absoluteFillObject]}>
      {stores.map((store, index) => {
        const inputRange = [
          (index - 1) * ANCHO_CONTENEDOR,
          index * ANCHO_CONTENEDOR,
          (index + 1) * ANCHO_CONTENEDOR,
        ];
        const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0] });
        return (
          <Animated.Image
            key={store.id}
            source={imgSrc(store.logo, index)}
            style={[{ width: PHONE_W, height: ALTURA_BACKDROP, opacity }, StyleSheet.absoluteFillObject]}
          />
        );
      })}
      <LinearGradient
        colors={["transparent", "white"]}
        style={{ width: PHONE_W, height: ALTURA_BACKDROP, position: "absolute", bottom: 0 }}
      />
    </View>
  );
}

export default function PointsScreen() {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;
  const isFocused = useIsFocused();

  const [accumulatedPoints, setAccumulatedPoints] = useState(null);
  const [storesData, setStoresData] = useState(FALLBACK_STORES);
  const [selectedStore, setSelectedStore] = useState(null);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [allCodes, setAllCodes] = useState([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showInsufficientPointsModal, setShowInsufficientPointsModal] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showGeneratedCodesModal, setShowGeneratedCodesModal] = useState(false);
  const [showAllCodesModal, setShowAllCodesModal] = useState(false);

  const scrollX = React.useRef(new Animated.Value(0)).current;
  const listRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = (i) => {
    const idx = Math.max(0, Math.min(storesData.length - 1, i));
    const node = listRef.current;
    if (node?.scrollToOffset) node.scrollToOffset({ offset: idx * ANCHO_CONTENEDOR, animated: true });
  };

  useEffect(() => {
    if (!isFocused || !userUid) return;

    (async () => {
      const db = getFirestore();
      // Points
      try {
        const snap = await getDoc(doc(db, "usuarios", userUid));
        if (snap.exists()) {
          const data = snap.data();
          setAccumulatedPoints(data.puntosAcumulados);
          const stored = await AsyncStorage.getItem("puntosAcumulados");
          if (stored !== null) setAccumulatedPoints(parseInt(stored, 10));
        }
      } catch (e) { console.log("Error fetching points:", e); }

      // Stores from Firestore — fall back to FALLBACK_STORES if empty
      try {
        const snap = await getDocs(collection(db, "tiendas"));
        if (!snap.empty) {
          const stores = [];
          snap.forEach((d) => {
            const s = d.data();
            stores.push({ id: d.id, name: s.name, logo: s.logo, pointsRequired: s.pointsRequired, description: s.description, imagePath: s.imagePath });
          });
          setStoresData(stores);
        }
      } catch (e) { console.error("Error fetching stores:", e); }
    })();
  }, [isFocused, userUid]);

  const generateCodes = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let j = 0; j < 25; j++) code += chars[Math.floor(Math.random() * chars.length)];
    const codes = [code];
    setGeneratedCodes(codes);
    return codes; // ponytail: return to avoid stale-state closure
  };

  const loadAllCodes = async () => {
    if (!userUid) return;
    const db = getFirestore();
    try {
      const snap = await getDocs(collection(doc(db, "usuarios", userUid), "codigos_canjeados"));
      setAllCodes(snap.docs.map((d) => d.data().code));
    } catch (e) { console.error("Error loading codes:", e); }
  };

  const handleConfirmRedeem = async () => {
    setShowConfirmationModal(false);
    if (!userUid || accumulatedPoints < selectedStore.pointsRequired) {
      setShowInsufficientPointsModal(true);
      return;
    }
    const db = getFirestore();
    try {
      const ref = doc(db, "usuarios", userUid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const newPoints = snap.data().puntosAcumulados - selectedStore.pointsRequired;
        if (newPoints < 0) { setShowInsufficientPointsModal(true); return; }
        await updateDoc(ref, { puntosAcumulados: newPoints });
        setAccumulatedPoints(newPoints);
        await AsyncStorage.setItem("puntosAcumulados", newPoints.toString());
        const newCodes = generateCodes();
        setShowGeneratedCodesModal(true);
        const codesCol = collection(ref, "codigos_canjeados");
        for (const c of newCodes) {
          await addDoc(codesCol, { code: c, store: selectedStore.name, userId: userUid });
        }
      }
    } catch (e) { console.log("Redeem error:", e); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <Backdrop scrollX={scrollX} stores={storesData} />
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsText}>Puntos acumulados: {accumulatedPoints ?? "—"}</Text>
      </View>

      <Animated.FlatList
        ref={listRef}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: (e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / ANCHO_CONTENEDOR);
              setActiveIndex((prev) => (i !== prev ? i : prev));
            },
          }
        )}
        showsHorizontalScrollIndicator={false}
        horizontal={true}
        snapToAlignment="start"
        contentContainerStyle={{ paddingTop: 200, paddingHorizontal: ESPACIO_CONTENEDOR, paddingBottom: 100 }}
        snapToInterval={ANCHO_CONTENEDOR}
        decelerationRate="fast"
        scrollEventThrottle={16}
        data={storesData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ANCHO_CONTENEDOR,
            index * ANCHO_CONTENEDOR,
            (index + 1) * ANCHO_CONTENEDOR,
          ];
          const scrollY = scrollX.interpolate({ inputRange, outputRange: [0, -50, 0] });
          return (
            <View style={{ width: ANCHO_CONTENEDOR }}>
              <Animated.View style={[styles.posterCard, { transform: [{ translateY: scrollY }] }]}>
                <Image source={imgSrc(item.logo, index)} style={styles.posterImage} resizeMode="cover" />
                <Text style={styles.storeName}>{item.name}</Text>
                {item.description ? <Text style={styles.storeDesc}>{item.description}</Text> : null}
                <View style={styles.pointsPill}>
                  <Text style={styles.pointsPillText}>★ {item.pointsRequired} puntos</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setSelectedStore(item); setShowConfirmationModal(true); }}
                  style={styles.storeButton}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: colors.textDark, fontWeight: "bold" }}>Canjear descuento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewAllCodesButton}
                  onPress={() => { loadAllCodes(); setShowAllCodesModal(true); }} activeOpacity={0.7}>
                  <Text style={styles.buttonTexts}>Mis códigos</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Carousel controls — reliable navigation on desktop (mouse can't drag horizontally) */}
      {storesData.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navArrow, styles.navLeft, activeIndex === 0 && styles.navDisabled]}
            onPress={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            activeOpacity={0.8}
          >
            <Feather name="chevron-left" size={26} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navArrow, styles.navRight, activeIndex === storesData.length - 1 && styles.navDisabled]}
            onPress={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === storesData.length - 1}
            activeOpacity={0.8}
          >
            <Feather name="chevron-right" size={26} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.dotsRow} pointerEvents="none">
            {storesData.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      )}

      <Modal visible={showConfirmationModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Estás seguro de canjear el descuento en el restaurante?</Text>
            <TouchableHighlight style={styles.modalButton} onPress={handleConfirmRedeem}>
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableHighlight>
            <TouchableHighlight style={styles.modalButton2} onPress={() => setShowConfirmationModal(false)}>
              <Text style={{ color: "white", fontWeight: "bold" }}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showInsufficientPointsModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>No tienes suficientes puntos para realizar este descuento.</Text>
            <TouchableHighlight style={styles.modalButton} onPress={() => setShowInsufficientPointsModal(false)}>
              <Text style={styles.buttonText}>Aceptar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showAllCodesModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={{ paddingVertical: 90, alignItems: "center", width: "100%" }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Códigos Canjeados</Text>
              {allCodes.length === 0 ? (
                <Text style={styles.emptyCodes}>Aún no has canjeado ningún código.</Text>
              ) : (
                allCodes.map((code, i) => <QrCard key={i} code={code} />)
              )}
              <TouchableHighlight style={styles.modalButton} onPress={() => setShowAllCodesModal(false)}>
                <Text style={styles.buttonText}>Cerrar</Text>
              </TouchableHighlight>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {generatedCodes.length > 0 && (
        <Modal visible={showGeneratedCodesModal} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>¡Disfruta tu recompensa!</Text>
              <Text style={styles.rewardSub}>Muestra este código QR en la tienda</Text>
              {generatedCodes.map((code, i) => <QrCard key={i} code={code} />)}
              <TouchableHighlight style={styles.modalButton} onPress={() => setShowGeneratedCodesModal(false)}>
                <Text style={styles.buttonText}>Listo</Text>
              </TouchableHighlight>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  navArrow: {
    position: "absolute",
    top: 330,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  navLeft: { left: 6 },
  navRight: { right: 6 },
  navDisabled: { opacity: 0.35 },
  dotsRow: {
    position: "absolute",
    bottom: 108,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 20,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(42,82,9,0.25)" },
  dotActive: { width: 18, backgroundColor: colors.accent },
  posterCard: {
    marginHorizontal: ESPACIO,
    padding: ESPACIO + 4,
    borderRadius: 34,
    alignItems: "center",
    // ponytail: liquid-glass card over the store backdrop image
    backgroundColor: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  posterImage: {
    width: "100%",
    height: 200,
    borderRadius: 24,
    marginBottom: 12,
  },
  storeName: { fontWeight: "800", fontSize: 24, color: colors.textDark, textAlign: "center" },
  storeDesc: { fontSize: 13, color: "#5a7050", textAlign: "center", marginTop: 4 },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(173,241,75,0.28)",
    borderWidth: 1,
    borderColor: "rgba(173,241,75,0.5)",
  },
  pointsPillText: { fontSize: 13, fontWeight: "700", color: "#2a5209" },
  storeButton: {
    backgroundColor: colors.brand,
    padding: 10,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: colors.brandShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsContainer: {
    alignItems: "center",
    top: 76,
    backgroundColor: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    width: 280,
    height: 52,
    justifyContent: "center",
    position: "absolute",
    borderRadius: 20,
    left: (PHONE_W - 280) / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    zIndex: 5,
  },
  codesText: { fontSize: 13, marginTop: 12, textAlign: "center", color: "#5a7050", fontWeight: "600", letterSpacing: 1 },
  qrContainer: { justifyContent: "center", alignItems: "center", marginVertical: 4 },
  emptyCodes: { fontSize: 14, color: "#8a9a80", textAlign: "center", marginBottom: 12 },
  rewardSub: { fontSize: 13, color: "#5a7050", textAlign: "center", marginTop: -6, marginBottom: 16 },
  qrGlassCard: {
    marginVertical: 10,
    padding: 18,
    borderRadius: 26,
    alignItems: "center",
    backgroundColor: "rgba(173,241,75,0.14)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderWidth: 1,
    borderColor: "rgba(173,241,75,0.4)",
    shadowColor: colors.brandShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  qrInner: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  viewAllCodesButton: {
    backgroundColor: colors.brand,
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonTexts: { color: "#3e3742", fontSize: 13, fontWeight: "bold" },
  pointsText: { fontSize: 18, fontWeight: "bold" },
  buttonText: { color: "#3e3742", fontSize: 16, fontWeight: "bold" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    width: "88%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  modalText: { fontSize: 17, fontWeight: "700", marginBottom: 14, textAlign: "center", color: colors.textDark },
  modalButton: {
    backgroundColor: colors.brand,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    width: "100%",
  },
  modalButton2: {
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    width: "100%",
  },
});
