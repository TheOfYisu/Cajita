import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useApp } from "@/src/store/appStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Screen, Card, Divider, Button } from "@/src/components/ui";
import { IconName, ACCENT_COLORS } from "@/src/theme";
import { getPendingCounts, exportBackup } from "@/src/services/syncService";
import { exportTransactionsCsv } from "@/src/services/transactionService";
import { shareText } from "@/src/services/fileService";
import { getDb } from "@/src/db/database";
import {
  backupNow,
  restoreCloudBackupNow,
  getLastBackupAt,
  isCloudBackupAvailable,
  getGoogleDriveAccount,
} from "@/src/services/cloudBackupService";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
} from "@/src/services/googleDriveService";

const getBackupErrorMessage = (reason: string): string => {
  switch (reason) {
    case "empty-local-with-backup":
      return "Tu base de datos local está vacía y ya existe una copia de seguridad en la nube. Para evitar sobrescribirla con datos en blanco, restaura tu copia primero.";
    case "icloud-unavailable":
      return "iCloud no está disponible. Asegúrate de haber iniciado sesión con tu Apple ID y tener iCloud Drive activado en los Ajustes de tu iPhone.";
    case "gdrive-not-connected":
      return "Google Drive no está conectado. Conecta tu cuenta de Google para activar el respaldo automático.";
    case "missing-client-id":
      return "No se ha configurado el Client ID de Google. Puedes ingresarlo en Ajustes para conectar Google Drive.";
    case "cancelled":
      return "El inicio de sesión con Google fue cancelado.";
    case "not-ios":
      return "La copia de seguridad en iCloud solo está disponible en dispositivos iOS.";
    case "no-native":
      return "El módulo nativo no está disponible en este entorno.";
    case "no-db":
      return "No se encontró el archivo de la base de datos local para respaldar.";
    case "in-progress":
      return "Ya hay una copia de seguridad en curso.";
    default:
      return `No se pudo subir: ${reason}`;
  }
};

