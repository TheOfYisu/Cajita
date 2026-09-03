import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Screen, Card, SectionTitle, EmptyState, ProgressBar, Chip, formatMoney } from '@/src/components/ui';
import { MonthlyBars, CategoryBreakdown } from '@/src/components/Charts';
import { spendingByCategory, monthRange } from '@/src/db/database';
import { getBudgetProgress } from '@/src/services/budgetService';
import { periodSummary, monthlySeriesRange, fullMonthlySeries } from '@/src/services/analyticsService';

type PeriodKey = 'month' | 'lastMonth' | '3m' | '6m' | '12m' | 'all' | 'custom';

function baseRange(key: Exclude<PeriodKey, 'custom'>, monthStartDay: number): { from: number; to: number; label: string; months: number } {
  const now = new Date();
  if (key === 'month') return { ...monthRange(monthStartDay), label: 'este mes', months: 6 };
  if (key === 'lastMonth') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime();
    return { ...monthRange(monthStartDay, prev), label: 'mes pasado', months: 6 };
  }
  const months = key === '3m' ? 3 : key === '6m' ? 6 : key === '12m' ? 12 : 120;
  const from = key === 'all' ? 0 : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();
  return { from, to: Date.now(), label: key === 'all' ? 'todo el historial' : `últimos ${months} meses`, months: key === 'all' ? 12 : months };
}

