import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Screen, Button, EmptyState, formatMoney } from '@/src/components/ui';
import { loanBalance } from '@/src/services/loanService';
import { Loan } from '@/src/db/database';

export default function PeopleScreen() {
  const { loans, isPremium } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  React.useEffect(() => {
    if (!isPremium) {
      Alert.alert('Función Premium', 'Las personas y los préstamos están disponibles con Cajita Premium.');
      router.back();
    }
  }, [isPremium]);

  const lent = loans.filter((l) => l.type === 'lent' && l.personId != null);
  const borrowed = loans.filter((l) => l.type === 'borrowed' && l.personId != null);

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
        Personas a quienes les prestas dinero o de quienes recibes. Cada préstamo queda asociado a su persona.
      </Text>
      {lent.length === 0 && borrowed.length === 0 ? (
        <EmptyState icon="people" title="Sin personas" subtitle="Crea una persona y regístrala en un préstamo." />
      ) : (
        <>
          {lent.length > 0 && (
            <>
              <SectionTitle title="Te deben" colors={colors} />
              {lent.map((l) => (
                <PersonCard key={l.id} loan={l} colors={colors} prefs={prefs} hide={hide} sign="+" />
              ))}
            </>
          )}
          {borrowed.length > 0 && (
            <>
              <SectionTitle title="Les debes" colors={colors} />
              {borrowed.map((l) => (
                <PersonCard key={l.id} loan={l} colors={colors} prefs={prefs} hide={hide} sign="-" />
              ))}
            </>
          )}
        </>
      )}
      <Button title="Nueva persona" icon="person-add" onPress={() => router.push('/person/new')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

function PersonCard({
  loan,
  colors,
  prefs,
  hide,
  sign,
}: {
  loan: Loan;
  colors: ReturnType<typeof useTheme>['colors'];
  prefs: ReturnType<typeof useTheme>['prefs'];
  hide: boolean;
  sign: '+' | '-';
}) {
  const { people } = useApp();
  const person = people.find((p) => p.id === loan.personId);
  const balance = Math.abs(loanBalance(loan.id));
  const c = sign === '+' ? colors.positive : colors.negative;
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
      onTouchEnd={() => loan.personId != null && router.push(`/person/${loan.personId}` as never)}
    >
      <View style={[styles.avatar, { backgroundColor: c + '22' }]}>
        <Ionicons name="person" size={20} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{person?.name ?? 'Persona'}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {loan.name}
          {person?.phone ? ` · ${person.phone}` : ''}
        </Text>
      </View>
      <Text style={{ color: c, fontWeight: '800' }}>{sign}{formatMoney(balance, prefs.currency, hide)}</Text>
    </View>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 10 }}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});