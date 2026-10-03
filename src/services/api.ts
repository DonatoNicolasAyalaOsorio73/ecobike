import { Platform } from "react-native";
import { getFirebaseAuth } from "./firebase";
import { E2E_SESSION } from "./e2e";

// Server functions live in /api on the same Vercel deployment as the web app.
// Web in production calls them same-origin; native (and local `expo start`)
// needs the absolute deployment URL from EXPO_PUBLIC_API_URL.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 20_000;

export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PUT" | "DELETE", payload?: unknown): Promise<T> {
  if (!BASE && Platform.OS !== "web") {
    throw new Error("Falta EXPO_PUBLIC_API_URL (URL del despliegue en Vercel).");
  }
  const user = E2E_SESSION ? { getIdToken: async () => E2E_SESSION!.token } : getFirebaseAuth().currentUser;
  if (!user) throw new Error("Necesitas iniciar sesión.");
  const token = await user.getIdToken();
  // A hung request must not leave the UI spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e: any) {
    // status 0 = network problem (callers treat it as retryable, e.g. ride sync).
    throw Object.assign(
      new Error(e?.name === "AbortError" ? "El servidor tardó demasiado. Inténtalo de nuevo." : "Sin conexión con el servidor. Revisa tu internet."),
      { status: 0 }
    );
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 5xx include a support reference so a user report can be traced in the logs.
    const ref = json.requestId ? ` (ref. ${String(json.requestId).slice(0, 8)})` : "";
    throw Object.assign(new Error((json.error ?? `Error del servidor (${res.status}).`) + ref), { status: res.status });
  }
  return json as T;
}
