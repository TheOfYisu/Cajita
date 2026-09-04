import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Screen, Card, Divider } from '@/src/components/ui';
import { IconName, ACCENT_COLORS } from '@/src/theme';
import { getPendingCounts, exportBackup } from '@/src/services/syncService';
import { exportTransactionsCsv } from '@/src/services/transactionService';
import { shareText } from '@/src/services/fileService';
import { getDb } from '@/src/db/database';
import {
  backupNow,
  restoreCloudBackupNow,
  getLastBackupAt,
  isCloudBackupAvailable,
  CLOUD_BACKUP_ENABLED,
} from '@/src/services/cloudBackupService';

export default function SettingsScreen() {
  const { colors, prefs } = useTheme();
  const { refresh } = useApp();
  const pending = getPendingCounts();
  const totalPending = Object.values(pending).reduce((s, n) => s + n, 0);
  const accentLabel = ACCENT_COLORS.find((a) => a.key === prefs.accentKey)?.label ?? 'Verde';

  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = React.useState(false);

  React.useEffect(() => {
    void getLastBackupAt().then(setLastBackup);
    void isCloudBackupAvailable().then(setHasCloudBackup);
  }, []);

  const onBackup = async () => {
    try {
      const res = await backupNow(getDb());
      const t = await getLastBackupAt();
      setLastBackup(t);
      setHasCloudBackup(true);
      Alert.alert(
        'Copia de seguridad',
        res.ok
          ? `Backup subido a iCloud (${t ? new Date(t).toLocaleTimeString('es-CO') : 'ahora'}). Se hace automáticamente en cada cambio.`
          : `No se pudo subir: ${res.reason}`,
      );
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const onRestore = () => {
    Alert.alert(
      'Restaurar desde iCloud',
      'Se reemplazará la base de datos actual con la copia guardada en iCloud. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await restoreCloudBackupNow();
              if (res.restored) {
                refresh();
                Alert.alert('Restaurado', 'Datos recuperados desde iCloud.');
              } else {
                Alert.alert('No se pudo restaurar', res.reason);
              }
            } catch (e) {
              Alert.alert('Error', String(e));
            }
          },
        },
      ],
    );
  };

  const onExportCsv = async () => {
    try {
      const csv = exportTransactionsCsv();
      const shared = await shareText(`cajita-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      if (!shared) Alert.alert('CSV copiado', 'El CSV se copió al portapapeles.');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const onExportBackup = async () => {
    try {
      const json = exportBackup();
      const shared = await shareText(`cajita-backup-${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
      if (!shared) Alert.alert('Backup copiado', 'El backup JSON se copió al portapapeles.');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const sections: {
    title: string;
    items: { icon: IconName; label: string; hint?: string; onPress: () => void; color?: string }[];
  }[] = [
    {
      title: 'Personalización',
      items: [
        { icon: 'person-circle', label: 'Perfil', hint: prefs.userName || 'Sin nombre', onPress: () => router.push('/settings/profile') },
        { icon: 'color-palette', label: 'Apariencia', hint: `${accentLabel} · ${prefs.themeMode === 'system' ? 'Automático' : prefs.themeMode === 'dark' ? 'Oscuro' : 'Claro'}`, onPress: () => router.push('/settings/appearance') },
        { icon: 'pricetags', label: 'Categorías', onPress: () => router.push('/settings/categories') },
        { icon: 'people', label: 'Personas', onPress: () => router.push('/settings/people') },
        { icon: 'pie-chart', label: 'Presupuestos', onPress: () => router.push('/settings/budgets') },
        { icon: 'repeat', label: 'Suscripciones y gastos fijos', hint: 'Streaming, gimnasio, arriendo, servicios de casa…', onPress: () => router.push('/settings/recurring') },
        { icon: 'notifications', label: 'Notificaciones', hint: prefs.notificationsEnabled ? 'Recordatorios activados' : 'Desactivadas', onPress: () => router.push('/settings/notifications') },
        { icon: 'finger-print', label: 'Seguridad', hint: prefs.appLockEnabled ? 'Bloqueo activado' : 'Bloqueo con huella / Face ID', onPress: () => router.push('/settings/security') },
      ],
    },
    {
      title: 'Datos',
      items: [
        { icon: 'download', label: 'Importar CSV', onPress: () => router.push('/import') },
        { icon: 'share-outline', label: 'Exportar movimientos (CSV)', onPress: onExportCsv },
        { icon: 'archive', label: 'Exportar backup (JSON)', onPress: onExportBackup },
        ...(CLOUD_BACKUP_ENABLED
          ? [{ icon: 'cloud-download' as IconName, label: 'Restaurar desde iCloud', hint: hasCloudBackup ? 'Reemplaza los datos con el backup guardado' : 'No hay backup en iCloud todavía', onPress: onRestore }]
          : []),
      ],
    },
    {
      title: 'Movimientos rápidos',
      items: [
        { icon: 'swap-horizontal', label: 'Transferencia entre cuentas', onPress: () => router.push('/transfer/new') },
        { icon: 'card', label: 'Pagar tarjeta / crédito', onPress: () => router.push('/transaction/new?mode=paycard') },
        { icon: 'cash', label: 'Retiros de efectivo', hint: 'Registra un retiro y ve cuánto te queda', onPress: () => router.push('/cash' as never) },
      ],
    },
  ];

  return (
    <Screen>
      {CLOUD_BACKUP_ENABLED ? (
        <Card onPress={onBackup} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.transfer} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Copia de seguridad iCloud</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {lastBackup ? `Último backup: ${new Date(lastBackup).toLocaleString('es-CO')}` : 'Sin backup todavía'}
                {totalPending > 0 ? ` · ${totalPending} cambios pendientes` : ''}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                Automática en cada cambio · toca para subir ahora
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {sections.map((s) => (
        <View key={s.title} style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{s.title.toUpperCase()}</Text>
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

      <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 16, marginTop: 4 }}>
        Cajita · Finanzas personales local-first. Tus datos viven en tu dispositivo.
      </Text>
      <View style={{ height: 8 }} />
      <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }} onPress={refresh}>
        v1.0.0
      </Text>
    </Screen>
  );
}

function RowItem({ icon, label, hint, onPress, color, colors }: { icon: IconName; label: string; hint?: string; onPress: () => void; color?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={color ?? colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {hint ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
});
