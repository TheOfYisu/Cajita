import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, formatMoney } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { getBudgets, setBudget } from '@/src/services/budgetService';

export default function BudgetsScreen() {
  const { categories, refresh } = useApp();
  const { colors, prefs } = useTheme();
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const [values, setValues] = React.useState<Record<number, string>>(() => {
    const b = getBudgets();
    const map: Record<number, string> = {};
    for (const x of b) map[x.categoryId] = String(x.amount);
    return map;
  });

  const save = () => {
    for (const c of expenseCats) {
      const raw = values[c.id];
      const amount = raw ? parseFloat(raw.replace(/[^\d.]/g, '')) : 0;
      setBudget(c.id, c.uuid, Number.isFinite(amount) ? amount : 0);
    }
    refresh();
    router.back();
  };

  const totalBudget = expenseCats.reduce((s, c) => s + (parseFloat(values[c.id] || '0') || 0), 0);

  return (
    <ModalScreen title="Presupuestos" footer={<Button title="Guardar" onPress={save} />}>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
        Define un límite mensual por categoría. Deja en blanco o 0 para quitar el presupuesto.
      </Text>
      <Card style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Total presupuestado</Text>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>{formatMoney(totalBudget, prefs.currency)}</Text>
      </Card>
      {expenseCats.map((c) => (
        <Card key={c.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={safeIcon(c.icon)} size={15} color={c.color} />
            </View>
            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{c.name}</Text>
          </View>
          <Field
            value={values[c.id] ?? ''}
            onChangeText={(t) => setValues((v) => ({ ...v, [c.id]: t }))}
            keyboardType="numeric"
            placeholder="0"
            prefix="$"
          />
        </Card>
      ))}
    </ModalScreen>
  );
}
