import { createContext, useContext, type ReactNode } from "react";

export interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

/** DOM node inside the web iPhone frame where AppModal portals its content (null = no frame). */
export const ModalHostContext = createContext<HTMLElement | null>(null);
export const useModalHost = () => useContext(ModalHostContext);
