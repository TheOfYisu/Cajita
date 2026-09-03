import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { safeIcon } from '@/src/theme';
import { formatMoney } from './ui';

export function MonthlyBars({
  data,
  currency = 'COP',
}: {
  data: { label: string; income: number; expense: number }[];
  currency?: string;
}) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 10 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 120 }}>
              <View
                style={{
                  width: 10,
                  height: Math.max(3, (d.income / max) * 120),
                  backgroundColor: colors.positive,
                  borderRadius: 3,
                }}
              />
              <View
                style={{
                  width: 10,
                  height: Math.max(3, (d.expense / max) * 120),
                  backgroundColor: colors.negative,
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' }}>
        <Legend color={colors.positive} label="Ingresos" />
        <Legend color={colors.negative} label="Gastos" />
      </View>
      <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
        Máx {formatMoney(max, currency)}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

export function CategoryBreakdown({
  data,
  currency = 'COP',
  hide = false,
}: {
  data: { name: string; color: string; icon: string; total: number }[];
  currency?: string;
  hide?: boolean;
}) {
  const { colors } = useTheme();
  const sum = data.reduce((s, d) => s + d.total, 0) || 1;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: d.total / sum, backgroundColor: d.color }} />
        ))}
      </View>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: d.color + '22',
            }}
          >
            <Ionicons name={safeIcon(d.icon)} size={15} color={d.color} />
          </View>
          <Text style={{ flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, width: 42, textAlign: 'right' }}>
            {Math.round((d.total / sum) * 100)}%
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, minWidth: 70, textAlign: 'right' }}>
            {formatMoney(d.total, currency, hide)}
          </Text>
        </View>
      ))}
    </View>
  );
}
