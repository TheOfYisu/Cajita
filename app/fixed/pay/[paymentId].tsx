import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption, formatMoney } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import {
  getPaymentById, getRecurringById, markFixedPaid, undoFixedPayment, setFixedSkipped,
} from '@/src/services/recurringService';

export default function PayFixedScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const pid = parseInt(paymentId, 10);
  const payment = getPaymentById(pid);
  const recurring = payment ? getRecurringById(payment.recurringId) : null;

  const { accounts, categories, refresh } = useApp();
  const { colors, prefs } = useTheme();

  const estimated = recurring ? Math.abs(recurring.amount) : 0;
  const alreadyPaid = !!payment?.paidAt;

  const [amount, setAmount] = React.useState(
    String(Math.round(payment?.amount ?? estimated) || ''),
  );
  const [accountId, setAccountId] = React.useState<number | null>(
    recurring?.accountId ?? accounts.find((a) => a.type === 'cash')?.id ?? accounts[0]?.id ?? null,
  );
  const [categoryId, setCategoryId] = React.useState<number | null>(recurring?.categoryId ?? null);
  const [date, setDate] = React.useState<number>(payment?.paidAt ?? Date.now());

  if (!payment || !recurring) {
    return <ModalScreen title="Pago"><Text style={{ color: colors.text }}>No encontrado</Text></ModalScreen>;
  }

  const fundAccounts = accounts.filter((a) => !['debt', 'loan'].includes(a.type));
  const accOpts: SelectOption<number>[] = fundAccounts.map((a) => ({
    value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color,
  }));
  const catOpts: SelectOption<number>[] = [
    { value: -1, label: 'Sin categoría', icon: 'remove-circle', color: colors.textMuted },
    ...categories.filter((c) => c.type === 'expense').map((c) => ({
      value: c.id, label: c.name, icon: safeIcon(c.icon), color: c.color,
    })),
  ];

  const confirm = () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!accountId) { Alert.alert('Selecciona la cuenta con la que pagaste'); return; }
    const acc = accounts.find((a) => a.id === accountId)!;
    const cat = categories.find((c) => c.id === categoryId);
    markFixedPaid({
      paymentId: pid,
      amount: amt,
      accountId: acc.id,
      accountUuid: acc.uuid,
      categoryId: cat?.id ?? null,
      categoryUuid: cat?.uuid ?? null,
      date,
      title: recurring.title,
    });
    refresh();
    router.back();
  };

  const undo = () => {
    undoFixedPayment(pid);
    refresh();
    router.back();
  };

  const skip = () => {
    setFixedSkipped(pid, true);
    refresh();
    router.back();
  };

  return (
    <ModalScreen
      title={recurring.title}
      footer={
        <View style={{ gap: 10 }}>
          <Button title={alreadyPaid ? 'Actualizar pago' : 'Confirmar pago'} onPress={confirm} />
          {alreadyPaid ? (
            <Button title="Marcar como no pagado" variant="ghost" color={colors.negative} onPress={undo} />
          ) : (
            <Button title="Omitir este mes" variant="ghost" color={colors.textMuted} onPress={skip} />
          )}
        </View>
      }
    >
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {recurring.variableAmount ? 'Monto estimado' : 'Monto habitual'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700' }}>
            {formatMoney(estimated, prefs.currency)}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Vence el {new Date(payment.dueDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}
        </Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Field
          label={recurring.variableAmount ? 'Monto real pagado' : 'Monto pagado'}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          prefix="$"
          big
          autoFocus
        />
        <DateField label="Fecha de pago" value={date} onChange={setDate} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Select label="Pagado desde" value={accountId} options={accOpts} onChange={setAccountId} placeholder="Cuenta" />
        <Select
          label="Categoría"
          value={categoryId ?? -1}
          options={catOpts}
          onChange={(v) => setCategoryId(v === -1 ? null : v)}
        />
      </Card>
    </ModalScreen>
  );
}
