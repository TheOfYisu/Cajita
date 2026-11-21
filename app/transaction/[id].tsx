import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption, formatMoney, parseCurrencyInput, formatCurrencyInput, calculateLoanTotals } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import { getTransaction, updateTransaction, deleteTransaction } from '@/src/services/transactionService';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = getTransaction(parseInt(id ?? '0', 10));
  const { accounts, categories, refresh } = useApp();
  const { colors, prefs } = useTheme();

  const [title, setTitle] = React.useState(tx?.title ?? '');
  const [notes, setNotes] = React.useState(tx?.notes ?? '');
  const [amount, setAmount] = React.useState(tx ? formatCurrencyInput(Math.abs(tx.amount)) : '');
  const [accountId, setAccountId] = React.useState<number | null>(tx?.accountId ?? null);
  const [categoryId, setCategoryId] = React.useState<number | null>(tx?.categoryId ?? null);
  const [installments, setInstallments] = React.useState(tx?.installments ? String(tx.installments) : '');
  const [interestRate, setInterestRate] = React.useState(tx?.interestRate ? String(tx.interestRate) : '');
  const [date, setDate] = React.useState<number>(() => tx?.date ?? Date.now());

  if (!tx) {
    return <ModalScreen title="Movimiento"><Text style={{ color: colors.text }}>No encontrado</Text></ModalScreen>;
  }

  const editable = tx.type === 'expense' || tx.type === 'income';
  const isExpense = tx.type === 'expense';
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCreditCard = selectedAccount?.type === 'credit_card';
  const accOpts: SelectOption<number>[] = accounts
    .filter((a) => !['debt', 'loan'].includes(a.type))
    .map((a) => ({ value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color }));
  const catOpts: SelectOption<number>[] = [
    { value: -1, label: 'Sin categoría', icon: 'remove-circle', color: colors.textMuted },
    ...categories
      .filter((c) => (tx.type === 'income' ? c.type === 'income' || c.type === 'system' : c.type === 'expense'))
      .map((c) => ({ value: c.id, label: c.name, icon: safeIcon(c.icon), color: c.color })),
  ];

  const remove = () => {
    Alert.alert('Eliminar movimiento', '¿Eliminar este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(tx.id);
          refresh();
          router.back();
        },
      },
    ]);
  };

  const save = () => {
    const amt = parseCurrencyInput(amount);
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    const acct = accounts.find((a) => a.id === accountId);
    const cat = categories.find((c) => c.id === categoryId);
    const instNum = isCreditCard && installments.trim() ? parseInt(installments.replace(/\D/g, ''), 10) : null;
    const rateNum = isCreditCard && interestRate.trim() ? parseFloat(interestRate.replace(',', '.')) : null;

    updateTransaction(tx.id, {
      title: title.trim() || tx.title,
      notes,
      amount: isExpense ? -amt : amt,
      accountId: acct?.id ?? tx.accountId,
      accountUuid: acct?.uuid ?? tx.accountUuid,
      categoryId: cat?.id ?? null,
      categoryUuid: cat?.uuid ?? null,
      installments: instNum && !isNaN(instNum) ? instNum : null,
      interestRate: rateNum && !isNaN(rateNum) ? rateNum : null,
      date,
    });
    refresh();
    router.back();
  };

  return (
    <ModalScreen
      title={editable ? 'Editar movimiento' : 'Movimiento'}
      footer={
        <View style={{ gap: 10 }}>
          {editable ? <Button title="Guardar" onPress={save} /> : null}
          <Button title="Eliminar" variant="ghost" color={colors.negative} onPress={remove} />
        </View>
      }
    >
      {!editable ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Este movimiento es una {tx.type === 'transfer' ? 'transferencia' : 'corrección de saldo'} y no se edita directamente. Puedes eliminarlo.
          </Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 }}>
            {formatMoney(tx.amount, prefs.currency)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
            {tx.title} · {new Date(tx.date).toLocaleDateString('es-CO')}
            {tx.installments ? ` · ${tx.installments} cuota${tx.installments > 1 ? 's' : ''}` : ''}
            {tx.interestRate ? ` · ${tx.interestRate}% interés` : ''}
          </Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big />
            <Field label="Título" value={title} onChangeText={setTitle} />
            <Field label="Nota" value={notes} onChangeText={setNotes} />
            <DateField label="Fecha" value={date} onChange={setDate} />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Select label="Cuenta" value={accountId} options={accOpts} onChange={setAccountId} placeholder="Selecciona una cuenta" />
            <Select label="Categoría" value={categoryId ?? -1} options={catOpts} onChange={(v) => setCategoryId(v === -1 ? null : v)} />

            {isCreditCard ? (
              <View style={{ marginTop: 8 }}>
                <Field
                  label="Número de cuotas"
                  value={installments}
                  onChangeText={setInstallments}
                  placeholder="Ej: 1, 6, 12, 24..."
                  keyboardType="numeric"
                />
                <Field
                  label="% Interés mensual (opcional)"
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="Ej: 2.1 (0% a 1 cuota)"
                  keyboardType="decimal-pad"
                  prefix="%"
                />

                {(() => {
                  const pNum = parseCurrencyInput(amount);
                  const iNum = installments.trim() ? parseInt(installments.replace(/\D/g, ''), 10) : 1;
                  const rNum = interestRate.trim() ? parseFloat(interestRate.replace(',', '.')) : 0;
                  if (pNum <= 0) return null;
                  const c = calculateLoanTotals(pNum, iNum, rNum);
                  return (
                    <View style={{ marginTop: 6, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total a pagar con TC:</Text>
                        <Text style={{ color: colors.negative, fontSize: 18, fontWeight: '800' }}>
                          {formatMoney(c.totalPayment, 'COP')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cuota mensual ({iNum} cuota{iNum > 1 ? 's' : ''}):</Text>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                          {formatMoney(c.installmentAmount, 'COP')} / mes
                        </Text>
                      </View>
                      {c.totalInterest > 0 ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Intereses estimados:</Text>
                          <Text style={{ color: colors.negative, fontSize: 12, fontWeight: '700' }}>
                            +{formatMoney(c.totalInterest, 'COP')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </Card>
        </>
      )}
    </ModalScreen>
  );
}
