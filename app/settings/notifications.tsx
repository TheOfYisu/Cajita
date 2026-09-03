import React from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Label, Toggle, Chip, Button } from '@/src/components/ui';
import { ensureNotificationPermissions, syncSubscriptionNotifications, sendTestNotification } from '@/src/services/notificationService';

const LEAD_OPTIONS = [1, 2, 3, 5, 7, 10];

export default function NotificationsSettings() {
  const { prefs, updatePrefs, colors } = useTheme();

  const setEnabled = async (v: boolean) => {
    if (v) {
      const ok = await ensureNotificationPermissions();
      if (!ok && Platform.OS !== 'web') {
        Alert.alert('Permiso denegado', 'Activa las notificaciones de Cajita en los ajustes del sistema.');
        return;
      }
    }
    updatePrefs({ notificationsEnabled: v });
    await syncSubscriptionNotifications();
  };

  const setLead = async (d: number) => {
    updatePrefs({ defaultLeadDays: d });
    await syncSubscriptionNotifications();
  };

  return (
    <ModalScreen title="Notificaciones">
      <Card style={{ padding: 12, marginBottom: 12 }}>
        <Toggle
          label="Recordatorios de pagos"
          hint="Avisos locales antes de cada cobro de suscripción"
          icon="notifications"
          value={prefs.notificationsEnabled}
          onChange={setEnabled}
        />
      </Card>

      {prefs.notificationsEnabled ? (
        <>
          <Label>Antelación por defecto para nuevas suscripciones</Label>
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LEAD_OPTIONS.map((d) => (
                <Chip key={d} label={`${d} día${d > 1 ? 's' : ''}`} active={prefs.defaultLeadDays === d} onPress={() => setLead(d)} />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
              Para cada suscripción recibirás: un aviso con esta antelación, otro el día anterior y otro el mismo día del cobro. Puedes ajustar la antelación en cada suscripción.
            </Text>
          </Card>

          <Button
            title="Enviar notificación de prueba"
            variant="secondary"
            icon="paper-plane"
            onPress={async () => {
              const ok = await sendTestNotification();
              if (!ok) Alert.alert('No disponible', 'Las notificaciones no están disponibles o el permiso está denegado.');
            }}
          />
        </>
      ) : null}

      {Platform.OS === 'web' ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 14 }}>
          Las notificaciones funcionan en el dispositivo (Expo Go o build nativa), no en la versión web.
        </Text>
      ) : null}
    </ModalScreen>
  );
}
