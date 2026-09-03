import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '@/src/db/database';
import { accountTypeLabel } from '@/src/services/accountService';
import { useTheme } from '@/src/theme/ThemeProvider';
import { IconName, safeIcon } from '@/src/theme';
import { formatMoney } from './ui';

export { formatMoney, formatDate } from './ui';

export function defaultAccountIcon(type: Account['type']): IconName {
  switch (type) {
    case 'bank': return 'business';
    case 'cash': return 'cash';
    case 'credit_card': return 'card';
    case 'savings': return 'wallet';
    case 'cajita': return 'flower';
    case 'cdt': return 'pie-chart';
    case 'debt': return 'trending-down';
    case 'loan': return 'trending-up';
    default: return 'wallet';
  }
}

export function AccountCard({
  account,
  balance,
  onPress,
  hide = false,
}: {
  account: Account;
  balance: number;
  onPress?: () => void;
  hide?: boolean;
}) {
  const { colors } = useTheme();
  const isCredit = account.type === 'credit_card';
  const isDebt = account.type === 'debt' || account.type === 'loan';
  const color = account.color || colors.accent;
  const icon = safeIcon(account.icon, defaultAccountIcon(account.type));
  const amountColor = isCredit || isDebt ? colors.negative : balance < 0 ? colors.negative : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{account.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {accountTypeLabel(account.type)}
          {isCredit && account.creditLimit ? ` · Cupo ${formatMoney(account.creditLimit, account.currency, hide)}` : ''}
          {account.excludeFromTotals ? ' · fuera del total' : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{formatMoney(balance, account.currency, hide)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800' },
});
