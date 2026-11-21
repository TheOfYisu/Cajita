import React from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, EmptyState, ProgressBar, StatusBadge, formatMoney, parseCurrencyInput } from '@/src/components/ui';
import { allWithdrawalViews } from '@/src/services/cashService';
import { createTransaction } from '@/src/services/transactionService';

export default function CashListScreen() {
  const { cash, accounts, refresh } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;
  const list = allWithdrawalViews();

  const active = list.filter((w) => w.windowEnd === Number.POSITIVE_INFINITY && !w.closedAt);
  const past = list.filter((w) => !(w.windowEnd === Number.POSITIVE_INFINITY && !w.closedAt));

  const onSquareWallet = () => {
    const cashAccount = accounts.find((a) => a.type === 'cash') ?? accounts[0];
    if (!cashAccount) {
      Alert.alert('No se encontró una cuenta de efectivo');
      return;
    }

    Alert.prompt(
      'Cuadrar billetera',
      `Actualmente la app registra ${formatMoney(cash.totalRemaining, prefs.currency)} en efectivo.\n\n¿Cuánto dinero tienes físicamente en tu billetera ahora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ajustar',
          onPress: (val) => {
            const actual = parseCurrencyInput(val);
            if (isNaN(actual) || actual < 0) {
              Alert.alert('Monto inválido');
              return;
            }
            const diff = actual - cash.totalRemaining;
            if (Math.abs(diff) < 1) {
              Alert.alert('¡Tu billetera ya está cuadrada!');
              return;
            }

            if (diff < 0) {
              // Gastos hormiga o no anotados
              createTransaction({
                title: 'Gastos varios en efectivo (ajuste de billetera)',
                amount: -Math.abs(diff),
                type: 'expense',
                accountId: cashAccount.id,
                accountUuid: cashAccount.uuid,
                date: Date.now(),
              });
            } else {
              // Entrada extra no registrada
              createTransaction({
                title: 'Ajuste de efectivo en billetera',
                amount: Math.abs(diff),
                type: 'balance_correction',
                accountId: cashAccount.id,
                accountUuid: cashAccount.uuid,
                date: Date.now(),
              });
            }
            refresh();
            Alert.alert('Billetera cuadrada', `Saldo en efectivo actualizado a ${formatMoney(actual, prefs.currency)}.`);
          },
        },
      ],
      'plain-text',
    );
  };

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
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Efectivo en mano</Text>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 }}>
                  {formatMoney(cash.totalRemaining, prefs.currency, hide)}
                </Text>
              </View>
              <Pressable
                onPress={onSquareWallet}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="wallet-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Cuadrar</Text>
              </Pressable>
            </View>
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
