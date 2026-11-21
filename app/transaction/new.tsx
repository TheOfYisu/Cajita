import React from 'react';
import { Alert, View, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Select, SelectOption, parseCurrencyInput, calculateLoanTotals, formatMoney } from '@/src/components/ui';
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
  const [installments, setInstallments] = React.useState('1');
  const [interestRate, setInterestRate] = React.useState('');
  const [date, setDate] = React.useState<number>(() => Date.now());

  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const fundAccounts = accounts.filter((a) => !['credit_card', 'debt', 'loan'].includes(a.type));
  const nonDebt = accounts.filter((a) => !['debt', 'loan'].includes(a.type));
  const isTransfer = mode === 'transfer';
  const isExternal = isTransfer && transferKind === 'external';

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCreditCardExpense = mode === 'expense' && selectedAccount?.type === 'credit_card';

  const txAmountNum = parseCurrencyInput(amount);
  const txInstNum = installments.trim() ? parseInt(installments.replace(/\D/g, ''), 10) : 1;
  const txRateNum = interestRate.trim() ? parseFloat(interestRate.replace(',', '.')) : 0;
  const tcCalc = React.useMemo(() => {
    return calculateLoanTotals(txAmountNum, txInstNum, txRateNum);
  }, [txAmountNum, txInstNum, txRateNum]);

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
    const amt = parseCurrencyInput(amount);
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
      const instNum = isCreditCardExpense && installments.trim() ? parseInt(installments.replace(/\D/g, ''), 10) : null;
      const rateNum = isCreditCardExpense && interestRate.trim() ? parseFloat(interestRate.replace(',', '.')) : null;

      createTransaction({
        title: title || (mode === 'expense' ? 'Gasto' : 'Ingreso'),
        notes,
        amount: mode === 'expense' ? -amt : amt,
        type: mode === 'expense' ? 'expense' : 'income',
        accountId: acct.id, accountUuid: acct.uuid,
        categoryId: cat?.id ?? null, categoryUuid: cat?.uuid ?? null,
        installments: instNum && !isNaN(instNum) ? instNum : null,
        interestRate: rateNum && !isNaN(rateNum) ? rateNum : null,
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

        {isCreditCardExpense ? (
          <View style={{ marginTop: 4 }}>
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

            {txAmountNum > 0 ? (
              <View style={{ marginTop: 6, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total a pagar con TC:</Text>
                  <Text style={{ color: colors.negative, fontSize: 18, fontWeight: '800' }}>
                    {formatMoney(tcCalc.totalPayment, 'COP')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cuota mensual ({txInstNum} cuota{txInstNum > 1 ? 's' : ''}):</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                    {formatMoney(tcCalc.installmentAmount, 'COP')} / mes
                  </Text>
                </View>
                {tcCalc.totalInterest > 0 ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Intereses estimados:</Text>
                    <Text style={{ color: colors.negative, fontSize: 12, fontWeight: '700' }}>
                      +{formatMoney(tcCalc.totalInterest, 'COP')}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.positive, fontSize: 11, marginTop: 2, fontWeight: '600' }}>
                    ✓ Sin cobro de intereses (1 cuota o 0% tasa)
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

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
          <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 4 }}>
              {categories
                .filter((c) => (mode === 'income' ? c.type === 'income' || c.type === 'system' : c.type === 'expense'))
                .slice(0, 6)
                .map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(isSelected ? null : c.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: isSelected ? c.color : colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: isSelected ? c.color : colors.border,
                      }}
                    >
                      <Ionicons name={safeIcon(c.icon) as keyof typeof Ionicons.glyphMap} size={13} color={isSelected ? '#fff' : c.color} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
            <Select
              label="Todas las categorías"
              value={categoryId ?? -1}
              options={catOpts}
              onChange={(v) => setCategoryId(v === -1 ? null : v)}
            />
          </View>
        )}
      </Card>
    </ModalScreen>
  );
}
