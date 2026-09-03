import React from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, EmptyState, formatMoney } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { monthRange } from '@/src/db/database';
import { pageTransactions } from '@/src/services/transactionService';
import { debtPaymentTransactions } from '@/src/services/analyticsService';
import { loanBalance } from '@/src/services/loanService';
import { getRecurring, frequencyLabel, daysUntil } from '@/src/services/recurringService';

const TITLES: Record<string, string> = {
  subscriptions: 'Suscripciones',
  income: 'Ingresos',
  expense: 'Gastos',
  transfers: 'Transferencias',
  'debt-paid': 'Pagado a deudas',
  'debt-entities': 'Deudas con entidades',
  'debt-people': 'Deudas con personas',
  owed: 'Me deben',
};

export default function InsightScreen() {
  const params = useLocalSearchParams<{ metric: string; from?: string; to?: string; label?: string }>();
  const metric = params.metric;
  const app = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  const range = params.from && params.to
    ? { from: Number(params.from), to: Number(params.to) }
    : monthRange(prefs.monthStartDay);
  const periodLabel = params.label ?? 'este mes';

  const accName = (uuid: string) => app.accounts.find((a) => a.uuid === uuid)?.name ?? '';
  const catOf = (id: number | null) => app.categories.find((c) => c.id === id);

  let body: React.ReactNode;

  if (metric === 'subscriptions') {
    const list = getRecurring(true).filter((r) => !r.isArchived);
    const total = list.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    body = (
      <>
        <TotalCard label="Suscripciones activas" value={`${list.length}`} sub={`≈ ${formatMoney(total, prefs.currency, hide)} por ciclo`} colors={colors} />
        {list.length === 0 ? <EmptyState icon="repeat" title="Sin suscripciones" /> : list.map((r) => {
          const cat = catOf(r.categoryId);
          const person = app.people.find((p) => p.id === r.personId);
          const d = daysUntil(r.nextRun);
          return (
            <Card key={r.id} onPress={() => router.push(`/subscription/${r.id}`)} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: (cat?.color ?? colors.accent) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={safeIcon(cat?.icon, 'repeat')} size={16} color={cat?.color ?? colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{r.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {frequencyLabel(r.frequency)} · próximo {new Date(r.nextRun).toLocaleDateString('es-CO')} ({d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d}d`})
                  </Text>
                  {person ? <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>Compartida con {person.name}{person.email ? ` · ${person.email}` : ''}</Text> : null}
                </View>
                <Text style={{ color: r.type === 'income' ? colors.positive : colors.text, fontWeight: '800' }}>
                  {formatMoney(r.amount, prefs.currency, hide)}
                </Text>
              </View>
            </Card>
          );
        })}
      </>
    );
  } else if (metric === 'debt-entities' || metric === 'debt-people' || metric === 'owed') {
    const isEntity = metric === 'debt-entities';
    const isOwed = metric === 'owed';
    const loanList = app.loans.filter((l) =>
      isOwed ? l.type === 'lent'
      : isEntity ? l.type === 'borrowed' && l.counterpartyKind !== 'person'
      : l.type === 'borrowed' && l.counterpartyKind === 'person',
    );
    const debtAccts = isEntity ? app.accounts.filter((a) => ['credit_card', 'debt', 'loan'].includes(a.type)) : [];
    const total =
      loanList.reduce((s, l) => s + Math.abs(loanBalance(l.id)), 0) +
      debtAccts.reduce((s, a) => s + Math.abs(app.balances[a.id] ?? 0), 0);
    const c = isOwed ? colors.positive : colors.negative;
    body = (
      <>
        <TotalCard label={isOwed ? 'Total por cobrar' : 'Total que debes'} value={formatMoney(total, prefs.currency, hide)} valueColor={c} colors={colors} />
        {debtAccts.map((a) => (
          <Card key={`a${a.id}`} onPress={() => router.push(`/account/${a.id}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: (a.color || c) + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={safeIcon(a.icon, 'card')} size={16} color={a.color || c} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }} numberOfLines={1}>{a.name}</Text>
            <Text style={{ color: c, fontWeight: '800' }}>{formatMoney(Math.abs(app.balances[a.id] ?? 0), prefs.currency, hide)}</Text>
          </Card>
        ))}
        {loanList.map((l) => {
          const person = app.people.find((p) => p.id === l.personId);
          return (
            <Card key={`l${l.id}`} onPress={() => router.push(`/loan/${l.id}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={isOwed ? 'trending-up' : 'trending-down'} size={16} color={c} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{person?.name ?? l.name}</Text>
                {l.notes ? <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{l.notes}</Text> : null}
              </View>
              <Text style={{ color: c, fontWeight: '800' }}>{formatMoney(Math.abs(loanBalance(l.id)), prefs.currency, hide)}</Text>
            </Card>
          );
        })}
        {debtAccts.length === 0 && loanList.length === 0 ? <EmptyState icon="checkmark-circle" title="Nada pendiente" /> : null}
      </>
    );
  } else {
    // Listas de transacciones por periodo
    const txns =
      metric === 'debt-paid'
        ? debtPaymentTransactions(range.from, range.to)
        : pageTransactions({
            type: metric === 'income' ? 'income' : metric === 'expense' ? 'expense' : 'transfer',
            from: range.from,
            to: range.to,
            limit: 500,
            offset: 0,
          }).filter((t) => (metric === 'transfers' ? t.amount < 0 || t.toAccountId == null : true));

    const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
    body = (
      <>
        <TotalCard
          label={`${TITLES[metric] ?? 'Total'} · ${periodLabel}`}
          value={formatMoney(total, prefs.currency, hide)}
          sub={`${txns.length} movimientos · ${new Date(range.from).toLocaleDateString('es-CO')} – ${new Date(range.to).toLocaleDateString('es-CO')}`}
          colors={colors}
        />
        {txns.length === 0 ? <EmptyState icon="receipt-outline" title="Sin movimientos en el periodo" /> : txns.map((t) => {
          const cat = catOf(t.categoryId);
          const isIn = t.type === 'income' || (t.type === 'transfer' && t.amount > 0);
          const col = t.type === 'transfer' ? colors.transfer : isIn ? colors.positive : colors.negative;
          return (
            <Card key={t.id} onPress={() => router.push(`/transaction/${t.id}`)} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: (cat?.color ?? col) + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={t.type === 'transfer' ? 'swap-horizontal' : safeIcon(cat?.icon, isIn ? 'arrow-up' : 'arrow-down')} size={15} color={cat?.color ?? col} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{t.title || 'Sin título'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {new Date(t.date).toLocaleDateString('es-CO')} · {accName(t.accountUuid)}
                </Text>
              </View>
              <Text style={{ color: col, fontWeight: '800' }}>{formatMoney(Math.abs(t.amount), prefs.currency, hide)}</Text>
            </Card>
          );
        })}
      </>
    );
  }

  return <ModalScreen title={TITLES[metric] ?? 'Detalle'}>{body}</ModalScreen>;
}

function TotalCard({ label, value, sub, valueColor, colors }: { label: string; value: string; sub?: string; valueColor?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor ?? colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 }}>{value}</Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</Text> : null}
    </Card>
  );
}
