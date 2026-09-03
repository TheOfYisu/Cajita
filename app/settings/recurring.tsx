import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, EmptyState, formatMoney } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { getRecurring, frequencyLabel, daysUntil } from '@/src/services/recurringService';

export default function RecurringScreen() {
  const { categories, people } = useApp();
  const { colors, prefs } = useTheme();
  const list = getRecurring(true);

  const active = list.filter((r) => !r.isArchived);
  const monthlyTotal = active
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => {
      const perMonth =
        r.frequency === 'weekly' ? r.amount * 4.33
        : r.frequency === 'biweekly' ? r.amount * 2.17
        : r.frequency === 'quarterly' ? r.amount / 3
        : r.frequency === 'yearly' ? r.amount / 12
        : r.amount;
      return s + perMonth;
    }, 0);

  return (
    <ModalScreen
      title="Suscripciones y recurrentes"
      footer={<Button title="Nueva suscripción" icon="add" onPress={() => router.push('/subscription/new')} />}
    >
      {active.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Sin suscripciones"
          subtitle="Agrega Netflix, el gimnasio, Spotify… y te avisamos antes de cada cobro."
        />
      ) : (
        <>
          <Card style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Gasto mensual estimado</Text>
            <Text style={{ color: colors.negative, fontWeight: '800' }}>{formatMoney(monthlyTotal, prefs.currency, prefs.hideBalances)}</Text>
          </Card>

          {active.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            const person = people.find((p) => p.id === r.personId);
            const d = daysUntil(r.nextRun);
            const soon = d <= r.leadDays;
            return (
              <Card key={r.id} onPress={() => router.push(`/subscription/${r.id}`)} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: (cat?.color ?? colors.accent) + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={safeIcon(cat?.icon, r.type === 'income' ? 'arrow-up' : 'repeat')} size={17} color={cat?.color ?? colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{r.title}</Text>
                    <Text style={{ color: soon ? colors.warning : colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {frequencyLabel(r.frequency)} · {d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}
                      {r.notify ? '' : ' · sin aviso'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: r.type === 'income' ? colors.positive : colors.text, fontWeight: '800' }}>
                      {formatMoney(r.amount, prefs.currency, prefs.hideBalances)}
                    </Text>
                    {r.notify ? <Ionicons name="notifications" size={13} color={colors.textMuted} /> : null}
                  </View>
                </View>
                {person ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Ionicons name="people" size={13} color={colors.accent} />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                      Compartida con {person.name}{person.email ? ` · ${person.email}` : ''}
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </>
      )}
    </ModalScreen>
  );
}
