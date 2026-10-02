import React, { type ReactNode } from "react";
import { Modal } from "react-native";

export interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

/** Full-screen transparent modal (RN Modal; on web, RN-web's Modal also closes on Escape). */
export default function AppModal({ visible, onRequestClose, children }: AppModalProps) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose} statusBarTranslucent>
      {children}
    </Modal>
  );
}
