import React, { useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import GlassButton from "@/components/ui/GlassButton";

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
}

/** Full-screen QR scanner (iOS, Android and web). Calls onScanned once per opening. */
export default function QrScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const onShow = () => {
    handled.current = false;
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  };

  return (
    <Modal visible={visible} animationType="slide" onShow={onShow} onRequestClose={onClose} supportedOrientations={["portrait"]}>
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current || !data) return;
              handled.current = true;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onScanned(data);
            }}
          />
        ) : (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={40} color="#fff" />
            <Text style={styles.text}>
              {permission && !permission.canAskAgain
                ? "El acceso a la cámara está bloqueado. Actívalo en los ajustes del dispositivo."
                : "Necesitamos la cámara para escanear el código QR del cliente."}
            </Text>
            {permission?.canAskAgain !== false && (
              <GlassButton label="Permitir cámara" icon="camera" onPress={requestPermission} style={{ marginTop: 16, alignSelf: "stretch" }} />
            )}
          </View>
        )}

        {permission?.granted && <View pointerEvents="none" style={styles.frame} />}

        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar escáner" onPress={onClose} style={styles.close} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        {permission?.granted && <Text style={styles.hint}>Apunta al QR del cliente</Text>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  text: { color: "#fff", textAlign: "center", marginTop: 12, fontSize: 15 },
  frame: {
    position: "absolute",
    alignSelf: "center",
    top: "30%",
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#ADF14B",
  },
  close: { position: "absolute", top: 56, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  hint: { position: "absolute", bottom: 80, alignSelf: "center", color: "#fff", fontSize: 15, fontWeight: "700" },
});
