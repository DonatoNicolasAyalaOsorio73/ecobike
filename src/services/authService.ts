import { getAuth } from 'firebase/auth';

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Este correo ya está registrado.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña es muy débil (mínimo 6 caracteres).',
  'auth/user-not-found': 'No existe una cuenta con este correo.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
  'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
};

export const firebaseErrorToSpanish = (err: any): string =>
  FIREBASE_ERRORS[err?.code] ?? 'Ocurrió un error. Intenta de nuevo.';

export const getCurrentUser = () => getAuth().currentUser;

export default { getCurrentUser };
