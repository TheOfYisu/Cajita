import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, EmptyState, formatMoney } from '@/src/components/ui';
import { loanBalance } from '@/src/services/loanService';

export default function PeopleSettingsScreen() {
  const { people, loans } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  return (
    <ModalScreen
      title="Personas"
      footer={<Button title="Nueva persona" icon="person-add" onPress={() => router.push('/person/new')} />}
    >
      {people.length === 0 ? (
        <EmptyState icon="people" title="Sin personas" subtitle="Agrega a alguien para asociarle préstamos o suscripciones compartidas." />
      ) : (
        people.map((p) => {
          const personLoans = loans.filter((l) => l.personId === p.id);
          const net = personLoans.reduce(
            (s, l) => s + (l.type === 'lent' ? Math.abs(loanBalance(l.id)) : -Math.abs(loanBalance(l.id))),
            0,
          );
          return (
            <Card key={p.id} onPress={() => router.push(`/person/${p.id}`)} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={19} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                    {[p.phone, p.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </Text>
                </View>
                {net !== 0 ? (
                  <Text style={{ color: net > 0 ? colors.positive : colors.negative, fontWeight: '800' }}>
                    {net > 0 ? '+' : '-'}{formatMoney(Math.abs(net), prefs.currency, hide)}
                  </Text>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </View>
              {personLoans.length > 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8 }}>
                  {personLoans.length} préstamo{personLoans.length > 1 ? 's' : ''} · {net > 0 ? 'te debe' : net < 0 ? 'le debes' : 'al día'}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
    </ModalScreen>
  );
}
