import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Label } from './ui';

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

export function DateField({
  label,
  value,
  onChange,
  allowFuture = false,
}: {
  label?: string;
  value: number;
  onChange: (ts: number) => void;
  allowFuture?: boolean;
}) {
  const { colors, radius } = useTheme();
  const today = startOfDay(Date.now());
  const cur = startOfDay(value);
  const isToday = cur === today;
  const isYesterday = cur === today - 86400000;
  const canForward = allowFuture || cur < today;

  const shiftDays = (days: number) => {
    const next = cur + days * 86400000;
    if (!allowFuture && next > today) return;
    onChange(next);
  };
  const shiftMonths = (m: number) => {
    const d = new Date(cur);
    d.setMonth(d.getMonth() + m);
    if (!allowFuture && d.getTime() > today) return;
    onChange(d.getTime());
  };

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: 4,
          paddingVertical: 6,
        }}
      >
        {allowFuture ? (
          <Pressable onPress={() => shiftMonths(-1)} hitSlop={6} style={{ paddingHorizontal: 4 }}>
            <Ionicons name="play-back" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => shiftDays(-1)} hitSlop={8} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: 13 }}>
          {isToday ? 'Hoy' : isYesterday ? 'Ayer' : new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => shiftDays(1)} hitSlop={8} style={{ padding: 6, opacity: canForward ? 1 : 0.3 }} disabled={!canForward}>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        {allowFuture ? (
          <Pressable onPress={() => shiftMonths(1)} hitSlop={6} style={{ paddingHorizontal: 4 }}>
            <Ionicons name="play-forward" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {!isToday ? (
        <Pressable onPress={() => onChange(Date.now())} style={{ marginTop: 6 }}>
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Volver a hoy</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
