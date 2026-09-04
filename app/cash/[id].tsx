import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, ProgressBar, EmptyState, formatMoney } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import {
  getWithdrawalById, toView, withdrawalExpenses, closeWithdrawal, deleteWithdrawal,
} from '@/src/services/cashService';

export default function WithdrawalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wid = parseInt(id, 10);
  const raw = getWithdrawalById(wid);
  const { accounts, categories, refresh } = useApp();
  const { colors, prefs } = useTheme();

  if (!raw) {
    return <ModalScreen title="Retiro"><Text style={{ color: colors.text }}>No encontrado</Text></ModalScreen>;
  }

  const w = toView(raw);
  const expenses = withdrawalExpenses(raw);
  const account = accounts.find((a) => a.id === w.accountId);
  const pct = w.amount > 0 ? w.spent / w.amount : 0;
  const closed = !!w.closedAt;
  const active = w.windowEnd === Number.POSITIVE_INFINITY && !closed;

  const remove = () => {
    Alert.alert('Eliminar retiro', 'Se eliminará el retiro y su transferencia asociada.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteWithdrawal(wid); refresh(); router.back(); } },
    ]);
  };

  return (
    <ModalScreen
      title={w.note || 'Retiro en efectivo'}
      footer={
        <View style={{ gap: 10 }}>
          {active ? (
            <Button title="Cerrar retiro" icon="lock-closed" onPress={() => { closeWithdrawal(wid); refresh(); router.back(); }} />
          ) : closed ? (
            <Button title="Reabrir retiro" variant="secondary" onPress={() => { closeWithdrawal(wid, false); refresh(); router.back(); }} />
          ) : null}
          <Button title="Eliminar" variant="ghost" color={colors.negative} onPress={remove} />
        </View>
      }
    >
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Te queda</Text>
        <Text style={{ color: w.remaining < 0 ? colors.negative : colors.text, fontSize: 30, fontWeight: '900', marginTop: 2 }}>
          {formatMoney(w.remaining, prefs.currency, prefs.hideBalances)}
        </Text>
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <ProgressBar pct={pct} color={colors.warning} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Retiraste {formatMoney(w.amount, prefs.currency, prefs.hideBalances)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Gastado {formatMoney(w.spent, prefs.currency, prefs.hideBalances)}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
          {new Date(w.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          {account ? ` · ${account.name}` : ''}
          {closed ? ' · cerrado' : active ? ' · activo' : ' · reemplazado por un retiro más nuevo'}
        </Text>
      </Card>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>
        EN QUÉ SE FUE ({expenses.length})
      </Text>
      {expenses.length === 0 ? (
        <EmptyState icon="cash-outline" title="Aún no has gastado de este retiro" />
      ) : (
        expenses.map((t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          return (
            <Card key={t.id} onPress={() => router.push(`/transaction/${t.id}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: (cat?.color ?? colors.negative) + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={safeIcon(cat?.icon, 'arrow-down')} size={15} color={cat?.color ?? colors.negative} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{t.title || 'Sin título'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{new Date(t.date).toLocaleDateString('es-CO')}</Text>
              </View>
              <Text style={{ color: colors.negative, fontWeight: '800' }}>-{formatMoney(Math.abs(t.amount), prefs.currency, prefs.hideBalances)}</Text>
            </Card>
          );
        })
      )}
    </ModalScreen>
  );
}
