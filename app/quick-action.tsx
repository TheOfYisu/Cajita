import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { ModalScreen, Card } from "@/src/components/ui";
import { IconName } from "@/src/theme";

interface ActionOption {
  icon: IconName;
  title: string;
  subtitle: string;
  route: string;
  tint: string;
}

const OPTIONS: ActionOption[] = [
  {
    icon: "arrow-down-circle",
    title: "Registrar gasto",
    subtitle: "Anotar una compra o salida de dinero",
    route: "/transaction/new?mode=expense",
    tint: "#EF4444",
  },
  {
    icon: "arrow-up-circle",
    title: "Registrar ingreso",
    subtitle: "Anotar un salario, abono o entrada",
    route: "/transaction/new?mode=income",
    tint: "#10B981",
  },
  {
    icon: "swap-horizontal",
    title: "Transferencia",
    subtitle: "Mover saldo entre tus propias cuentas",
    route: "/transaction/new?mode=transfer",
    tint: "#3B82F6",
  },
  {
    icon: "card",
    title: "Pagar tarjeta de crédito",
    subtitle: "Abonar a la deuda de una tarjeta",
    route: "/transaction/new?mode=paycard",
    tint: "#6366F1",
  },
  {
    icon: "cash",
    title: "Mi efectivo",
    subtitle: "Arqueo de billetes y monedas",
    route: "/cash",
    tint: "#F59E0B",
  },
  {
    icon: "people",
    title: "Nuevo préstamo o deuda",
    subtitle: "Registrar dinero prestado o recibido",
    route: "/loan/new",
    tint: "#8B5CF6",
  },
  {
    icon: "wallet",
    title: "Nueva cuenta",
    subtitle: "Crear cuenta bancaria, ahorro, tarjeta o CDT",
    route: "/account/new",
    tint: "#14B8A6",
  },
];

export default function QuickActionModal() {
  const { colors } = useTheme();

  const handleSelect = (route: string) => {
    router.replace(route as never);
  };

  return (
    <ModalScreen title="¿Qué deseas hacer?">
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Selecciona una acción rápida para continuar:
      </Text>
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.route}
            onPress={() => handleSelect(opt.route)}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: opt.tint + "1F" },
                  ]}
                >
                  <Ionicons name={opt.icon} size={22} color={opt.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {opt.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 13,
    marginBottom: 12,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
