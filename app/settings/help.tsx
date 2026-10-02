import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const FAQ: [string, string][] = [
  ["¿Cómo gano puntos?", "10 puntos por cada kilómetro y 20 extra por cada recorrido completado de más de 200 m. Los calcula nuestro servidor cuando tu recorrido se sincroniza."],
  ["No me aparecen los puntos de un recorrido", "Si estabas sin conexión, el recorrido se guarda en el teléfono y se sincroniza solo cuando vuelves a tener internet. Los recorridos con velocidades imposibles para una bicicleta no suman puntos."],
  ["¿Puedo usar EcoBike en la web y en el teléfono?", "Sí. Es la misma cuenta y la misma información: puntos, recorridos, amigos, mensajes y códigos se sincronizan entre la web y la app."],
  ["¿Cómo canjeo una recompensa?", "En Recompensas, elige una tienda, confirma el canje y muestra el QR o el código en la caja. Cada código se usa una sola vez. Necesitas tener tu correo verificado."],
  ["La app se detiene sola durante el recorrido", "Es la pausa automática: se activa cuando te detienes unos segundos y se reanuda al volver a moverte. Puedes desactivarla en Ajustes > Recorridos."],
  ["¿Mi ubicación es privada?", "El trazado GPS completo se queda en tu teléfono. A la nube solo sube el resumen del recorrido (distancia, duración, velocidad). Ningún amigo ve tu ubicación."],
  ["¿Cómo agrego amigos?", "En Amigos > Amigos, busca su nombre de usuario y envía una solicitud. Cuando la acepten podrán escribirse y compararse en el ranking."],
  ["¿Cómo borro mi cuenta?", "En Ajustes > Cuenta > Eliminar cuenta. Se borran de forma permanente tu perfil, recorridos, códigos, mensajes y foto. Antes puedes exportar tus datos."],
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <LargeTitleScreen title={"Centro de ayuda"} leading={<BackButton size={36} />} tabBar={false}>
          <GlassCard>
            {FAQ.map(([q, a], i) => {
              const expanded = open === i;
              return (
                <Animated.View key={q} layout={LinearTransition.springify().damping(18)} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => setOpen(expanded ? null : i)}
                    style={styles.q}
                  >
                    <Text style={{ color: colors.ink, fontWeight: "700", flex: 1 }}>{q}</Text>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.inkFaint} />
                  </Pressable>
                  {expanded && (
                    <Animated.Text entering={FadeIn.duration(200)} style={{ color: colors.inkSoft, lineHeight: 20, paddingBottom: 12 }}>
                      {a}
                    </Animated.Text>
                  )}
                </Animated.View>
              );
            })}
          </GlassCard>

          {SUPPORT ? (
            <GlassButton
              label="Escribir a soporte"
              icon="mail-outline"
              variant="secondary"
              onPress={() => Linking.openURL(`mailto:${SUPPORT}?subject=${encodeURIComponent("Soporte EcoBike")}`)}
              style={{ marginTop: 16 }}
            />
          ) : null}
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  q: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
});
