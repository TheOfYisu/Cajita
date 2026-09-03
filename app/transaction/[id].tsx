import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption, formatMoney } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import { getTransaction, updateTransaction, deleteTransaction } from '@/src/services/transactionService';
import { getDb } from '@/src/db/database';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = getTransaction(parseInt(id ?? '0', 10));
  const { accounts, categories, refresh } = useApp();
  const { colors, prefs } = useTheme();

  const [title, setTitle] = React.useState(tx?.title ?? '');
  const [notes, setNotes] = React.useState(tx?.notes ?? '');
  const [amount, setAmount] = React.useState(tx ? String(Math.abs(tx.amount)) : '');
  const [accountId, setAccountId] = React.useState<number | null>(tx?.accountId ?? null);
  const [categoryId, setCategoryId] = React.useState<number | null>(tx?.categoryId ?? null);
  const [date, setDate] = React.useState<number>(tx?.date ?? Date.now());

  if (!tx) {
    return <ModalScreen title="Movimiento"><Text style={{ color: colors.text }}>No encontrado</Text></ModalScreen>;
  }

  const editable = tx.type === 'expense' || tx.type === 'income';
  const isExpense = tx.type === 'expense';
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
          // borrar el par de la transferencia
          if (tx.type === 'transfer') {
            getDb().runSync(
              `UPDATE transactions SET deletedAt = ?, syncState = 'deleted'
               WHERE deletedAt IS NULL AND type='transfer' AND accountUuid = ? AND toAccountUuid = ? AND ABS(amount) = ? AND date = ?`,
              [Date.now(), tx.toAccountUuid, tx.accountUuid, Math.abs(tx.amount), tx.date],
            );
          }
          refresh();
          router.back();
        },
      },
    ]);
  };

  const save = () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    const acct = accounts.find((a) => a.id === accountId);
    const cat = categories.find((c) => c.id === categoryId);
    updateTransaction(tx.id, {
      title: title.trim() || tx.title,
      notes,
      amount: isExpense ? -amt : amt,
      accountId: acct?.id ?? tx.accountId,
      accountUuid: acct?.uuid ?? tx.accountUuid,
      categoryId: cat?.id ?? null,
      categoryUuid: cat?.uuid ?? null,
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
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{tx.title} · {new Date(tx.date).toLocaleDateString('es-CO')}</Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big />
            <Field label="Título" value={title} onChangeText={setTitle} />
            <Field label="Nota" value={notes} onChangeText={setNotes} />
            <DateField label="Fecha" value={date} onChange={setDate} />
          </Card>

          <Card>
            <Select label="Cuenta" value={accountId} options={accOpts} onChange={setAccountId} placeholder="Selecciona una cuenta" />
            <Select label="Categoría" value={categoryId ?? -1} options={catOpts} onChange={(v) => setCategoryId(v === -1 ? null : v)} />
          </Card>
        </>
      )}
    </ModalScreen>
  );
}
