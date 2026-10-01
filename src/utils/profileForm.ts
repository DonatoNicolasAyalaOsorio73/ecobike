// Pure validation/formatting for the edit-profile form (tested in __tests__/profileForm.test.ts).

export const BIO_MAX = 160;
export const MIN_AGE = 13;

export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  birthDate: string; // "DD/MM/AAAA" as typed
  gender: string;
  city: string;
  bikeType: string;
  experience: string;
  ridingGoal: string;
  hasPhoto: boolean;
}

export function validateName(v: string, label: string): string | null {
  const t = v.trim();
  if (!t) return `Escribe tu ${label}.`;
  if (t.length > 40) return `Máximo 40 caracteres.`;
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(t)) return `Usa solo letras.`;
  return null;
}

/** Same rule the server enforces (api/me.js). */
export function validateUsername(v: string): string | null {
  const t = v.trim().replace(/^@/, "").toLowerCase();
  if (t.length < 3) return "Mínimo 3 caracteres.";
  if (t.length > 20) return "Máximo 20 caracteres.";
  if (!/^[a-z0-9._]+$/.test(t)) return "Solo letras minúsculas, números, punto y guion bajo.";
  return null;
}

/** Live input mask: keeps digits and inserts slashes → "DD/MM/AAAA". */
export function maskBirthDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "DD/MM/AAAA" → ISO "AAAA-MM-DD" (empty is allowed: the field is optional). */
export function parseBirthDate(v: string, now = new Date()): { iso: string | null; error: string | null } {
  if (!v.trim()) return { iso: null, error: null };
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return { iso: null, error: "Usa el formato DD/MM/AAAA." };
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return { iso: null, error: "Esa fecha no existe." };
  let age = now.getFullYear() - year;
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age--;
  if (age < MIN_AGE) return { iso: null, error: `Debes tener al menos ${MIN_AGE} años.` };
  if (age > 110) return { iso: null, error: "Revisa el año." };
  return { iso: `${m[3]}-${m[2]}-${m[1]}`, error: null };
}

/** ISO "AAAA-MM-DD" → "DD/MM/AAAA" for the input. */
export function isoToBirthInput(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

const COMPLETION_FIELDS: { key: keyof ProfileFormValues; hint: string }[] = [
  { key: "hasPhoto", hint: "Agrega una foto" },
  { key: "firstName", hint: "Escribe tu nombre" },
  { key: "lastName", hint: "Agrega tu apellido" },
  { key: "bio", hint: "Cuéntanos sobre ti en tu biografía" },
  { key: "city", hint: "Indica tu ciudad" },
  { key: "birthDate", hint: "Agrega tu fecha de nacimiento" },
  { key: "bikeType", hint: "Elige tu tipo de bicicleta" },
  { key: "experience", hint: "Indica tu nivel" },
  { key: "ridingGoal", hint: "Elige tu objetivo" },
];

/** 0..1 completion and the next suggested field (for the progress card). */
export function profileCompletion(v: ProfileFormValues): { ratio: number; nextHint: string | null } {
  const filled = COMPLETION_FIELDS.filter((f) => (typeof v[f.key] === "boolean" ? v[f.key] : String(v[f.key]).trim().length > 0));
  const next = COMPLETION_FIELDS.find((f) => !(typeof v[f.key] === "boolean" ? v[f.key] : String(v[f.key]).trim().length > 0));
  return { ratio: filled.length / COMPLETION_FIELDS.length, nextHint: next?.hint ?? null };
}

/** Pragmatic email check (the real verification is the confirmation email). */
export function validateEmail(v: string): string | null {
  const t = v.trim();
  if (!t) return "Escribe tu correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "Ese correo no parece válido.";
  return null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Muy débil" | "Débil" | "Aceptable" | "Fuerte" | "Muy fuerte";
  error: string | null;
}

/** Length + character variety; minimum 8 characters to be accepted. */
export function passwordStrength(pw: string): PasswordStrength {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (variety >= 2) score++;
  if (variety >= 3 && pw.length >= 10) score++;
  if (/^(.)\1+$/.test(pw) || /^(1234|abcd|password|contraseña|qwerty)/i.test(pw)) score = Math.min(score, 1);
  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"] as const;
  return { score: score as PasswordStrength["score"], label: labels[score], error: pw.length < 8 ? "Mínimo 8 caracteres." : null };
}
