import React, { useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { createPortal } from "react-dom";
import { useModalHost, type AppModalProps } from "./modalHost";

/**
 * Web: inside the desktop iPhone frame, render into the frame's modal host
 * so sheets and scanners appear on the phone screen (not over the whole
 * browser window). Without a frame (mobile browsers) behave like RN Modal.
 */
export default function AppModal({ visible, onRequestClose, children }: AppModalProps) {
  const host = useModalHost();

  useEffect(() => {
    if (!visible || !host) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onRequestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, host, onRequestClose]);

  if (!host) {
    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose}>
        {children}
      </Modal>
    );
  }
  if (!visible) return null;
  return createPortal(<View style={StyleSheet.absoluteFill}>{children}</View>, host);
}
