import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Label, PickRow, ProgressBar, formatMoney } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { getLoan, deleteLoan, loanBalance } from '@/src/services/loanService';
import { createTransaction } from '@/src/services/transactionService';
import { getTransactions } from '@/src/services/transactionService';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = getLoan(parseInt(id ?? '0', 10));
  const { accounts, people, refresh } = useApp();
  const { colors, prefs } = useTheme();

  const [account, setAccount] = React.useState<number | null>(null);
  const [payment, setPayment] = React.useState('');
  const [date, setDate] = React.useState<number>(Date.now());

  if (!loan) {
    return <ModalScreen title="Préstamo"><Text style={{ color: colors.text }}>No encontrado</Text></ModalScreen>;
  }

  const balance = Math.abs(loanBalance(loan.id));
  const original = loan.total + loan.totalOffset;
  const paid = Math.max(0, original - balance);
  const isBorrowed = loan.type === 'borrowed';
  const c = isBorrowed ? colors.negative : colors.positive;
  const fundAccounts = accounts.filter((a) => !['credit_card', 'debt', 'loan'].includes(a.type));
  const hide = prefs.hideBalances;
  const payments = getTransactions({ limit: 200 }).filter((t) => t.loanId === loan.id);
  const person = loan.personId ? people.find((p) => p.id === loan.personId) : null;
  const counterparty = loan.counterpartyKind === 'person'
    ? (person?.name ?? loan.name)
    : loan.name;

  const pay = () => {
    const amt = parseFloat(payment.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!account) { Alert.alert('Selecciona la cuenta de fondos'); return; }
    const acct = accounts.find((a) => a.id === account)!;
    createTransaction({
      title: `Cuota ${loan.name}`,
      amount: isBorrowed ? -amt : amt,
      type: isBorrowed ? 'expense' : 'income',
      accountId: acct.id,
      accountUuid: acct.uuid,
      loanId: loan.id,
      loanUuid: loan.uuid,
      date,
    });
    refresh();
    setPayment('');
    Alert.alert('Registrado', `Pago de ${formatMoney(amt, prefs.currency)} aplicado.`);
  };

  const remove = () => {
    Alert.alert('Eliminar', `¿Eliminar "${loan.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteLoan(loan.id); refresh(); router.back(); } },
    ]);
  };

  return (
    <ModalScreen
      title={loan.name}
      footer={<Button title="Eliminar préstamo" variant="ghost" color={colors.negative} onPress={remove} />}
    >
      <Card style={{ marginBottom: 12, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {isBorrowed ? 'Le debes a' : 'Te debe'} · {loan.counterpartyKind === 'person' ? 'persona' : 'entidad'}
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{counterparty}</Text>
        {person?.email ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{person.email}</Text> : null}
        <Text style={{ color: c, fontSize: 28, fontWeight: '900', marginTop: 8 }}>{formatMoney(balance, prefs.currency, hide)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
          Original {formatMoney(loan.total, prefs.currency, hide)} · Ajuste {formatMoney(loan.totalOffset, prefs.currency, hide)}
        </Text>
        {loan.notes ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{loan.notes}</Text> : null}
        {person ? (
          <Button title="Ver persona" variant="ghost" icon="person" onPress={() => router.push(`/person/${person.id}`)} style={{ marginTop: 10 }} />
        ) : null}
        {original > 0 ? (
          <View style={{ width: '100%', marginTop: 12 }}>
            <ProgressBar pct={paid / original} color={colors.positive} />
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Pagado {formatMoney(paid, prefs.currency, hide)} ({Math.round((paid / original) * 100)}%)</Text>
          </View>
        ) : null}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Registrar cuota</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
          Sale de tu cuenta de fondos y reduce el saldo pendiente.
        </Text>
        <Field label="Monto" value={payment} onChangeText={setPayment} keyboardType="numeric" prefix="$" big />
        <DateField label="Fecha" value={date} onChange={setDate} />
        <Label>Cuenta de fondos</Label>
        {fundAccounts.map((a) => (
          <PickRow key={a.id} label={a.name} icon={(a.icon as never) || 'wallet'} iconColor={a.color} selected={account === a.id} onPress={() => setAccount(a.id)} />
        ))}
        <Button title="Aplicar pago" onPress={pay} style={{ marginTop: 10 }} />
      </Card>

      {payments.length > 0 ? (
        <>
          <Label>Historial</Label>
          {payments.map((t) => (
            <Card key={t.id} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{new Date(t.date).toLocaleDateString('es-CO')}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{formatMoney(Math.abs(t.amount), prefs.currency, hide)}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </ModalScreen>
  );
}
