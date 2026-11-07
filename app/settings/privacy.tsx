import React from "react";
import { View, Text, Alert, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useApp } from "@/src/store/appStore";
import { ModalScreen, Card, Button, Label } from "@/src/components/ui";
import { clearAllData } from "@/src/services/csvImportService";
import { seedDefaultCategories } from "@/src/services/categoryService";
import { syncSubscriptionNotifications } from "@/src/services/notificationService";
import { IconName } from "@/src/theme";

export const PRIVACY_POLICY_URL =
  "https://github.com/TheOfYisu/Cajita/blob/main/PRIVACY.md";

const PILLARS: {
  icon: IconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "shield-checkmark",
    title: "100 % Local-First (Cero servidores propios)",
    body: "Cajita no recopila, transmite, vende ni comparte tus datos personales o financieros. No existen cuentas de usuario obligatorias ni servidores del desarrollador.",
  },
  {
    icon: "lock-closed",
    title: "Base de datos cifrada con SQLCipher (AES-256)",
    body: "Todas tus cuentas, movimientos, presupuestos, préstamos y contactos viven en una base SQLite local cifrada con AES-256-CBC y HMAC-SHA256. La clave se resguarda en el llavero seguro por hardware del sistema (Keychain en iOS / Keystore en Android).",
  },
  {
    icon: "eye-off",
    title: "Sin publicidad, analíticas ni rastreadores",
    body: "La app es completamente gratuita y no incorpora SDKs publicitarios (no utiliza AD_ID ni IDFA), telemetría ni rastreadores de terceros. El enlace opcional a Ko-fi se abre en tu navegador externo y no recopila datos dentro de la app.",
  },
  {
    icon: "cloud-done",
    title: "Copia en iCloud privada (solo iOS)",
    body: "En iOS, el archivo cifrado cajita.db se respalda directamente en el contenedor privado de tu propio Apple ID (iCloud.com.cajita.app) y la clave viaja por tu iCloud Keychain personal. El desarrollador no tiene acceso a tu iCloud ni a tu clave.",
  },
  {
    icon: "calculator",
    title: "Herramienta contable personal (No es un banco)",
    body: "Cajita es una libreta de registro contable y presupuesto manual/offline. No se conecta con entidades bancarias, no procesa pagos ni transferencias de dinero real, ni otorga préstamos o créditos reales.",
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { refresh } = useApp();

  const onOpenWebPolicy = () => {
    void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  const onDeleteAllLocalData = () => {
    Alert.alert(
      "Borrar todos los datos locales",
      "Esta acción eliminará permanentemente todas las cuentas, movimientos, préstamos, personas, presupuestos y gastos fijos guardados en este dispositivo. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: async () => {
            try {
              clearAllData();
              seedDefaultCategories();
              await syncSubscriptionNotifications();
              refresh();
              Alert.alert(
                "Datos eliminados",
                "Se han borrado todos los registros locales de este dispositivo.",
              );
            } catch (e) {
              Alert.alert("Error", String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <ModalScreen title="Privacidad y datos">
      <Card style={{ marginBottom: 14 }}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.badgeIcon,
              { backgroundColor: colors.positive + "20" },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={22}
              color={colors.positive}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Tus finanzas son solo tuyas
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              Política de Privacidad · Última actualización: Nov 2026
            </Text>
          </View>
        </View>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            lineHeight: 19,
            marginTop: 10,
          }}
        >
          Cajita está diseñada para que ningún dato salga de tu control. Todo lo
          que registras se procesa y almacena directamente en tu teléfono.
        </Text>
      </Card>

      <Label>Principios de privacidad</Label>
      {PILLARS.map((p) => (
        <Card key={p.title} style={{ marginBottom: 10 }}>
          <View style={styles.pillarHeader}>
            <Ionicons name={p.icon} size={19} color={colors.accent} />
            <Text style={[styles.pillarTitle, { color: colors.text }]}>
              {p.title}
            </Text>
          </View>
          <Text
            style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}
          >
            {p.body}
          </Text>
        </Card>
      ))}

      <Label>Permisos del dispositivo</Label>
      <Card style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          • <Text style={{ fontWeight: "700", color: colors.text }}>Biometría (Face ID / Touch ID / Huella):</Text>{" "}
          se usa únicamente de forma local a través del sistema operativo si activas el bloqueo de la app en Ajustes → Seguridad. Cajita nunca lee ni almacena tu huella o rostro.{"\n\n"}
          • <Text style={{ fontWeight: "700", color: colors.text }}>Notificaciones locales:</Text>{" "}
          se programan en el propio teléfono para recordarte vencimientos de suscripciones y gastos fijos. No usamos servidores push externos.{"\n\n"}
          • <Text style={{ fontWeight: "700", color: colors.text }}>Archivos y Compartir (CSV / JSON):</Text>{" "}
          se usan solo cuando tú decides importar un CSV o exportar tus movimientos/backups. Recuerda que los archivos CSV y JSON exportados manualmente no están cifrados: guárdalos en un sitio seguro.
        </Text>
      </Card>

      <Button
        title="Ver Política de Privacidad completa (Web / GitHub)"
        variant="secondary"
        icon="open-outline"
        onPress={onOpenWebPolicy}
      />

      <View style={{ height: 18 }} />
      <Label>Control y eliminación de datos</Label>
      <Card style={{ marginBottom: 12 }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 12,
          }}
        >
          Tienes control absoluto sobre tu información. Puedes exportar tus
          datos en cualquier momento desde Ajustes → Datos, o eliminar todos los
          registros almacenados en este dispositivo con el botón inferior.
          {Platform.OS === "ios"
            ? "\n\nPara eliminar también el respaldo en tu iCloud personal, ve a Ajustes de iOS → Tu Apple ID → iCloud → Gestionar almacenamiento → Cajita → Eliminar datos."
            : ""}
        </Text>
        <Button
          title="Borrar todos los datos locales"
          variant="danger"
          icon="trash-outline"
          onPress={onDeleteAllLocalData}
        />
      </Card>

      <Text
        style={{
          color: colors.textMuted,
          fontSize: 12,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 18,
        }}
      >
        Contacto de privacidad: jesudgm.11@proton.me{"\n"}
        Jesús Daniel Garizao Mejía (TheOfYisu)
      </Text>
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
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  pillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
});
