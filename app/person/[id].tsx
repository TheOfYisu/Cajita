import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Label, PickRow, formatMoney } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { DateField } from '@/src/components/DateField';
import { getPerson, deletePerson, updatePerson } from '@/src/services/personService';
import { createLoan, getLoan, deleteLoan, loanBalance } from '@/src/services/loanService';
import { createTransaction } from '@/src/services/transactionService';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = getPerson(parseInt(id ?? '0', 10));
  const { accounts, loans, refresh } = useApp();
  const { colors, prefs } = useTheme();
  const hide = prefs.hideBalances;

  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(person?.name ?? '');
  const [phone, setPhone] = React.useState(person?.phone ?? '');
  const [email, setEmail] = React.useState(person?.email ?? '');
  const [identification, setIdentification] = React.useState(person?.identification ?? '');
  const [notes, setNotes] = React.useState(person?.notes ?? '');

  const [newLoanName, setNewLoanName] = React.useState('');
  const [newLoanTotal, setNewLoanTotal] = React.useState('');
  const [newLoanType, setNewLoanType] = React.useState<'lent' | 'borrowed'>('lent');
  const [account, setAccount] = React.useState<number | null>(null);
  const [payment, setPayment] = React.useState('');
  const [date, setDate] = React.useState<number>(Date.now());

  if (!person) {
    return <ModalScreen title="Persona"><Text style={{ color: colors.text }}>No encontrada</Text></ModalScreen>;
  }

  const personLoans = loans.filter((l) => l.personId === person.id);
  const totalOwed = personLoans
    .filter((l) => l.type === 'lent')
    .reduce((s, l) => s + Math.abs(loanBalance(l.id)), 0);
  const totalBorrowed = personLoans
    .filter((l) => l.type === 'borrowed')
    .reduce((s, l) => s + Math.abs(loanBalance(l.id)), 0);
  const fundAccounts = accounts.filter((a) => !['credit_card', 'debt', 'loan'].includes(a.type));

  const saveEdit = () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert('Correo inválido'); return; }
    updatePerson(person.id, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      identification: identification.trim(),
      notes: notes.trim(),
    });
    refresh();
    setEditing(false);
  };

  const addLoan = () => {
    const t = parseFloat(newLoanTotal.replace(/[^\d.]/g, ''));
    if (!t || t <= 0) { Alert.alert('Monto inválido'); return; }
    createLoan({
      name: person.name,
      type: newLoanType,
      counterpartyKind: 'person',
      total: t,
      personId: person.id,
      notes: newLoanName.trim(),
      startDate: date,
    });
    refresh();
    setNewLoanName('');
    setNewLoanTotal('');
    Alert.alert(
      'Registrado',
      newLoanType === 'lent'
        ? `Le prestaste ${formatMoney(t, prefs.currency)} a ${person.name}.`
        : `${person.name} te prestó ${formatMoney(t, prefs.currency)}.`,
    );
  };

  const pay = (loanId: number) => {
    const amt = parseFloat(payment.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!account) { Alert.alert('Selecciona la cuenta de fondos'); return; }
    const loan = getLoan(loanId);
    if (!loan) return;
    const acct = accounts.find((a) => a.id === account)!;
    // borrowed (le debo): pago -> sale dinero de mi cuenta (gasto, monto negativo).
    // lent (me deben): abono -> entra dinero a mi cuenta (ingreso, monto positivo).
    const isBorrowed = loan.type === 'borrowed';
    createTransaction({
      title: isBorrowed ? `Pago a ${person.name}` : `Abono de ${person.name}`,
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
    Alert.alert('Registrado', `${isBorrowed ? 'Pago' : 'Abono'} de ${formatMoney(amt, prefs.currency)} registrado.`);
  };

  const remove = () => {
    Alert.alert('Eliminar persona', `¿Eliminar "${person.name}"? Se conservan sus préstamos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deletePerson(person.id); refresh(); router.back(); } },
    ]);
  };

  return (
    <ModalScreen
      title={editing ? 'Editar persona' : person.name}
      headerRight={
        <Ionicons name={editing ? 'checkmark' : 'create'} size={22} color={colors.accent} onPress={() => (editing ? saveEdit() : setEditing(true))} />
      }
      footer={<Button title="Eliminar persona" variant="ghost" color={colors.negative} onPress={remove} />}
    >
      {editing ? (
        <Card style={{ marginBottom: 12 }}>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Identificación" value={identification} onChangeText={setIdentification} />
          <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
        </Card>
      ) : (
        <Card style={{ marginBottom: 12, gap: 6 }}>
          {person.phone ? <InfoRow label="Teléfono" value={person.phone} colors={colors} /> : null}
          {person.identification ? <InfoRow label="Identificación" value={person.identification} colors={colors} /> : null}
          {person.notes ? <InfoRow label="Notas" value={person.notes} colors={colors} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Te debe</Text>
            <Text style={{ color: colors.positive, fontWeight: '800' }}>{formatMoney(totalOwed, prefs.currency, hide)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Le debes</Text>
            <Text style={{ color: colors.negative, fontWeight: '800' }}>{formatMoney(totalBorrowed, prefs.currency, hide)}</Text>
          </View>
        </Card>
      )}

      <Label>Registrar préstamo con {person.name}</Label>
      <Card style={{ marginBottom: 12, padding: 8 }}>
        <PickRow label={`Le presté a ${person.name}`} icon="trending-up" iconColor={colors.positive} selected={newLoanType === 'lent'} onPress={() => setNewLoanType('lent')} />
        <PickRow label={`${person.name} me prestó`} icon="trending-down" iconColor={colors.negative} selected={newLoanType === 'borrowed'} onPress={() => setNewLoanType('borrowed')} />
        <View style={{ paddingHorizontal: 8, paddingTop: 6 }}>
          <Field label="Monto" value={newLoanTotal} onChangeText={setNewLoanTotal} keyboardType="numeric" prefix="$" big />
          <Field label="Descripción (opcional)" value={newLoanName} onChangeText={setNewLoanName} placeholder="¿Por qué?" />
          <DateField label="Fecha" value={date} onChange={setDate} />
          <Button title="Registrar" icon="add" onPress={addLoan} style={{ marginTop: 10 }} />
        </View>
      </Card>

      {personLoans.length > 0 ? (
        <>
          <Label>Préstamos de {person.name}</Label>
          {personLoans.map((l) => {
            const balance = Math.abs(loanBalance(l.id));
            const isLent = l.type === 'lent';
            const c = isLent ? colors.positive : colors.negative;
            return (
              <Card key={l.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{l.name}</Text>
                  <Text style={{ color: c, fontWeight: '800' }}>{isLent ? '+' : '-'}{formatMoney(balance, prefs.currency, hide)}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {isLent ? 'Te deben' : 'Debes'} · Original {formatMoney(l.total, prefs.currency, hide)}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <Field label="Monto del abono" value={payment} onChangeText={setPayment} keyboardType="numeric" prefix="$" />
                  <DateField label="Fecha" value={date} onChange={setDate} />
                  <Label>Cuenta de fondos</Label>
                  {fundAccounts.map((a) => (
                    <PickRow key={a.id} label={a.name} icon={safeIcon(a.icon)} iconColor={a.color} selected={account === a.id} onPress={() => setAccount(a.id)} />
                  ))}
                  <Button title="Aplicar abono" onPress={() => pay(l.id)} style={{ marginTop: 10 }} />
                </View>
              </Card>
            );
          })}
        </>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 8 }}>
          Sin préstamos registrados.
        </Text>
      )}
    </ModalScreen>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}