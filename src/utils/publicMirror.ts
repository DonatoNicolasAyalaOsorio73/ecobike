// The exact field allowlist mirrored to `usuarios_public/{uid}` (see
// auth.service.ts and firestore.rules `hasOnly([...])`) — kept in one place
// so this file and the rules can't silently drift apart.
// "username" is deliberately absent: only the server writes it, after
// reserving it in usernames/{name} (api/me.js), so a client can't
// impersonate a handle it never reserved.
export const PUBLIC_MIRROR_FIELDS = [
  "nombre",
  "apellido",
  "profileImageUrl",
  "puntosAcumulados",
  "amigos",
  "buscable",
] as const;

export function publicMirrorFields(data: {
  nombre?: string;
  apellido?: string;
  profileImageUrl?: string | null;
  puntosAcumulados?: number;
  amigos?: string[];
  /** false = hidden from username search (Ajustes > Privacidad). */
  buscable?: boolean;
}) {
  const fields: Record<string, unknown> = {};
  for (const key of PUBLIC_MIRROR_FIELDS) {
    if (data[key] !== undefined) fields[key] = data[key];
  }
  return fields;
}
