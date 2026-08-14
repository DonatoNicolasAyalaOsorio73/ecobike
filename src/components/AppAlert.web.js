// In-frame glass alert host for web. React Native's Alert.alert renders an ugly
// browser dialog on web that spills outside the iPhone frame and looks nothing
// like the app. We route every alert through this single glass modal instead.
//
// Usage: mount <AlertHost /> once inside the phone frame, and (once) point
// Alert.alert at showAlert:  Alert.alert = showAlert  (done in App.web.tsx).
import React, { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { colors, glass } from "../theme";

let listener = null;
const queue = [];

// Signature-compatible with RN Alert.alert(title, message?, buttons?, options?)
export function showAlert(title, message, buttons) {
  const payload = { title, message, buttons };
  if (listener) listener(payload);
  else queue.push(payload);
}

export function AlertHost() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    listener = (payload) => setCurrent(payload);
    while (queue.length) setCurrent(queue.shift());
    return () => { listener = null; };
  }, []);

  if (!current) return null;

  const buttons =
    Array.isArray(current.buttons) && current.buttons.length
      ? current.buttons
      : [{ text: "Aceptar" }];

  const dismiss = (btn) => {
    setCurrent(null);
    if (btn && typeof btn.onPress === "function") btn.onPress();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss(null)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {current.title ? <Text style={styles.title}>{current.title}</Text> : null}
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={styles.buttons}>
            {buttons.map((btn, i) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  style={[
                    styles.btn,
                    isDestructive && styles.btnDestructive,
                    isCancel && styles.btnCancel,
                    !isCancel && !isDestructive && styles.btnPrimary,
                  ]}
                  onPress={() => dismiss(btn)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isDestructive && styles.btnTextOnDark,
                      isCancel && styles.btnTextCancel,
                    ]}
                  >
                    {btn.text || "Aceptar"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    ...glass.modal,
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14.5,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttons: { width: "100%", gap: 10 },
  btn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  btnDestructive: { backgroundColor: colors.danger },
  btnCancel: { backgroundColor: "rgba(0,0,0,0.05)" },
  btnText: { fontSize: 16, fontWeight: "700", color: colors.onBrand },
  btnTextOnDark: { color: "#fff" },
  btnTextCancel: { color: colors.textMuted3 },
});

export default AlertHost;
