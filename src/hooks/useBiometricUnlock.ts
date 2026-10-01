import { useCallback, useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricKind = "face" | "fingerprint" | "iris" | "none";

/**
 * Face ID / biometrics as a LOCAL UNLOCK for an already-authenticated
 * session (secure token already in SecureStore) — never a substitute for
 * signing in. See authStore.unlockWithBiometrics.
 */
export function useBiometricSupport() {
  const [kind, setKind] = useState<BiometricKind>("none");
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return;
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setEnrolled(isEnrolled);
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setKind("face");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setKind("fingerprint");
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setKind("iris");
      }
    })();
  }, []);

  const authenticate = useCallback(async (promptMessage: string) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    return result.success;
  }, []);

  return { kind, enrolled, supported: kind !== "none", authenticate };
}
