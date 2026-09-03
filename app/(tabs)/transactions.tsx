import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Chip, formatMoney, EmptyState } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { pageTransactions, transactionStats, TxFilter } from '@/src/services/transactionService';
import { Transaction } from '@/src/db/database';

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer';
const PAGE = 100;

export default function TransactionsScreen() {
  const { accounts, categories, transactions: storeTx } = useApp();
  const { colors, prefs } = useTheme();
  const [text, setText] = React.useState('');
  const [type, setType] = React.useState<TypeFilter>('all');
  const [accountId, setAccountId] = React.useState<number | null>(null);
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [limit, setLimit] = React.useState(PAGE);

  const filter = React.useMemo<TxFilter>(
    () => ({
      text: text.trim() || undefined,
      type: type === 'all' ? null : type,
      accountId,
      categoryId,
    }),
    [text, type, accountId, categoryId],
  );

  // Reinicia la paginación cuando cambian los filtros.
  React.useEffect(() => { setLimit(PAGE); }, [filter]);

  const rows = React.useMemo(
    () => pageTransactions({ ...filter, limit: limit + 1, offset: 0 }),
    [filter, limit, storeTx],
  );
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  const stats = React.useMemo(() => transactionStats(filter), [filter, storeTx]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={[]}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <View style={[styles.search, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Buscar por título o nota"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
          />
          {text ? (
            <Pressable onPress={() => setText('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></Pressable>
          ) : null}
          <Pressable onPress={() => setShowFilters((s) => !s)}>
            <Ionicons name="options" size={18} color={showFilters ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'expense', 'income', 'transfer'] as TypeFilter[]).map((t) => (
            <Chip
              key={t}
              label={t === 'all' ? 'Todos' : t === 'expense' ? 'Gastos' : t === 'income' ? 'Ingresos' : 'Transfer.'}
              active={type === t}
              onPress={() => setType(t)}
            />
          ))}
        </ScrollView>

        {showFilters ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Cuenta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="Todas" active={accountId == null} onPress={() => setAccountId(null)} />
              {accounts.map((a) => (
                <Chip key={a.id} label={a.name} color={a.color} active={accountId === a.id} onPress={() => setAccountId(a.id)} />
              ))}
            </ScrollView>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="Todas" active={categoryId == null} onPress={() => setCategoryId(null)} />
              {categories.map((c) => (
                <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{stats.count} movimientos</Text>
          <Text style={{ color: colors.positive, fontSize: 12, fontWeight: '700' }}>+{formatMoney(stats.income, prefs.currency, prefs.hideBalances)}</Text>
          <Text style={{ color: colors.negative, fontSize: 12, fontWeight: '700' }}>-{formatMoney(stats.expense, prefs.currency, prefs.hideBalances)}</Text>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="Sin resultados" />}
        renderItem={({ item }) => <Row t={item} accounts={accounts} categories={categories} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (hasMore) setLimit((l) => l + PAGE); }}
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>Mostrando {data.length} de {stats.count}</Text>
            </View>
          ) : data.length > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>
              {stats.count} movimientos en total
            </Text>
          ) : null
        }
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => router.push('/transaction/new')}>
        <Ionicons name="add" size={26} color="#FFF" />
      </Pressable>
    </SafeAreaView>
  );
}

function Row({ t, accounts, categories }: { t: Transaction; accounts: ReturnType<typeof useApp>['accounts']; categories: ReturnType<typeof useApp>['categories'] }) {
  const { colors, prefs } = useTheme();
  const cat = categories.find((c) => c.id === t.categoryId);
  const acc = accounts.find((a) => a.uuid === t.accountUuid);
  const isIn = t.type === 'income' || (t.type === 'transfer' && t.amount > 0);
  const color = t.type === 'transfer' ? colors.transfer : isIn ? colors.positive : colors.negative;
  const sign = t.type === 'expense' || (t.type === 'transfer' && t.amount < 0) ? '-' : '+';
  const icon = t.type === 'transfer' ? 'swap-horizontal' : safeIcon(cat?.icon, isIn ? 'arrow-up' : 'arrow-down');
  return (
    <Pressable
      onPress={() => router.push(`/transaction/${t.id}`)}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: (cat?.color ?? color) + '22' }]}>
        <Ionicons name={icon} size={16} color={cat?.color ?? color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{t.title || 'Sin título'}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {new Date(t.date).toLocaleDateString('es-CO')}{acc ? ` · ${acc.name}` : ''}{cat ? ` · ${cat.name}` : ''}
        </Text>
      </View>
      <Text style={{ color, fontWeight: '800' }}>{sign}{formatMoney(Math.abs(t.amount), prefs.currency, prefs.hideBalances)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginBottom: 8, gap: 10 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
});
