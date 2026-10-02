import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { api } from "./api";
import { getFirebaseStorage } from "./firebase";

// Admin panel client. Every call goes through /api/* (Vercel), which
// re-checks the admin role server-side and writes the audit log; the same
// code runs on Expo (iOS/Android) and web.

export type Role = "user" | "partner" | "admin";
export const ROLE_LABEL: Record<Role, string> = { user: "Usuario", partner: "Partner", admin: "Admin" };

export interface AdminStore {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  pointsRequired: number | string;
  isActive?: boolean;
}

export interface AdminUserSummary {
  uid: string;
  username: string | null;
  nombre: string;
  apellido: string;
  email: string | null;
  photo: string | null;
  role: Role;
  storeId: string | null;
  points: number;
  active: boolean;
}

export interface AdminLog {
  id: string;
  adminUid: string;
  action: string;
  details: Record<string, any>;
  at: number | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  disabled: boolean;
  providers: string[];
  createdAt: string | null;
  lastSignIn: string | null;
  emailVerified: boolean;
  stats: { rides: number; verifiedRides: number; codes: number };
}

export interface Kpis {
  users: number;
  ridesWeek: number;
  kmWeek: number;
  pointsWeek: number;
  redemptionsWeek: number;
  codesUsedTotal: number;
  stores: number;
}

export const getKpis = () => api<Kpis>("admin-stats", "GET");

export const listStores = () =>
  api<{ stores: AdminStore[] }>("stores", "GET").then((r) => r.stores.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
export const saveStore = (s: Partial<AdminStore>) => api<{ store: AdminStore }>("stores", s.id ? "PUT" : "POST", s).then((r) => r.store);
export const deleteStore = (id: string) => api("stores", "DELETE", { id });

export const searchUsers = (q = "", after?: string) =>
  api<{ users: AdminUserSummary[]; next: string | null }>(`users?q=${encodeURIComponent(q)}${after ? `&after=${encodeURIComponent(after)}` : ""}`, "GET");
export const getUser = (id: string) => api<{ user: AdminUserDetail; logs: AdminLog[] }>(`users?id=${encodeURIComponent(id)}`, "GET");
export const updateUser = (patch: { id: string; role?: Role; storeId?: string; points?: number; reason?: string; expectedPoints?: number; disabled?: boolean; nombre?: string; apellido?: string }) =>
  api<{ user: AdminUserDetail; logs: AdminLog[] }>("users", "PUT", patch);
export const deleteUser = (id: string, reason: string) => api("users", "DELETE", { id, reason });

export const validateCode = (code: string, confirm: boolean) => api<{ code: string; store: string; status: string }>("validate", "POST", { code, confirm });

const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads a picked image as a store logo (Storage rules allow admins only,
 * jpeg/png/webp under 2 MB) and returns its public https URL.
 */
export async function uploadStoreLogo(storeKey: string, localUri: string, mimeType?: string | null): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const contentType = mimeType && LOGO_TYPES.includes(mimeType) ? mimeType : blob.type && LOGO_TYPES.includes(blob.type) ? blob.type : "image/jpeg";
  if (blob.size > 2 * 1024 * 1024) throw new Error("El logo debe pesar menos de 2 MB.");
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const fileRef = ref(getFirebaseStorage(), `stores/${storeKey}/logo-${Date.now()}.${ext}`);
  await uploadBytes(fileRef, blob, { contentType, cacheControl: "public,max-age=31536000" });
  return getDownloadURL(fileRef);
}

/** Human line for an audit entry. */
export function describeLog(l: Pick<AdminLog, "action" | "details">): string {
  const d = l.details ?? {};
  switch (l.action) {
    case "user.update": {
      const parts: string[] = [];
      if (d.points) parts.push(`Puntos ${d.points.from} → ${d.points.to}: ${d.points.reason}`);
      if (d.role) parts.push(`Rol ${d.role.from} → ${d.role.to}`);
      if (d.disabled) parts.push(d.disabled.to ? "Cuenta suspendida" : "Cuenta reactivada");
      if (d.nombre || d.apellido) parts.push("Nombre editado");
      return parts.join(" · ") || "Perfil actualizado";
    }
    case "user.delete":
      return `Usuario eliminado: ${d.reason ?? ""}`.trim();
    case "store.create":
      return `Tienda creada: ${d.name ?? ""}`;
    case "store.update":
      return "Tienda actualizada";
    case "store.delete":
      return `Tienda eliminada: ${d.name ?? ""}`;
    default:
      return l.action;
  }
}