export default function SettingsScreen() {
  const { colors, prefs } = useTheme();
  const { refresh } = useApp();
  const pending = getPendingCounts();
  const totalPending = Object.values(pending).reduce((s, n) => s + n, 0);
  const accentLabel =
    ACCENT_COLORS.find((a) => a.key === prefs.accentKey)?.label ?? "Verde";

  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = React.useState(false);
  const [gdriveEmail, setGdriveEmail] = React.useState<string | null>(null);
  const [gdriveConnected, setGdriveConnected] = React.useState(false);

  // Modal de Google Drive
  const [gdriveModalVisible, setGdriveModalVisible] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);

  React.useEffect(() => {
    void getLastBackupAt().then(setLastBackup);
    void isCloudBackupAvailable().then(setHasCloudBackup);
    if (Platform.OS === "android") {
      void getGoogleDriveAccount().then((acc) => {
        setGdriveConnected(acc.connected);
        setGdriveEmail(acc.email);
      });
    }
  }, []);

  const onBackup = async () => {
    try {
      const res = await backupNow(getDb());
      const t = await getLastBackupAt();
      setLastBackup(t);
      setHasCloudBackup(true);
      const targetName = Platform.OS === "ios" ? "iCloud" : "Google Drive";
      Alert.alert(
        "Copia de seguridad",
        res.ok
          ? `Backup subido a ${targetName} (${t ? new Date(t).toLocaleTimeString("es-CO") : "ahora"}). Se hace automáticamente en cada cambio.`
          : getBackupErrorMessage(res.reason),
      );
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  const onOpenGoogleDriveModal = () => {
    setGdriveModalVisible(true);
  };

  const handleConnectOAuth = async () => {
    setIsConnecting(true);
    try {
      const res = await connectGoogleDrive();
      if (res.ok) {
        const acc = await getGoogleDriveAccount();
        setGdriveConnected(acc.connected);
        setGdriveEmail(acc.email);
        setGdriveModalVisible(false);
        Alert.alert(
          "Google Drive conectado",
          `Cuenta vinculada: ${acc.email ?? "con éxito"}. Se iniciará el respaldo automático.`,
        );
        void onBackup();
      } else {
        if (res.reason === "missing-client-id") {
          Alert.alert(
            "Configuración pendiente",
            "La integración con Google Drive aún no ha sido configurada para esta versión de la app.",
          );
        } else {
          Alert.alert(
            "No se pudo conectar",
            getBackupErrorMessage(res.reason ?? "error"),
          );
        }
      }
    } catch (e) {
      Alert.alert("Error de conexión", String(e));
    } finally {
      setIsConnecting(false);
    }
  };

  const onDisconnectGoogleDrive = () => {
    Alert.alert(
      "Desconectar Google Drive",
      "¿Deseas desvincular tu cuenta de Google Drive? Los respaldos automáticos se pausarán.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            await disconnectGoogleDrive();
            setGdriveConnected(false);
            setGdriveEmail(null);
            setHasCloudBackup(false);
            setGdriveModalVisible(false);
            Alert.alert("Desconectado", "Se ha desvinculado Google Drive.");
          },
        },
      ],
    );
  };

  const onRestore = () => {
    const cloudName = Platform.OS === "ios" ? "iCloud" : "Google Drive";
    Alert.alert(
      `Restaurar desde ${cloudName}`,
      `Se reemplazará la base de datos actual con la copia guardada en ${cloudName}. ¿Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await restoreCloudBackupNow();
              if (res.restored) {
                refresh();
                Alert.alert("Restaurado", `Datos recuperados desde ${cloudName}.`);
              } else {
                Alert.alert("No se pudo restaurar", res.reason);
              }
            } catch (e) {
              Alert.alert("Error", String(e));
            }
          },
        },
      ],
    );
  };

  const onExportCsv = async () => {
    try {
      const csv = exportTransactionsCsv();
      const shared = await shareText(
        `cajita-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      );
      if (!shared)
        Alert.alert("CSV copiado", "El CSV se copió al portapapeles.");
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  const onExportBackup = async () => {
    try {
      const json = exportBackup();
      const shared = await shareText(
        `cajita-backup-${new Date().toISOString().slice(0, 10)}.json`,
        json,
        "application/json",
      );
      if (!shared)
        Alert.alert(
          "Backup copiado",
          "El backup JSON se copió al portapapeles.",
        );
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  const sections: {
    title: string;
    items: {
      icon: IconName;
      label: string;
      hint?: string;
      onPress: () => void;
      color?: string;
    }[];
  }[] = [
    {
      title: "Personalización",
      items: [
        {
          icon: "person-circle",
          label: "Perfil",
          hint: prefs.userName || "Sin nombre",
          onPress: () => router.push("/settings/profile"),
        },
        {
          icon: "color-palette",
          label: "Apariencia",
          hint: `${accentLabel} · ${prefs.themeMode === "system" ? "Automático" : prefs.themeMode === "dark" ? "Oscuro" : "Claro"}`,
          onPress: () => router.push("/settings/appearance"),
        },
        {
          icon: "pricetags",
          label: "Categorías",
          onPress: () => router.push("/settings/categories"),
        },
        {
          icon: "people",
          label: "Personas",
          onPress: () => router.push("/settings/people"),
        },
        {
          icon: "pie-chart",
          label: "Presupuestos",
          onPress: () => router.push("/settings/budgets"),
        },
        {
          icon: "repeat",
          label: "Suscripciones y gastos fijos",
          hint: "Streaming, gimnasio, arriendo, servicios de casa…",
          onPress: () => router.push("/settings/recurring"),
        },
        {
          icon: "flash",
          label:
            Platform.OS === "ios"
              ? "Acciones y Atajos de iOS"
              : "Atajos y Acciones Rápidas",
          hint:
            Platform.OS === "ios"
              ? "Botón de Acción · Doble toque atrás · Siri · Quick Actions"
              : "Menú al pulsar ícono · Accesos directos · Gestos",
          onPress: () => router.push("/settings/shortcuts"),
        },
        {
          icon: "notifications",
          label: "Notificaciones",
          hint: prefs.notificationsEnabled
            ? "Recordatorios activados"
            : "Desactivadas",
          onPress: () => router.push("/settings/notifications"),
        },
        {
          icon: "finger-print",
          label: "Seguridad",
          hint: prefs.appLockEnabled
            ? "Bloqueo activado"
            : "Bloqueo con huella / Face ID",
          onPress: () => router.push("/settings/security"),
        },
        {
          icon: "shield-checkmark",
          label: "Privacidad y datos",
          hint: "Política local-first · Cifrado · Borrar datos",
          onPress: () => router.push("/settings/privacy"),
        },
      ],
    },
    {
      title: "Datos",
      items: [
        {
          icon: "download",
          label: "Importar CSV",
          onPress: () => router.push("/import"),
        },
        {
          icon: "share-outline",
          label: "Exportar movimientos (CSV)",
          onPress: onExportCsv,
        },
        {
          icon: "archive",
          label: "Exportar backup (JSON)",
          onPress: onExportBackup,
        },
        ...(Platform.OS === "ios"
          ? [
              {
                icon: "cloud-download" as IconName,
                label: "Restaurar desde iCloud",
                hint: hasCloudBackup
                  ? "Reemplaza los datos con el backup guardado"
                  : "No hay backup en iCloud todavía",
                onPress: onRestore,
              },
            ]
          : Platform.OS === "android"
            ? [
                ...(gdriveConnected
                  ? [
                      {
                        icon: "cloud-download" as IconName,
                        label: "Restaurar desde Google Drive",
                        hint: hasCloudBackup
                          ? "Reemplaza los datos con el backup guardado"
                          : "No hay backup en Google Drive todavía",
                        onPress: onRestore,
                      },
                      {
                        icon: "settings-outline" as IconName,
                        label: "Ajustes de Google Drive",
                        hint: gdriveEmail ?? "Gestionar cuenta",
                        onPress: onOpenGoogleDriveModal,
                      },
                      {
                        icon: "log-out-outline" as IconName,
                        label: "Desconectar Google Drive",
                        hint: "Desvincular cuenta",
                        onPress: onDisconnectGoogleDrive,
                      },
                    ]
                  : [
                      {
                        icon: "logo-google" as IconName,
                        label: "Conectar Google Drive",
                        hint: "Activa la copia de seguridad automática en Android",
                        onPress: onOpenGoogleDriveModal,
                      },
                    ]),
              ]
            : []),
      ],
    },
    {
      title: "Movimientos rápidos",
      items: [
        {
          icon: "swap-horizontal",
          label: "Transferencia entre cuentas",
          onPress: () => router.push("/transfer/new"),
        },
        {
          icon: "card",
          label: "Pagar tarjeta / crédito",
          onPress: () => router.push("/transaction/new?mode=paycard"),
        },
        {
          icon: "cash",
          label: "Retiros de efectivo",
          hint: "Registra un retiro y ve cuánto te queda",
          onPress: () => router.push("/cash" as never),
        },
      ],
    },
    {
      title: "Acerca de",
      items: [
        {
          icon: "document-lock",
          label: "Política de privacidad",
          hint: "100 % local · Sin servidores ni rastreadores",
          onPress: () => router.push("/settings/privacy"),
        },
        {
          icon: "logo-github",
          label: "GitHub",
          hint: "github.com/TheOfYisu/Cajita",
          onPress: () => openLink("https://github.com/TheOfYisu/Cajita"),
        },
        {
          icon: "logo-linkedin",
          label: "LinkedIn",
          hint: "linkedin.com/in/jesudgm",
          onPress: () => openLink("https://www.linkedin.com/in/jesudgm/"),
        },
        {
          icon: "code-slash",
          label: "Autor",
          hint: "Jesús Daniel Garizao Mejía (TheOfYisu)",
          onPress: () => openLink("https://github.com/TheOfYisu"),
        },
      ],
    },
  ];

  return (
    <Screen>
      <View style={styles.brandHeader}>
        <Image
          source={require("../../assets/icon.png")}
          contentFit="cover"
          style={styles.brandLogo}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Cajita
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
            Local-first finance
          </Text>
        </View>
      </View>
      {Platform.OS === "ios" ? (
        <Card onPress={onBackup} style={{ marginBottom: 16 }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={24}
              color={colors.transfer}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}
              >
                Copia de seguridad iCloud
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}
              >
                {lastBackup
                  ? `Último backup: ${new Date(lastBackup).toLocaleString("es-CO")}`
                  : "Sin backup todavía"}
                {totalPending > 0 ? ` · ${totalPending} cambios pendientes` : ""}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}
              >
                Automática en cada cambio · toca para subir ahora
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </View>
        </Card>
      ) : Platform.OS === "android" ? (
        <Card
          onPress={gdriveConnected ? onBackup : onOpenGoogleDriveModal}
          style={{ marginBottom: 16 }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Ionicons
              name={gdriveConnected ? "cloud-upload-outline" : "logo-google"}
              size={24}
              color={colors.transfer}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}
              >
                Copia de seguridad Google Drive
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}
              >
                {gdriveConnected
                  ? lastBackup
                    ? `Último backup: ${new Date(lastBackup).toLocaleString("es-CO")}`
                    : "Sin backup todavía"
                  : "No conectado · Toca para vincular tu cuenta"}
                {totalPending > 0 && gdriveConnected ? ` · ${totalPending} cambios pendientes` : ""}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}
              >
                {gdriveConnected
                  ? `${gdriveEmail ?? "Google Drive"} · Automática en cada cambio · toca para subir ahora`
                  : "Respaldo automático seguro en la nube de Google"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </View>
        </Card>
      ) : null}

      {sections.map((s) => (
        <View key={s.title} style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {s.title.toUpperCase()}
          </Text>
          <Card style={{ padding: 0 }}>
            {s.items.map((it, i) => (
              <View key={it.label}>
                {i > 0 ? <Divider /> : null}
                <View style={{ paddingHorizontal: 16 }}>
                  <RowItem {...it} colors={colors} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Text
        style={{
          color: colors.textMuted,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 16,
          marginTop: 4,
        }}
      >
        Cajita · Finanzas personales local-first. Tus datos viven en tu
        dispositivo.
      </Text>
      <View style={{ height: 8 }} />
      <Text
        style={{ color: colors.textMuted, fontSize: 11, textAlign: "center" }}
        onPress={refresh}
      >
        v{Constants.expoConfig?.version ?? "1.0.10"}
      </Text>

      {/* Modal de Google Drive (Cross-Platform) */}
      <Modal
        visible={gdriveModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isConnecting) setGdriveModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="logo-google" size={24} color={colors.transfer} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Google Drive
                </Text>
              </View>
              <Pressable
                onPress={() => !isConnecting && setGdriveModalVisible(false)}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
                Copia de seguridad automática y cifrada en tu cuenta personal de Google Drive (carpeta privada appData).
              </Text>

              {gdriveConnected ? (
                <View style={{ gap: 14 }}>
                  <View
                    style={[
                      styles.connectedBadge,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                        Cuenta vinculada
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {gdriveEmail ?? "Google Drive"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Button
                      title="Subir copia de seguridad ahora"
                      icon="cloud-upload"
                      onPress={async () => {
                        setGdriveModalVisible(false);
                        await onBackup();
                      }}
                    />
                    <Button
                      title="Restaurar copia desde Google Drive"
                      icon="cloud-download"
                      variant="secondary"
                      onPress={() => {
                        setGdriveModalVisible(false);
                        onRestore();
                      }}
                    />
                    <Button
                      title="Desconectar Google Drive"
                      icon="log-out-outline"
                      variant="danger"
                      onPress={onDisconnectGoogleDrive}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ gap: 18 }}>
                  <View style={{ gap: 12, paddingVertical: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="shield-checkmark" size={18} color={colors.positive} />
                      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                        Cifrado seguro AES-256 (SQLCipher)
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="sync" size={18} color={colors.positive} />
                      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                        Copia automática en la nube en cada cambio
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="phone-portrait-outline" size={18} color={colors.positive} />
                      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                        Restaura tus datos si cambias de celular
                      </Text>
                    </View>
                  </View>

                  <Button
                    title="Iniciar sesión con Google"
                    icon="logo-google"
                    onPress={handleConnectOAuth}
                    loading={isConnecting}
                    disabled={isConnecting}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function openLink(url: string) {
  void WebBrowser.openBrowserAsync(url);
}

function RowItem({
  icon,
  label,
  hint,
  onPress,
  color,
  colors,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  color?: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 14,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={20} color={color ?? colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "500" }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  brandLogo: { width: 58, height: 58, borderRadius: 17 },
  brandTitle: { fontSize: 24, fontWeight: "900", letterSpacing: 0.4 },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
