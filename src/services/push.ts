import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { safeDeepLink } from "@/utils/deepLink";

// Show pushes while the app is open too.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/**
 * Stores this device's Expo push token on `usuarios/{uid}.pushToken`; the
 * server (api/_lib.js sendPush) reads it to notify friend requests.
 * Native only; needs a dev/EAS build (not Expo Go) with push credentials.
 */
export async function enablePush(uid: string): Promise<boolean> {
  if (Platform.OS === "web" || !Device.isDevice || !isFirebaseConfigured) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "General", importance: Notifications.AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await updateDoc(doc(getDb(), "usuarios", uid), { pushToken: data });
  return true;
}

export async function disablePush(uid: string) {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(getDb(), "usuarios", uid), { pushToken: null });
}

/** Opens the screen a tapped push points to (also when it launched the app). */
export function listenForPushTaps(open: (path: string) => void): () => void {
  if (Platform.OS === "web") return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    const path = safeDeepLink(r?.notification.request.content.data?.url);
    if (path) open(path);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
