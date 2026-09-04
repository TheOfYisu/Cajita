import React from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button } from '@/src/components/ui';
import {
  PREMIUM_FEATURES, getPremiumPrice, purchasePremium, restorePremium, isPremium,
} from '@/src/services/premiumService';

export default function PremiumScreen() {
  const { refresh, isPremium: premium } = useApp();
  const { colors } = useTheme();
  const [price, setPrice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getPremiumPrice().then(setPrice);
  }, []);

  const buy = async () => {
    setBusy(true);
    try {
      const ok = await purchasePremium();
      refresh();
      if (ok && isPremium()) {
        Alert.alert('¡Premium activado!', 'Gracias por tu compra. Ya tienes acceso a todas las funciones Premium.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const ok = await restorePremium();
      refresh();
      Alert.alert(ok ? 'Compra restaurada' : 'No se encontró ninguna compra', ok ? 'Tu Premium ya está activo.' : 'No pudimos encontrar una compra previa en esta cuenta de Apple.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScreen title="Cajita Premium">
      <Card style={{ marginBottom: 16, alignItems: 'center', padding: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name="diamond" size={36} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
          {premium ? 'Premium activo' : 'Cajita Premium'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
          {premium
            ? 'Gracias por apoyar el proyecto. Tienes acceso a todas las funciones Premium de por vida.'
            : 'Desbloquea todas las funciones avanzadas con un pago único, de por vida.'}
        </Text>
        {!premium ? (
          <Text style={{ color: colors.accent, fontSize: 26, fontWeight: '900', marginTop: 12 }}>
            {price ? price : '…'}
          </Text>
        ) : null}
      </Card>

      <Card style={{ marginBottom: 16, padding: 8 }}>
        {PREMIUM_FEATURES.map((f, i) => (
          <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={f.icon as never} size={17} color={colors.accent} />
            </View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{f.label}</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
          </View>
        ))}
      </Card>

      {!premium ? (
        <>
          <Button
            title={busy ? 'Procesando…' : `Comprar Premium ${price ? `· ${price}` : ''}`}
            icon="card"
            onPress={buy}
            disabled={busy}
            loading={busy}
          />
          <Button title="Restaurar compra" variant="ghost" onPress={restore} disabled={busy} style={{ marginTop: 8 }} />
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 }}>
            Pago único no consumible. La compra se asocia a tu cuenta de Apple y puedes restaurarla en cualquier dispositivo.
          </Text>
        </>
      ) : null}
    </ModalScreen>
  );
}