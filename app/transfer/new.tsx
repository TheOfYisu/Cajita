import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import { createTransfer } from '@/src/services/transactionService';

export default function NewTransferScreen() {
  const { accounts, refresh } = useApp();
  const { colors } = useTheme();
  const [amount, setAmount] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [fromId, setFromId] = React.useState<number | null>(null);
  const [toId, setToId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState<number>(Date.now());

  const opts = (list: typeof accounts): SelectOption<number>[] =>
    list.map((a) => ({ value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color }));

  const save = () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!fromId || !toId) { Alert.alert('Selecciona origen y destino'); return; }
    if (fromId === toId) { Alert.alert('Origen y destino no pueden ser iguales'); return; }
    const from = accounts.find((a) => a.id === fromId)!;
    const to = accounts.find((a) => a.id === toId)!;
    createTransfer({
      title: title || `${from.name} → ${to.name}`,
      amount: amt,
      fromAccountId: from.id,
      fromAccountUuid: from.uuid,
      toAccountId: to.id,
      toAccountUuid: to.uuid,
      date,
    });
    refresh();
    router.back();
  };

  return (
    <ModalScreen title="Transferencia" footer={<Button title="Transferir" color={colors.transfer} onPress={save} />}>
      <Card style={{ marginBottom: 12 }}>
        <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big autoFocus />
        <Field label="Título (opcional)" value={title} onChangeText={setTitle} placeholder="Transferencia" />
        <DateField label="Fecha" value={date} onChange={setDate} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Select label="Desde" value={fromId} options={opts(accounts)} onChange={setFromId} placeholder="Cuenta de origen" />
        <Select
          label="Hacia"
          value={toId}
          options={opts(accounts.filter((a) => a.type !== 'debt' && a.id !== fromId))}
          onChange={setToId}
          placeholder="Cuenta de destino"
        />
      </Card>
    </ModalScreen>
  );
}
