import React from "react";
import { Text } from "react-native";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { useAuthStore } from "@/stores/authStore";

/**
 * Admin-only screens (deep links included) render nothing editable for other
 * roles. Only UX: every write is re-checked by the API.
 */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.profile?.role);
  if (role === "admin") return <>{children}</>;
  return (
    <LargeTitleScreen title="Administración" leading={<BackButton size={36} />} tabBar={false}>
      <GlassCard>
        <Text style={[type.subhead, { color: colors.inkSoft, textAlign: "center" }]}>No tienes permisos de administrador.</Text>
      </GlassCard>
    </LargeTitleScreen>
  );
}
