import React from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { ModalScreen, Card, Button, Label } from "@/src/components/ui";
import { IconName } from "@/src/theme";

interface MenuOptionItem {
  icon: IconName;
  title: string;
  subtitle: string;
  route: string;
  tint: string;
}

const MENU_OPTIONS: MenuOptionItem[] = [
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
    subtitle: "Anotar un salario o entrada de dinero",
    route: "/transaction/new?mode=income",
    tint: "#10B981",
  },
  {
    icon: "swap-horizontal",
    title: "Transferencia",
    subtitle: "Mover saldo entre tus cuentas",
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
    subtitle: "Crear cuenta bancaria, ahorro o tarjeta",
    route: "/account/new",
    tint: "#14B8A6",
  },
];

const GUIDES: {
  icon: IconName;
  title: string;
  steps: string[];
}[] = [
  {
    icon: "radio-button-on",
    title: "Botón de Acción (iPhone 15 Pro / 16 / 16 Pro)",
    steps: [
      "Abre la app Ajustes de tu iPhone y entra en «Botón de acción».",
      "Desliza hasta «Atajo» y toca «Seleccionar un atajo…».",
      "Busca «Cajita» y selecciona el atajo único «Acción rápida en Cajita».",
      "Al presionar el Botón de Acción, iOS desplegará el menú «¿Qué deseas hacer en Cajita?» para que elijas al instante.",
    ],
  },
  {
    icon: "hand-left",
    title: "Doble o Triple Toque Atrás (Toque posterior)",
    steps: [
      "En tu iPhone ve a Ajustes → Accesibilidad → Tocar → Toque posterior.",
      "Elige «Tocar dos veces» o «Tocar tres veces».",
      "Baja a la sección «Atajos» y selecciona «Acción rápida en Cajita».",
      "Cada vez que des doble toque atrás, aparecerá el menú de opciones de Cajita.",
    ],
  },
  {
    icon: "apps",
    title: "Menú rápido en el icono (Haptic Touch)",
    steps: [
      "Mantén presionado el icono de Cajita en la pantalla de inicio de tu iPhone.",
      "Aparecerá el menú contextual con acceso directo a Registrar gasto, Registrar ingreso, Transferencia y Mi efectivo.",
    ],
  },
];

export default function ShortcutsScreen() {
  const { colors } = useTheme();

  const openShortcutsApp = () => {
    Linking.openURL("shortcuts://").catch(() => {});
  };

  return (
    <ModalScreen title="Acciones y Atajos de iOS">
      <Card style={{ marginBottom: 14 }}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.badgeIcon,
              { backgroundColor: colors.accent + "1F" },
            ]}
          >
            <Ionicons name="flash" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              1 Atajo en segundo plano (sin abrir la app)
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              «Acción rápida en Cajita» · Botón de Acción · Doble toque atrás
            </Text>
          </View>
        </View>
        <Text
          style={[styles.body, { color: colors.textMuted, marginTop: 10 }]}
        >
          Todo está centralizado en un único atajo llamado «Acción rápida en
          Cajita» que se ejecuta sin abrir la app. Al activarlo con el Botón de
          Acción o el Doble Toque Atrás, iOS despliega un menú flotante en la
          parte superior de tu pantalla donde eliges si es Gasto, Ingreso,
          Transferencia o Pago de tarjeta, ingresas el monto, eliges tu cuenta y
          categoría real de Cajita, y queda guardado al instante.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button
            title="Probar menú de acción rápida"
            icon="grid-outline"
            onPress={() => router.push("/quick-action" as never)}
          />
        </View>
      </Card>

      <Label>Opciones incluidas en el menú del atajo</Label>
      <View style={{ gap: 10, marginBottom: 16 }}>
        {MENU_OPTIONS.map((item) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Card style={{ padding: 14 }}>
              <View style={styles.actionRow}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: item.tint + "1F" },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={item.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.actionSub, { color: colors.textMuted }]}
                  >
                    {item.subtitle}
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

      <Label>Cómo configurarlo en tu iPhone</Label>
      <View style={{ gap: 10, marginBottom: 16 }}>
        {GUIDES.map((g) => (
          <Card key={g.title} style={{ padding: 14 }}>
            <View style={styles.guideHeader}>
              <View
                style={[
                  styles.guideIcon,
                  { backgroundColor: colors.accent + "18" },
                ]}
              >
                <Ionicons name={g.icon} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.guideTitle, { color: colors.text }]}>
                {g.title}
              </Text>
            </View>
            <View style={{ gap: 6, marginTop: 8 }}>
              {g.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={[styles.stepNumber, { color: colors.accent }]}>
                    {idx + 1}.
                  </Text>
                  <Text style={[styles.stepText, { color: colors.textMuted }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </View>

      <Button
        title="Abrir la app Atajos de iOS"
        icon="open-outline"
        variant="ghost"
        onPress={openShortcutsApp}
      />
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guideIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  guideTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "800",
    width: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
