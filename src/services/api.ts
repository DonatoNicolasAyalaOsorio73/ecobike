import { Platform } from "react-native";
import { getFirebaseAuth } from "./firebase";

// Server functions live in /api on the same Vercel deployment as the web app.
// Web in production calls them same-origin; native (and local `expo start`)
// needs the absolute deployment URL from EXPO_PUBLIC_API_URL.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PUT" | "DELETE", payload?: unknown): Promise<T> {
  if (!BASE && Platform.OS !== "web") {
    throw new Error("Falta EXPO_PUBLIC_API_URL (URL del despliegue en Vercel).");
  }
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Necesitas iniciar sesión.");
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? `Error del servidor (${res.status}).`), { status: res.status });
  return json as T;
}
