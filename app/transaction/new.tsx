import React from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import { createTransaction, payCreditCard, createTransfer, createExternalTransfer } from '@/src/services/transactionService';

type Mode = 'expense' | 'income' | 'transfer' | 'paycard';
const MODES: Mode[] = ['expense', 'income', 'transfer', 'paycard'];

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { accounts, categories, refresh } = useApp();
  const { colors } = useTheme();

  const initialMode: Mode = (MODES as string[]).includes(params.mode ?? '') ? (params.mode as Mode) : 'expense';
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [transferKind, setTransferKind] = React.useState<'internal' | 'external'>('internal');
  const [extDirection, setExtDirection] = React.useState<'out' | 'in'>('out');
  const [amount, setAmount] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [accountId, setAccountId] = React.useState<number | null>(null);
  const [toAccountId, setToAccountId] = React.useState<number | null>(null);
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState<number>(Date.now());

  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const fundAccounts = accounts.filter((a) => !['credit_card', 'debt', 'loan'].includes(a.type));
  const nonDebt = accounts.filter((a) => !['debt', 'loan'].includes(a.type));
  const isTransfer = mode === 'transfer';
  const isExternal = isTransfer && transferKind === 'external';

  const accOpts = (list: typeof accounts): SelectOption<number>[] =>
    list.map((a) => ({ value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color }));

  const typeOpts: SelectOption<Mode>[] = [
    { value: 'expense', label: 'Gasto', icon: 'arrow-down', color: colors.negative },
    { value: 'income', label: 'Ingreso', icon: 'arrow-up', color: colors.positive },
    { value: 'transfer', label: 'Transferencia', icon: 'swap-horizontal', color: colors.transfer },
    { value: 'paycard', label: 'Pagar tarjeta', icon: 'card', color: colors.transfer },
  ];

  const catOpts: SelectOption<number>[] = [
    { value: -1, label: 'Sin categoría', icon: 'remove-circle', color: colors.textMuted },
    ...categories
      .filter((c) => (mode === 'income' ? c.type === 'income' || c.type === 'system' : c.type === 'expense'))
      .map((c) => ({ value: c.id, label: c.name, icon: safeIcon(c.icon), color: c.color })),
  ];

  const save = () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!accountId) { Alert.alert('Selecciona una cuenta'); return; }
    const acct = accounts.find((a) => a.id === accountId)!;

    if (mode === 'paycard') {
      if (!toAccountId) { Alert.alert('Selecciona la tarjeta a pagar'); return; }
      const to = accounts.find((a) => a.id === toAccountId)!;
      payCreditCard({ amount: amt, fromAccountId: acct.id, fromAccountUuid: acct.uuid, toAccountId: to.id, toAccountUuid: to.uuid, date });
    } else if (isTransfer && transferKind === 'internal') {
      if (!toAccountId) { Alert.alert('Selecciona la cuenta destino'); return; }
      if (accountId === toAccountId) { Alert.alert('Origen y destino no pueden ser iguales'); return; }
      const to = accounts.find((a) => a.id === toAccountId)!;
      createTransfer({
        title: title || `${acct.name} → ${to.name}`,
        amount: amt,
        fromAccountId: acct.id, fromAccountUuid: acct.uuid,
        toAccountId: to.id, toAccountUuid: to.uuid,
        date,
      });
    } else if (isExternal) {
      createExternalTransfer({
        title: title || (extDirection === 'out' ? 'Transferencia enviada' : 'Transferencia recibida'),
        notes,
        amount: amt,
        fromAccountId: acct.id, fromAccountUuid: acct.uuid,
        direction: extDirection,
        date,
      });
    } else {
      const cat = categories.find((c) => c.id === categoryId);
      createTransaction({
        title: title || (mode === 'expense' ? 'Gasto' : 'Ingreso'),
        notes,
        amount: mode === 'expense' ? -amt : amt,
        type: mode === 'expense' ? 'expense' : 'income',
        accountId: acct.id, accountUuid: acct.uuid,
        categoryId: cat?.id ?? null, categoryUuid: cat?.uuid ?? null,
        date,
      });
    }
    refresh();
    router.back();
  };

  return (
    <ModalScreen title="Nueva transacción" footer={<Button title="Guardar" onPress={save} />}>
      <Card style={{ marginBottom: 12 }}>
        <Select
          label="Tipo de transacción"
          value={mode}
          options={typeOpts}
          onChange={(v) => { setMode(v); setToAccountId(null); }}
        />

        {isTransfer ? (
          <Select
            label="Tipo de transferencia"
            value={transferKind}
            options={[
              { value: 'internal', label: 'Interna', sublabel: 'Entre mis cuentas', icon: 'git-compare', color: colors.transfer },
              { value: 'external', label: 'Externa', sublabel: 'Fuera de la app (otro banco, persona…)', icon: 'exit', color: colors.warning },
            ]}
            onChange={(v) => { setTransferKind(v); setToAccountId(null); }}
          />
        ) : null}

        {isExternal ? (
          <Select
            label="Dirección"
            value={extDirection}
            options={[
              { value: 'out', label: 'Envié dinero', icon: 'arrow-up', color: colors.negative },
              { value: 'in', label: 'Recibí dinero', icon: 'arrow-down', color: colors.positive },
            ]}
            onChange={setExtDirection}
          />
        ) : null}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big autoFocus />
        <Field label={isTransfer ? 'Título (opcional)' : 'Título'} value={title} onChangeText={setTitle} placeholder="Descripción" />
        {mode === 'expense' || mode === 'income' || isExternal ? (
          <Field label="Nota (opcional)" value={notes} onChangeText={setNotes} />
        ) : null}
        <DateField label="Fecha" value={date} onChange={setDate} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Select
          label={mode === 'paycard' ? 'Cuenta de fondos' : isTransfer && transferKind === 'internal' ? 'Desde' : 'Cuenta'}
          value={accountId}
          options={accOpts(mode === 'paycard' ? fundAccounts : nonDebt)}
          onChange={setAccountId}
          placeholder="Selecciona una cuenta"
        />

        {mode === 'paycard' ? (
          <Select
            label="Tarjeta a pagar (reduce la deuda)"
            value={toAccountId}
            options={accOpts(creditCards)}
            onChange={setToAccountId}
            placeholder="Selecciona la tarjeta"
          />
        ) : isTransfer && transferKind === 'internal' ? (
          <Select
            label="Hacia"
            value={toAccountId}
            options={accOpts(nonDebt.filter((a) => a.id !== accountId))}
            onChange={setToAccountId}
            placeholder="Cuenta destino"
          />
        ) : isExternal ? null : (
          <Select
            label="Categoría"
            value={categoryId ?? -1}
            options={catOpts}
            onChange={(v) => setCategoryId(v === -1 ? null : v)}
          />
        )}
      </Card>
    </ModalScreen>
  );
}
