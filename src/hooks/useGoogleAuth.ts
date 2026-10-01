import { useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { signInWithGoogleIdToken } from "@/services/auth.service";

WebBrowser.maybeCompleteAuthSession();

/**
 * Wraps expo-auth-session's Google provider. Returns `available: false` when
 * no client ID is configured for this platform, so screens can hide the
 * button instead of showing a broken one — see .env.example.
 */
export function useGoogleAuth(onError: (message: string) => void) {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const available = Boolean(iosClientId || androidClientId || webClientId);

  // expo-auth-session's Google helpers are flagged deprecated upstream (in
  // favor of a native Google Sign-In SDK) but remain the only Expo-first
  // option that needs no extra native dependency / config plugin — good
  // enough until Google sign-in volume justifies the heavier native lib.
  //
  // The hook throws synchronously during render if its platform's client id
  // is missing, so when nothing is configured we feed it a placeholder
  // instead of skipping the call (hooks can't be conditional). `available`
  // stays false either way, and SocialRow never renders a button that could
  // call `promptAsync` with this placeholder.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: iosClientId ?? (available ? undefined : "unconfigured"),
    androidClientId: androidClientId ?? (available ? undefined : "unconfigured"),
    webClientId: webClientId ?? (available ? undefined : "unconfigured"),
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) {
        signInWithGoogleIdToken(idToken).catch((e) =>
          onError(e instanceof Error ? e.message : String(e))
        );
      }
    } else if (response?.type === "error") {
      onError("No se pudo completar el inicio de sesión con Google.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return { available, canPrompt: Boolean(request), promptAsync };
}
