import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";

// Public routes (no sign-in): /legal/privacy and /legal/terms. On web these
// are the URLs to give the App Store / Play Console as the privacy policy.
const CONTACT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const UPDATED = "30 de septiembre de 2026";

type Section = [title: string, body: string];

const DOCS: Record<string, { title: string; sections: Section[] }> = {
  privacy: {
    title: "Política de privacidad",
    sections: [
      ["Quiénes somos", "EcoBike es una app de ciclismo urbano que registra tus recorridos, te da puntos y te permite canjearlos en tiendas aliadas."],
      [
        "Qué datos recogemos",
        "Cuenta: correo, nombre, apellido, nombre de usuario y foto de perfil (opcional).\n" +
          "Recorridos: distancia, duración, velocidad, desnivel, calorías estimadas y puntos de cada recorrido.\n" +
          "Ubicación: se usa solo mientras registras un recorrido, incluso con la pantalla bloqueada si lo permites. El trazado GPS completo se queda en tu dispositivo. Al sincronizar, enviamos una versión reducida del trazado solo para verificar que el recorrido fue en bicicleta y calcular tus puntos; el servidor la analiza y la descarta sin guardarla. En la nube solo queda el resumen del recorrido.\n" +
          "Social: tus amigos, solicitudes y tus puntos visibles para otros usuarios en búsquedas y rankings.\n" +
          "Canjes: los códigos que generas y si ya se usaron.",
      ],
      ["Para qué los usamos", "Para que la app funcione: calcular puntos, mostrar tu historial en todos tus dispositivos, conectar con amigos y validar canjes en tiendas. No vendemos tus datos ni los usamos para publicidad."],
      [
        "Quién los procesa",
        "Google Firebase (autenticación, base de datos y almacenamiento de fotos) y Vercel (servidor de la app web y de la API). Si inicias sesión con Google o Apple, ese proveedor confirma tu identidad.",
      ],
      ["Qué ven otros usuarios", "Tu nombre, nombre de usuario, foto, puntos y lista de amigos. Tu correo, fecha de nacimiento y recorridos no son visibles para otros."],
      [
        "Tus derechos",
        "Puedes editar tu perfil en Ajustes. Puedes eliminar tu cuenta en Ajustes > Eliminar cuenta: borra de forma permanente tu perfil, recorridos, códigos, foto, vínculos de amistad y conversaciones (para ambas personas), y también los datos guardados en el dispositivo.",
      ],
      ["Menores", "EcoBike no está dirigida a menores de 13 años."],
      ["Cambios", "Si cambiamos esta política te lo indicaremos en la app. Última actualización: " + UPDATED + "."],
      ["Contacto", CONTACT ? `Escríbenos a ${CONTACT}.` : "Puedes contactarnos desde la ficha de la app en la tienda."],
    ],
  },
  terms: {
    title: "Términos de uso",
    sections: [
      ["Uso de la app", "Usa EcoBike de forma responsable y respeta las normas de tránsito. La app no sustituye tu atención al camino; no la manipules mientras pedaleas."],
      [
        "Puntos y recompensas",
        "Los puntos se calculan en nuestro servidor a partir de la distancia de cada recorrido. Recorridos no plausibles para una bicicleta no suman puntos. Los puntos no tienen valor monetario, no son transferibles y pueden ajustarse si detectamos uso fraudulento.",
      ],
      ["Canjes", "Cada código de canje se puede usar una sola vez en la tienda aliada indicada. Las condiciones de cada recompensa las define la tienda."],
      ["Cuenta", "Eres responsable de la seguridad de tu cuenta. Podemos suspender cuentas que hagan trampa o abusen del servicio."],
      ["Responsabilidad", "La app se ofrece tal cual. No somos responsables de accidentes durante tus recorridos ni de la disponibilidad de las recompensas de terceros."],
      ["Cambios", "Podemos actualizar estos términos. Última actualización: " + UPDATED + "."],
    ],
  },
};

export default function LegalScreen() {
  const { colors } = useTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = DOCS[doc ?? ""] ?? DOCS.privacy;

  return (
    <LargeTitleScreen title={content.title} leading={<BackButton size={36} />} tabBar={false}>
          <GlassCard>
            {content.sections.map(([title, body]) => (
              <View key={title} style={{ marginBottom: 16 }}>
                <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
                <Text style={[styles.body, { color: colors.inkSoft }]}>{body}</Text>
              </View>
            ))}
          </GlassCard>
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 13.5, lineHeight: 20 },
});
