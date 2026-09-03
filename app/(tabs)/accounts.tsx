import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { AccountCard } from '@/src/components/AccountCard';
import { Screen, Card, Button, EmptyState, formatMoney } from '@/src/components/ui';
import { loanBalance } from '@/src/services/loanService';

export default function CarteraScreen() {
  const { accounts, balances, loans, people, primaryAccountId } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  const borrowedEntity = loans.filter((l) => l.type === 'borrowed' && l.counterpartyKind !== 'person');
  const borrowedPerson = loans.filter((l) => l.type === 'borrowed' && l.counterpartyKind === 'person');
  const lentLoans = loans.filter((l) => l.type === 'lent');
  const debtAccounts = accounts.filter((a) => a.type === 'debt' || a.type === 'loan');
  const cards = accounts.filter((a) => a.type === 'credit_card');

  const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
  const entityDebtTotal =
    sum(borrowedEntity.map((l) => Math.abs(loanBalance(l.id)))) +
    sum(cards.map((a) => Math.abs(balances[a.id] ?? 0))) +
    sum(debtAccounts.map((a) => Math.abs(balances[a.id] ?? 0)));
  const personDebtTotal = sum(borrowedPerson.map((l) => Math.abs(loanBalance(l.id))));
  const lentTotal = sum(lentLoans.map((l) => Math.abs(loanBalance(l.id))));

  const cash = accounts.filter((a) => ['bank', 'cash', 'savings'].includes(a.type));
  const bolsillos = accounts.filter((a) => a.type === 'cajita');
  const cdts = accounts.filter((a) => a.type === 'cdt');

  const hasAnything = accounts.length > 0 || loans.length > 0;

  return (
    <Screen onFabPress={() => router.push('/account/new')}>
      {!hasAnything ? (
        <EmptyState icon="wallet" title="Tu cartera está vacía" subtitle="Crea tu primera cuenta para empezar." />
      ) : null}

      {cash.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <SectionHeader title="Cuentas" amount={formatMoney(sum(cash.map((a) => balances[a.id] ?? 0)), prefs.currency, hide)} colors={colors} />
          {cash.map((a) => (
            <View key={a.id}>
              {primaryAccountId === a.id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Ionicons name="star" size={11} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Cuenta principal</Text>
                </View>
              ) : null}
              <AccountCard account={a} balance={balances[a.id] ?? 0} hide={hide} onPress={() => router.push(`/account/${a.id}`)} />
            </View>
          ))}
        </View>
      ) : null}

      {bolsillos.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <SectionHeader title="Bolsillos · inversión líquida" amount={formatMoney(sum(bolsillos.map((a) => balances[a.id] ?? 0)), prefs.currency, hide)} colors={colors} />
          {bolsillos.map((a) => (
            <AccountCard key={a.id} account={a} balance={balances[a.id] ?? 0} hide={hide} onPress={() => router.push(`/account/${a.id}`)} />
          ))}
        </View>
      ) : null}

      {cdts.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <SectionHeader title="CDT · inversión a plazo" amount={formatMoney(sum(cdts.map((a) => balances[a.id] ?? 0)), prefs.currency, hide)} colors={colors} />
          {cdts.map((a) => {
            const days = a.maturityDate ? Math.ceil((a.maturityDate - Date.now()) / 86400000) : null;
            const matured = days != null && days <= 0;
            return (
              <Card key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: (a.color || colors.accent) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={matured ? 'lock-open' : 'lock-closed'} size={16} color={a.color || colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{a.name}</Text>
                  <Text style={{ color: matured ? colors.positive : colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {a.maturityDate
                      ? matured ? 'Vencido · listo para cerrar' : `Bloqueado ${days} días · hasta ${new Date(a.maturityDate).toLocaleDateString('es-CO')}`
                      : 'Sin fecha de vencimiento'}
                    {a.expectedYield ? ` · rinde ${formatMoney(a.expectedYield, prefs.currency, hide)}` : ''}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(balances[a.id] ?? 0, prefs.currency, hide)}</Text>
              </Card>
            );
          })}
        </View>
      ) : null}

      {cards.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <SectionHeader title="Tarjetas de crédito" amount={formatMoney(sum(cards.map((a) => balances[a.id] ?? 0)), prefs.currency, hide)} amountColor={colors.negative} colors={colors} />
          {cards.map((a) => (
            <AccountCard key={a.id} account={a} balance={balances[a.id] ?? 0} hide={hide} onPress={() => router.push(`/account/${a.id}`)} />
          ))}
        </View>
      ) : null}

      {/* DEUDAS A EMPRESAS / ENTIDADES */}
      <View style={{ marginBottom: 10 }}>
        <SectionHeader title="Deudas · empresas y entidades" amount={formatMoney(entityDebtTotal, prefs.currency, hide)} amountColor={colors.negative} colors={colors} />
        {debtAccounts.map((a) => (
          <AccountCard key={`acc-${a.id}`} account={a} balance={balances[a.id] ?? 0} hide={hide} onPress={() => router.push(`/account/${a.id}`)} />
        ))}
        {borrowedEntity.map((l) => (
          <LoanRow key={`le-${l.id}`} loanId={l.id} name={l.name} sub={l.notes || undefined} negative colors={colors} prefs={prefs} hide={hide} />
        ))}
        {debtAccounts.length === 0 && borrowedEntity.length === 0 && cards.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Sin deudas con entidades.</Text>
        ) : null}
        <Button title="Registrar deuda con entidad" icon="add" variant="secondary" onPress={() => router.push('/loan/new?type=borrowed&kind=entity')} />
      </View>

      {/* DEUDAS A PERSONAS */}
      <View style={{ marginBottom: 10 }}>
        <SectionHeader title="Deudas · personas" amount={formatMoney(personDebtTotal, prefs.currency, hide)} amountColor={colors.negative} colors={colors} />
        {borrowedPerson.map((l) => (
          <LoanRow key={`lp-${l.id}`} loanId={l.id} name={people.find((p) => p.id === l.personId)?.name ?? l.name} sub={l.notes || undefined} negative colors={colors} prefs={prefs} hide={hide} />
        ))}
        {borrowedPerson.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>No le debes a ninguna persona.</Text>
        ) : null}
        <Button title="Registrar deuda con persona" icon="add" variant="secondary" onPress={() => router.push('/loan/new?type=borrowed&kind=person')} />
      </View>

      {/* ME DEBEN */}
      <View style={{ marginBottom: 10 }}>
        <SectionHeader title="Me deben" amount={formatMoney(lentTotal, prefs.currency, hide)} amountColor={colors.positive} colors={colors} />
        {lentLoans.map((l) => (
          <LoanRow key={`lent-${l.id}`} loanId={l.id} name={people.find((p) => p.id === l.personId)?.name ?? l.name} sub={l.notes || undefined} colors={colors} prefs={prefs} hide={hide} />
        ))}
        {lentLoans.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Nadie te debe por ahora.</Text>
        ) : null}
        <Button title="Registrar préstamo a alguien" icon="add" variant="secondary" onPress={() => router.push('/loan/new?type=lent&kind=person')} />
      </View>

      {/* PERSONAS */}
    </Screen>
  );
}

function SectionHeader({ title, amount, amountColor, colors }: { title: string; amount?: string; amountColor?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.groupHeader}>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      {amount ? <Text style={{ color: amountColor ?? colors.textMuted, fontWeight: '700', fontSize: 13 }}>{amount}</Text> : null}
    </View>
  );
}

function LoanRow({
  loanId, name, sub, negative, colors, prefs, hide,
}: {
  loanId: number;
  name: string;
  sub?: string;
  negative?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  prefs: ReturnType<typeof useTheme>['prefs'];
  hide: boolean;
}) {
  const balance = Math.abs(loanBalance(loanId));
  const c = negative ? colors.negative : colors.positive;
  return (
    <Card onPress={() => router.push(`/loan/${loanId}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={negative ? 'trending-down' : 'trending-up'} size={18} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{name}</Text>
        {sub ? <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Text style={{ color: c, fontWeight: '800' }}>{formatMoney(balance, prefs.currency, hide)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  groupTitle: { fontSize: 15, fontWeight: '800' },
});
