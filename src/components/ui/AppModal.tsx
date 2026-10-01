import React from "react";
import { Modal } from "react-native";

import type { AppModalProps } from "./modalHost";

/** Full-screen transparent modal. Native: RN Modal. Web: see AppModal.web.tsx. */
export default function AppModal({ visible, onRequestClose, children }: AppModalProps) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose} statusBarTranslucent>
      {children}
    </Modal>
  );
}
