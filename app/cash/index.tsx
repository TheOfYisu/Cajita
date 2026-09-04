import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, EmptyState, ProgressBar, StatusBadge, formatMoney } from '@/src/components/ui';
import { allWithdrawalViews } from '@/src/services/cashService';

export default function CashListScreen() {
  const { cash } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;
  const list = allWithdrawalViews();

  const active = list.filter((w) => w.windowEnd === Number.POSITIVE_INFINITY && !w.closedAt);
  const past = list.filter((w) => !(w.windowEnd === Number.POSITIVE_INFINITY && !w.closedAt));

  return (
    <ModalScreen
      title="Retiros de efectivo"
      footer={<Button title="Registrar retiro" icon="add" onPress={() => router.push('/cash/new')} />}
    >
      {list.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="Sin retiros"
          subtitle="Registra cuánto retiras del cajero y la app te dice cuánto te queda a medida que gastas."
        />
      ) : (
        <>
          <Card style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Efectivo en mano</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {formatMoney(cash.totalRemaining, prefs.currency, hide)}
            </Text>
          </Card>

          {active.length > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>ACTIVOS</Text>
          ) : null}
          {active.map((w) => <Row key={w.id} w={w} colors={colors} prefs={prefs} hide={hide} />)}

          {past.length > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 8, marginLeft: 4 }}>ANTERIORES</Text>
          ) : null}
          {past.map((w) => <Row key={w.id} w={w} colors={colors} prefs={prefs} hide={hide} />)}
        </>
      )}
    </ModalScreen>
  );
}

function Row({ w, colors, prefs, hide }: {
  w: ReturnType<typeof allWithdrawalViews>[number];
  colors: ReturnType<typeof useTheme>['colors'];
  prefs: ReturnType<typeof useTheme>['prefs'];
  hide: boolean;
}) {
  const pct = w.amount > 0 ? w.spent / w.amount : 0;
  const activeOpen = w.windowEnd === Number.POSITIVE_INFINITY && !w.closedAt;
  return (
    <Card onPress={() => router.push(`/cash/${w.id}` as never)} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.warning + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cash" size={16} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{w.note || 'Retiro en efectivo'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
            {new Date(w.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </Text>
        </View>
        {w.closedAt ? (
          <StatusBadge label="Cerrado" color={colors.textMuted} icon="lock-closed" />
        ) : activeOpen ? (
          <Text style={{ color: w.remaining < 0 ? colors.negative : colors.positive, fontWeight: '800' }}>
            {formatMoney(w.remaining, prefs.currency, hide)}
          </Text>
        ) : (
          <StatusBadge label="Reemplazado" color={colors.textMuted} />
        )}
      </View>
      <ProgressBar pct={pct} color={colors.warning} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Retiro {formatMoney(w.amount, prefs.currency, hide)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          {activeOpen ? `Gastado ${formatMoney(w.spent, prefs.currency, hide)}` : `Sobró ${formatMoney(w.remaining, prefs.currency, hide)}`}
        </Text>
      </View>
    </Card>
  );
}
