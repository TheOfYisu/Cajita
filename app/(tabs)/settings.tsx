import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Screen, Card, Divider } from '@/src/components/ui';
import { IconName, ACCENT_COLORS } from '@/src/theme';
import { syncWithCloud, getPendingCounts, getLastSyncAt, exportBackup } from '@/src/services/syncService';
import { exportTransactionsCsv } from '@/src/services/transactionService';
import { shareText } from '@/src/services/fileService';

export default function SettingsScreen() {
  const { colors, prefs } = useTheme();
  const { refresh } = useApp();
  const pending = getPendingCounts();
  const lastSync = getLastSyncAt();
  const totalPending = pending.accounts + pending.categories + pending.transactions + pending.loans;
  const accentLabel = ACCENT_COLORS.find((a) => a.key === prefs.accentKey)?.label ?? 'Verde';

  const onSync = async () => {
    try {
      const status = await syncWithCloud();
      Alert.alert(
        'Sincronización',
        status.cloudAvailable
          ? `Sincronizado. Última: ${status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'nunca'}`
          : 'La sincronización con iCloud requiere la build nativa (EAS Build). Tus datos están seguros en el dispositivo.',
      );
    } catch (e) {
      Alert.alert('Error', String(e));
    }
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
        { icon: 'repeat', label: 'Suscripciones y pagos', hint: 'Streaming, gimnasio, servicios…', onPress: () => router.push('/settings/recurring') },
        { icon: 'notifications', label: 'Notificaciones', hint: prefs.notificationsEnabled ? 'Recordatorios activados' : 'Desactivadas', onPress: () => router.push('/settings/notifications') },
      ],
    },
    {
      title: 'Datos',
      items: [
        { icon: 'download', label: 'Importar CSV', onPress: () => router.push('/import') },
        { icon: 'share-outline', label: 'Exportar movimientos (CSV)', onPress: onExportCsv },
        { icon: 'archive', label: 'Exportar backup (JSON)', onPress: onExportBackup },
      ],
    },
    {
      title: 'Movimientos rápidos',
      items: [
        { icon: 'swap-horizontal', label: 'Transferencia entre cuentas', onPress: () => router.push('/transfer/new') },
        { icon: 'card', label: 'Pagar tarjeta / crédito', onPress: () => router.push('/transaction/new?mode=paycard') },
      ],
    },
  ];

  return (
    <Screen>
      <Card onPress={onSync} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="cloud-outline" size={24} color={colors.transfer} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>iCloud Sync</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {totalPending > 0 ? `${totalPending} cambios pendientes` : 'Todo sincronizado'}
              {lastSync ? ` · ${new Date(lastSync).toLocaleDateString('es-CO')}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>

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
