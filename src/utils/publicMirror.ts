// The exact field allowlist mirrored to `usuarios_public/{uid}` (see
// auth.service.ts and firestore.rules `hasOnly([...])`) — kept in one place
// so this file and the rules can't silently drift apart.
export const PUBLIC_MIRROR_FIELDS = [
  "username",
  "nombre",
  "apellido",
  "profileImageUrl",
  "puntosAcumulados",
  "amigos",
] as const;

export function publicMirrorFields(data: {
  username?: string;
  nombre?: string;
  apellido?: string;
  profileImageUrl?: string | null;
  puntosAcumulados?: number;
  amigos?: string[];
}) {
  const fields: Record<string, unknown> = {};
  for (const key of PUBLIC_MIRROR_FIELDS) {
    if (data[key] !== undefined) fields[key] = data[key];
  }
  return fields;
}