export default function StatsScreen() {
  const { netWorth, totalAssets, totalDebt, summary } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;
  const [period, setPeriod] = React.useState<PeriodKey>('month');
  const [custom, setCustom] = React.useState<{ from: number; to: number; label: string } | null>(null);
  const [view, setView] = React.useState<'summary' | 'monthly'>('summary');

  const resolved = period === 'custom' && custom
    ? { ...custom, months: 6 }
    : baseRange(period === 'custom' ? 'month' : period, prefs.monthStartDay);
  const { from, to, label, months } = resolved;

  const sum = React.useMemo(() => periodSummary(from, to), [from, to]);
  const byCat = React.useMemo(() => spendingByCategory(from, to, 'expense').slice(0, 10), [from, to]);
  const series = React.useMemo(() => (period === 'all' ? fullMonthlySeries() : monthlySeriesRange(months)), [period, months]);
  const budgets = React.useMemo(() => getBudgetProgress(prefs.monthStartDay), [prefs.monthStartDay]);

  const q = `?from=${from}&to=${to}&label=${encodeURIComponent(label)}`;

  const PERIODS: { key: Exclude<PeriodKey, 'custom'>; label: string }[] = [
    { key: 'month', label: 'Este mes' },
    { key: 'lastMonth', label: 'Mes pasado' },
    { key: '3m', label: '3 meses' },
    { key: '6m', label: '6 meses' },
    { key: '12m', label: '12 meses' },
    { key: 'all', label: 'Todo' },
  ];

  return (
    <Screen>
      <View style={[styles.netCard, { backgroundColor: colors.accent }]}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Patrimonio neto</Text>
        <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 4 }}>{formatMoney(netWorth, prefs.currency, hide)}</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>Activos {formatMoney(totalAssets, prefs.currency, hide)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>Deudas {formatMoney(totalDebt, prefs.currency, hide)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Chip label="Resumen" active={view === 'summary'} onPress={() => setView('summary')} />
        <Chip label="Mes a mes" active={view === 'monthly'} onPress={() => setView('monthly')} />
      </View>

      {view === 'summary' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {PERIODS.map((p) => (
              <Chip key={p.key} label={p.label} active={period === p.key} onPress={() => { setPeriod(p.key); setCustom(null); }} />
            ))}
          </ScrollView>

          {period === 'custom' && custom ? (
            <Pressable onPress={() => { setPeriod('month'); setCustom(null); }} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>‹ Volver al resumen general</Text>
            </Pressable>
          ) : null}

          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Movimientos de {label}</Text>
          <View style={styles.grid}>
            <Tile label="Ingresos" value={formatMoney(sum.income, prefs.currency, hide)} color={colors.positive} icon="arrow-up" onPress={() => router.push(`/insight/income${q}` as never)} colors={colors} />
            <Tile label="Gastos" value={formatMoney(sum.expense, prefs.currency, hide)} color={colors.negative} icon="arrow-down" onPress={() => router.push(`/insight/expense${q}` as never)} colors={colors} />
            <Tile label="Balance" value={formatMoney(sum.net, prefs.currency, hide)} color={colors.transfer} icon="stats-chart" colors={colors} />
            <Tile label="Transferencias" value={formatMoney(sum.transfers, prefs.currency, hide)} color={colors.transfer} icon="swap-horizontal" onPress={() => router.push(`/insight/transfers${q}` as never)} colors={colors} />
            <Tile label="Pagado a deudas" value={formatMoney(sum.debtPaid, prefs.currency, hide)} color={colors.warning} icon="trending-down" onPress={() => router.push(`/insight/debt-paid${q}` as never)} colors={colors} />
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 8 }}>Saldos actuales</Text>
          <View style={styles.grid}>
            <Tile label="Debo a entidades" value={formatMoney(summary.debtEntities, prefs.currency, hide)} color={colors.negative} icon="business" onPress={() => router.push('/insight/debt-entities')} colors={colors} />
            <Tile label="Debo a personas" value={formatMoney(summary.debtPeople, prefs.currency, hide)} color={colors.negative} icon="people" onPress={() => router.push('/insight/debt-people')} colors={colors} />
            <Tile label="Me deben" value={formatMoney(summary.owedToMe, prefs.currency, hide)} color={colors.positive} icon="cash" onPress={() => router.push('/insight/owed')} colors={colors} />
            <Tile label="Suscripciones" value={formatMoney(summary.subscriptionsMonthly, prefs.currency, hide)} color={colors.warning} icon="repeat" onPress={() => router.push('/insight/subscriptions')} colors={colors} />
          </View>

          <SectionTitle>Ingresos vs gastos por mes</SectionTitle>
          <Card><MonthlyBars data={series} currency={prefs.currency} /></Card>

          <SectionTitle>Gastos por categoría · {label}</SectionTitle>
          <Card>
            {byCat.length === 0 ? (
              <EmptyState icon="pie-chart-outline" title="Sin gastos en el periodo" />
            ) : (
              <CategoryBreakdown data={byCat} currency={prefs.currency} hide={hide} />
            )}
          </Card>
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {([['6m', '6'], ['12m', '12'], ['all', 'Todo']] as const).map(([k, l]) => (
              <Chip key={k} label={l === 'Todo' ? 'Todo' : `${l} meses`} active={period === k} onPress={() => { setPeriod(k); setCustom(null); }} />
            ))}
          </ScrollView>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
            Toca un mes para ver su resumen y desglose arriba.
          </Text>
          {[...series].reverse().map((m) => (
            <Card
              key={m.start}
              onPress={() => { setCustom({ from: m.start, to: m.end, label: m.longLabel }); setPeriod('custom'); setView('summary'); }}
              style={{ marginBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '700', textTransform: 'capitalize' }}>{m.longLabel}</Text>
                <Text style={{ color: m.net >= 0 ? colors.positive : colors.negative, fontWeight: '800' }}>
                  {m.net >= 0 ? '+' : ''}{formatMoney(m.net, prefs.currency, hide)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                <Text style={{ color: colors.positive, fontSize: 12 }}>▲ {formatMoney(m.income, prefs.currency, hide)}</Text>
                <Text style={{ color: colors.negative, fontSize: 12 }}>▼ {formatMoney(m.expense, prefs.currency, hide)}</Text>
                {m.transfers > 0 ? <Text style={{ color: colors.transfer, fontSize: 12 }}>⇄ {formatMoney(m.transfers, prefs.currency, hide)}</Text> : null}
              </View>
            </Card>
          ))}
        </>
      )}

      <View style={styles.sectionRow}>
        <SectionTitle style={{ marginBottom: 0 }}>Presupuestos (mes actual)</SectionTitle>
        <Pressable onPress={() => router.push('/settings/budgets')}>
          <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Gestionar</Text>
        </Pressable>
      </View>
      <Card>
        {budgets.length === 0 ? (
          <EmptyState icon="wallet-outline" title="Sin presupuestos" subtitle="Define un límite mensual por categoría." />
        ) : (
          <View style={{ gap: 14 }}>
            {budgets.map((b) => (
              <View key={b.categoryId} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{b.name}</Text>
                  <Text style={{ color: b.pct > 1 ? colors.negative : colors.textMuted, fontSize: 12 }}>
                    {formatMoney(b.spent, prefs.currency, hide)} / {formatMoney(b.budget, prefs.currency, hide)}
                  </Text>
                </View>
                <ProgressBar pct={b.pct} color={b.color} />
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Tile({ label, value, color, icon, onPress, colors }: {
  label: string; value: string; color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && onPress && { opacity: 0.7 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ color, fontSize: 16, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  netCard: { borderRadius: 20, padding: 18, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 },
});
