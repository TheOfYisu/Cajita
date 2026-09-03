import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Screen, Card, Button, EmptyState, formatMoney } from '@/src/components/ui';
import { accountTypeLabel } from '@/src/services/accountService';

export default function LoansScreen() {
  const { accounts, balances } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  const debts = accounts.filter((a) => ['credit_card', 'debt', 'loan'].includes(a.type));

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
        Las tarjetas de crédito, créditos y préstamos se pagan con transferencias desde tus cuentas, lo que reduce el saldo pendiente.
      </Text>
      {debts.length === 0 ? (
        <EmptyState icon="trending-down" title="Sin deudas" subtitle="Crea una tarjeta de crédito o crédito en Cartera." />
      ) : (
        debts.map((a) => {
          const balance = balances[a.id] ?? 0;
          const icon = a.type === 'credit_card' ? 'card' : a.type === 'loan' ? 'trending-up' : 'trending-down';
          return (
            <Card key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconCircle, { backgroundColor: (a.color || colors.negative) + '22' }]}>
                  <Ionicons name={icon} size={20} color={a.color || colors.negative} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{a.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {accountTypeLabel(a.type)}
                    {a.type === 'credit_card' && a.creditLimit ? ` · Cupo ${formatMoney(a.creditLimit, prefs.currency, hide)}` : ''}
                  </Text>
                </View>
                <Text style={{ color: colors.negative, fontWeight: '800' }}>{formatMoney(balance, prefs.currency, hide)}</Text>
              </View>
            </Card>
          );
        })
      )}
      <Button title="Nueva cuenta de deuda" icon="add" onPress={() => router.push('/account/new?type=credit_card')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});