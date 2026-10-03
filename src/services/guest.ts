import * as Crypto from "expo-crypto";
import { kvDelete, kvGet, kvSet } from "./kv";

const GUEST_ID_KEY = "ecobike_guest_id_v1";
const GUEST_MODE_KEY = "ecobike_guest_mode_v1";

/** Stable per-device id that keys a signed-out guest's local data. */
export async function getOrCreateGuestId(): Promise<string> {
  const read = await kvGet(GUEST_ID_KEY);
  if (read) return read;
  const id = `guest_${Crypto.randomUUID()}`;
  await kvSet(GUEST_ID_KEY, id);
  return id;
}

/** Remembers "Explorar sin cuenta" so a reload (web) or relaunch keeps the guest inside the app. */
export async function setGuestMode(on: boolean) {
  if (on) await kvSet(GUEST_MODE_KEY, "1");
  else await kvDelete(GUEST_MODE_KEY);
}

export async function isGuestMode(): Promise<boolean> {
  return (await kvGet(GUEST_MODE_KEY)) === "1";
}
