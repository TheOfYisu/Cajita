import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { formatMoney, ProgressBar } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { Transaction } from '@/src/db/database';
import { getSubscriptions, daysUntil, frequencyLabel } from '@/src/services/recurringService';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function monthName(): string {
  return new Date().toLocaleDateString('es-CO', { month: 'long' });
}

export default function HomeScreen() {
  const { accounts, transactions, netWorth, totalAssets, totalDebt, month, summary, fixed, cash } = useApp();
  const { colors, prefs, updatePrefs } = useTheme();
  const hide = prefs.hideBalances;
  const upcoming = getSubscriptions()
    .filter((r) => r.type === 'expense' && daysUntil(r.nextRun) <= 14)
    .sort((a, b) => a.nextRun - b.nextRun)
    .slice(0, 4);

  const fixedPending = fixed.items.filter((it) => it.status === 'pending' || it.status === 'overdue');
  const fixedDone = fixed.items.filter((it) => it.status === 'paid' || it.status === 'skipped').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()}</Text>
            <Text style={[styles.name, { color: colors.text }]}>
              {prefs.userName ? prefs.userName : 'Bienvenido a Cajita'}
            </Text>
          </View>
          <Pressable
            onPress={() => updatePrefs({ hideBalances: !hide })}
            hitSlop={10}
            style={[styles.eyeBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name={hide ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.netCard, { backgroundColor: colors.accent }]}>
          <Text style={styles.netLabel}>Patrimonio neto</Text>
          <Text style={styles.netValue}>{formatMoney(netWorth, prefs.currency, hide)}</Text>
          <View style={styles.netRow}>
            <View style={styles.netItem}>
              <Text style={styles.netItemLabel}>Activos</Text>
              <Text style={styles.netItemValue}>{formatMoney(totalAssets, prefs.currency, hide)}</Text>
            </View>
            <View style={styles.netDivider} />
            <View style={styles.netItem}>
              <Text style={styles.netItemLabel}>Deudas</Text>
              <Text style={styles.netItemValue}>{formatMoney(totalDebt, prefs.currency, hide)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Quick icon="arrow-down" label="Gasto" color={colors.negative} onPress={() => router.push('/transaction/new?mode=expense')} />
          <Quick icon="arrow-up" label="Ingreso" color={colors.positive} onPress={() => router.push('/transaction/new?mode=income')} />
          <Quick icon="swap-horizontal" label="Transferir" color={colors.transfer} onPress={() => router.push('/transfer/new')} />
          <Quick icon="cash" label="Retirar" color={colors.warning} onPress={() => router.push('/cash/new' as never)} />
        </View>

        {/* GASTOS FIJOS DEL MES */}
        {fixed.items.length > 0 && (
          <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.blockHead} onPress={() => router.push('/settings/recurring')}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Gastos fijos · <Text style={{ textTransform: 'capitalize' }}>{monthName()}</Text></Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {fixedDone} de {fixed.items.length} listos
                  {fixed.pendingTotal > 0 ? ` · faltan ${formatMoney(fixed.pendingTotal, prefs.currency, hide)}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <View style={{ marginTop: 10, marginBottom: fixedPending.length ? 12 : 0 }}>
              <ProgressBar pct={fixed.items.length ? fixedDone / fixed.items.length : 0} color={colors.positive} />
            </View>
            {fixedPending.slice(0, 3).map((it) => (
              <View key={it.payment.id} style={[styles.fixedRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{it.recurring.title}</Text>
                  <Text style={{ color: it.status === 'overdue' ? colors.negative : colors.textMuted, fontSize: 11, marginTop: 1 }}>
                    {it.status === 'overdue' ? 'Vencido' : 'Vence'} {new Date(it.payment.dueDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    {' · '}{it.recurring.variableAmount ? '~' : ''}{formatMoney(Math.abs(it.recurring.amount), prefs.currency, hide)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/fixed/pay/${it.payment.id}` as never)}
                  style={({ pressed }) => [styles.payBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 12 }}>Pagar</Text>
                </Pressable>
              </View>
            ))}
            {fixedPending.length === 0 ? (
              <Text style={{ color: colors.positive, fontSize: 12, fontWeight: '600', marginTop: 8 }}>Todo pagado este mes ✓</Text>
            ) : null}
          </View>
        )}

        {/* EFECTIVO EN MANO */}
        {cash.active.length > 0 ? (
          <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.blockHead} onPress={() => router.push('/cash' as never)}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Efectivo en mano</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            {cash.active.map((w) => {
              const pct = w.amount > 0 ? w.spent / w.amount : 0;
              return (
                <Pressable key={w.id} onPress={() => router.push(`/cash/${w.id}` as never)} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {w.note || 'Retiro'} · retiraste {formatMoney(w.amount, prefs.currency, hide)}
                    </Text>
                    <Text style={{ color: w.remaining < 0 ? colors.negative : colors.text, fontWeight: '800', fontSize: 13 }}>
                      quedan {formatMoney(w.remaining, prefs.currency, hide)}
                    </Text>
                  </View>
                  <ProgressBar pct={pct} color={colors.warning} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/cash/new' as never)}
            style={[styles.cashCta, { borderColor: colors.border }]}
          >
            <Ionicons name="cash-outline" size={18} color={colors.warning} />
            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>Registrar retiro en efectivo</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>ESTE MES</Text>
        <View style={styles.grid}>
          <StatTile label="Ingresos" value={formatMoney(month.income, prefs.currency, hide)} color={colors.positive} icon="arrow-up" colors={colors} onPress={() => router.push('/insight/income')} />
          <StatTile label="Gastos" value={formatMoney(month.expense, prefs.currency, hide)} color={colors.negative} icon="arrow-down" colors={colors} onPress={() => router.push('/insight/expense')} />
          <StatTile label="Gastos fijos" value={formatMoney(summary.fixedMonthly, prefs.currency, hide)} color={colors.warning} icon="home" colors={colors} onPress={() => router.push('/settings/recurring')} />
          <StatTile label="Suscripciones" value={formatMoney(summary.subscriptionsMonthly, prefs.currency, hide)} color={colors.warning} icon="repeat" colors={colors} onPress={() => router.push('/insight/subscriptions')} />
          <StatTile label="Transferencias" value={formatMoney(month.transfers, prefs.currency, hide)} color={colors.transfer} icon="swap-horizontal" colors={colors} onPress={() => router.push('/insight/transfers')} />
          <StatTile label="Pagado a deudas" value={formatMoney(summary.debtPaidThisMonth, prefs.currency, hide)} color={colors.transfer} icon="trending-down" colors={colors} onPress={() => router.push('/insight/debt-paid')} />
        </View>

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>SALDOS</Text>
        <View style={styles.grid}>
          <StatTile label="Debo a entidades" value={formatMoney(summary.debtEntities, prefs.currency, hide)} color={colors.negative} icon="business" colors={colors} onPress={() => router.push('/insight/debt-entities')} />
          <StatTile label="Debo a personas" value={formatMoney(summary.debtPeople, prefs.currency, hide)} color={colors.negative} icon="people" colors={colors} onPress={() => router.push('/insight/debt-people')} />
          <StatTile label="Me deben" value={formatMoney(summary.owedToMe, prefs.currency, hide)} color={colors.positive} icon="cash" colors={colors} onPress={() => router.push('/insight/owed')} />
          <StatTile label="Efectivo restante" value={formatMoney(cash.totalRemaining, prefs.currency, hide)} color={colors.warning} icon="wallet" colors={colors} onPress={() => router.push('/cash' as never)} />
        </View>

        {accounts.length === 0 ? (
          <Pressable onPress={() => router.push('/account/new')} style={[styles.addCard, { borderColor: colors.border }]}>
            <Ionicons name="add-circle" size={20} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: '600' }}>Crea tu primera cuenta</Text>
          </Pressable>
        ) : null}

        {upcoming.length > 0 && (
          <>
            <SectionHeader title="Próximos cobros" href="/settings/recurring" label="Ver" colors={colors} />
            {upcoming.map((r) => {
              const d = daysUntil(r.nextRun);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/subscription/${r.id}`)}
                  style={[styles.loanRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="repeat" size={18} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.loanName, { color: colors.text }]} numberOfLines={1}>{r.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {frequencyLabel(r.frequency)} · {d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {formatMoney(r.amount, prefs.currency, hide)}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}

        <SectionHeader title="Últimos movimientos" href="/transactions" label="Ver todos" colors={colors} />
        {transactions.slice(0, 8).map((t) => (
          <TxRow key={t.id} t={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({ icon, label, color, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function StatTile({
  label, value, color, icon, colors, onPress,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: ReturnType<typeof useTheme>['colors'];
  onPress?: () => void;
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

function SectionHeader({ title, href, label, colors }: { title: string; href: string; label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Link href={href as never} asChild>
        <Pressable><Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>{label}</Text></Pressable>
      </Link>
    </View>
  );
}

function TxRow({ t }: { t: Transaction }) {
  const { colors, prefs } = useTheme();
  const { accounts, categories } = useApp();
  const cat = categories.find((c) => c.id === t.categoryId);
  const acc = accounts.find((a) => a.uuid === t.accountUuid);
  const isIn = t.type === 'income' || (t.type === 'transfer' && t.amount > 0);
  const color = t.type === 'transfer' ? colors.transfer : isIn ? colors.positive : colors.negative;
  const sign = t.type === 'expense' || (t.type === 'transfer' && t.amount < 0) ? '-' : '+';
  const icon = t.type === 'transfer' ? 'swap-horizontal' : safeIcon(cat?.icon, isIn ? 'arrow-up' : 'arrow-down');
  return (
    <Pressable
      onPress={() => router.push(`/transaction/${t.id}`)}
      style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.txIcon, { backgroundColor: (cat?.color ?? color) + '22' }]}>
        <Ionicons name={icon} size={16} color={cat?.color ?? color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{t.title || 'Sin título'}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {new Date(t.date).toLocaleDateString('es-CO')}{acc ? ` · ${acc.name}` : ''}
        </Text>
      </View>
      <Text style={{ color, fontWeight: '800' }}>{sign}{formatMoney(Math.abs(t.amount), prefs.currency, prefs.hideBalances)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  eyeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  netCard: { borderRadius: 22, padding: 20, marginBottom: 16 },
  netLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  netValue: { color: '#FFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  netRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  netItem: { flex: 1 },
  netDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  netItemLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  netItemValue: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quick: { alignItems: 'center', gap: 6, flex: 1 },
  quickIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600' },
  block: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 12 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockTitle: { fontSize: 15, fontWeight: '800' },
  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  payBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  cashCta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 14, marginBottom: 12 },
  groupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 20 },
  loanRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 13, marginBottom: 8, gap: 10 },
  loanName: { flex: 1, fontSize: 14, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginBottom: 8, gap: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
