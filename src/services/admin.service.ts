import { api } from "./api";
import { toDataUrl } from "./imageData";

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

export const getKpis = () => api<Kpis>("users?stats=1", "GET");

export const listStores = () =>
  api<{ stores: AdminStore[] }>("stores", "GET").then((r) => r.stores.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
export const saveStore = (s: Partial<AdminStore>) => api<{ store: AdminStore }>("stores", s.id ? "PUT" : "POST", s).then((r) => r.store);
export const deleteStore = (id: string) => api("stores", "DELETE", { id });

// Search text (possibly an email) goes in the body, never the URL (AD-14).
export const searchUsers = (q = "", after?: string) =>
  q
    ? api<{ users: AdminUserSummary[]; next: string | null }>("users", "POST", { q })
    : api<{ users: AdminUserSummary[]; next: string | null }>(`users${after ? `?after=${encodeURIComponent(after)}` : ""}`, "GET");
export const getUser = (id: string) => api<{ user: AdminUserDetail; logs: AdminLog[] }>(`users?id=${encodeURIComponent(id)}`, "GET");
export const updateUser = (patch: { id: string; role?: Role; storeId?: string; points?: number; reason?: string; expectedPoints?: number; disabled?: boolean; nombre?: string; apellido?: string }) =>
  api<{ user: AdminUserDetail; logs: AdminLog[] }>("users", "PUT", patch);
export const deleteUser = (id: string, reason: string) => api("users", "DELETE", { id, reason });

export const validateCode = (code: string, confirm: boolean) => api<{ code: string; store: string; status: string }>("validate", "POST", { code, confirm });

/** Turns a picked image into a store logo: a 256 px WebP data URL saved on the store document. */
export async function uploadStoreLogo(localUri: string): Promise<string> {
  const logo = await toDataUrl(localUri, 256, "webp", 0.85);
  if (logo.length > 300_000) throw new Error("El logo es demasiado pesado. Usa una imagen más simple.");
  return logo;
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
    case "code.validate":
      return `Código validado: ${d.code ?? ""} (${d.store ?? ""})`;
    case "store.reset":
      return `Catálogo reemplazado (${d.stores?.length ?? 0} tiendas)`;
    case "store.delete":
      return `Tienda eliminada: ${d.name ?? ""}`;
    default:
      return l.action;
  }
}
