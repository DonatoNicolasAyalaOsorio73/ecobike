import { Platform } from "react-native";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDb } from "./firebase";
import { api } from "./api";
import { DEFAULT_NOTIF_PREFS, type NotificationPrefs } from "@/types/user";

/** Account-level settings stored on the server (shared by every device). */
export interface AccountPrefs {
  notif: NotificationPrefs;
  /** Appear in username search (usuarios_public.buscable). */
  searchable: boolean;
}

export async function getAccountPrefs(uid: string): Promise<AccountPrefs> {
  const [user, mirror] = await Promise.all([getDoc(doc(getDb(), "usuarios", uid)), getDoc(doc(getDb(), "usuarios_public", uid))]);
  return {
    notif: { ...DEFAULT_NOTIF_PREFS, ...(user.data()?.notifPrefs ?? {}) },
    searchable: mirror.data()?.buscable !== false,
  };
}

/** The server reads these before sending each push (api/_lib.js sendPush). */
export async function setNotificationPrefs(uid: string, prefs: NotificationPrefs) {
  await updateDoc(doc(getDb(), "usuarios", uid), { notifPrefs: prefs });
}

export async function setSearchable(uid: string, searchable: boolean) {
  await setDoc(doc(getDb(), "usuarios_public", uid), { buscable: searchable }, { merge: true });
}

/** Downloads (web) or shares (iOS/Android) a JSON file with all of the user's data. */
export async function exportMyData(): Promise<void> {
  const data = await api<Record<string, unknown>>("export", "GET");
  const json = JSON.stringify(data, null, 2);
  const name = `ecobike-datos-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const uri = `${cacheDirectory}${name}`;
  await writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Tus datos de EcoBike" });
  }
}

/** Revokes every session of this account on all devices. */
export async function signOutEverywhere() {
  await api("sessions", "POST", { action: "revoke" });
}
