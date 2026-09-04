import React from 'react';
import { Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import { createWithdrawal } from '@/src/services/cashService';

export default function NewWithdrawalScreen() {
  const { accounts, refresh } = useApp();
  const { colors } = useTheme();

  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const bankAccounts = accounts.filter((a) => ['bank', 'savings'].includes(a.type));

  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [fromId, setFromId] = React.useState<number | null>(bankAccounts[0]?.id ?? null);
  const [toId, setToId] = React.useState<number | null>(cashAccounts[0]?.id ?? null);
  const [date, setDate] = React.useState<number>(Date.now());

  const opts = (list: typeof accounts): SelectOption<number>[] =>
    list.map((a) => ({ value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color }));

  const save = () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!toId) { Alert.alert('Selecciona la cuenta de efectivo donde queda el dinero'); return; }
    const to = accounts.find((a) => a.id === toId)!;
    const from = fromId ? accounts.find((a) => a.id === fromId) : null;
    createWithdrawal({
      amount: amt,
      accountId: to.id,
      accountUuid: to.uuid,
      fromAccountId: from?.id ?? null,
      fromAccountUuid: from?.uuid ?? null,
      date,
      note,
    });
    refresh();
    router.back();
  };

  if (cashAccounts.length === 0) {
    return (
      <ModalScreen
        title="Retiro en efectivo"
        footer={<Button title="Crear cuenta de efectivo" icon="add" onPress={() => router.replace('/account/new')} />}
      >
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Necesitas una cuenta de efectivo</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Crea una cuenta de tipo «Efectivo» para registrar tus retiros y ver cuánto te queda del dinero en mano.
          </Text>
        </Card>
      </ModalScreen>
    );
  }

  return (
    <ModalScreen title="Retiro en efectivo" footer={<Button title="Registrar retiro" onPress={save} />}>
      <Card style={{ marginBottom: 12 }}>
        <Field label="¿Cuánto retiraste?" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big autoFocus />
        <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej: cajero centro comercial" />
        <DateField label="Fecha" value={date} onChange={setDate} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Select
          label="Sale de (opcional)"
          value={fromId}
          options={[{ value: -1, label: 'No registrar origen', icon: 'remove-circle', color: colors.textMuted }, ...opts(bankAccounts)]}
          onChange={(v) => setFromId(v === -1 ? null : v)}
          placeholder="Cuenta de banco"
        />
        <Select label="Queda en (efectivo)" value={toId} options={opts(cashAccounts)} onChange={setToId} placeholder="Cuenta de efectivo" />
      </Card>

      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        Los gastos que registres en esta cuenta de efectivo se irán descontando de este retiro. En Inicio verás cuánto te queda.
      </Text>
    </ModalScreen>
  );
}
