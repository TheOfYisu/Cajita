import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Label, PickRow, ColorPicker, IconPicker, Toggle } from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { ACCOUNT_ICONS, IconName, SWATCHES, safeIcon } from '@/src/theme';
import { createAccount } from '@/src/services/accountService';
import { balanceCorrection } from '@/src/services/transactionService';
import { Account } from '@/src/db/database';
import { defaultAccountIcon } from '@/src/components/AccountCard';

const TYPES: { value: Account['type']; label: string }[] = [
  { value: 'bank', label: 'Banco / Cuenta corriente' },
  { value: 'savings', label: 'Cuenta de ahorro' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'cajita', label: 'Bolsillo (inversión líquida)' },
  { value: 'cdt', label: 'CDT (inversión a plazo)' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'debt', label: 'Deuda' },
];

export default function NewAccountScreen() {
  const { accounts, refresh } = useApp();
  const { colors } = useTheme();
  const fundAccounts = accounts.filter((a) => ['bank', 'savings', 'cash', 'cajita'].includes(a.type));
  const [linkedAccount, setLinkedAccount] = React.useState<number | null>(null);
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<Account['type']>('bank');
  const [creditLimit, setCreditLimit] = React.useState('');
  const [initial, setInitial] = React.useState('');
  const [maturity, setMaturity] = React.useState<number>(() => Date.now() + 180 * 86400000);
  const [yieldAmount, setYieldAmount] = React.useState('');
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [excludeTotals, setExcludeTotals] = React.useState(false);
  const [color, setColor] = React.useState(SWATCHES[2]);
  const [icon, setIcon] = React.useState<IconName>('business');
  const [iconTouched, setIconTouched] = React.useState(false);

  const pickType = (t: Account['type']) => {
    setType(t);
    if (!iconTouched) setIcon(defaultAccountIcon(t));
  };

  const save = () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    const a = createAccount({
      name: name.trim(),
      type,
      color,
      icon,
      creditLimit: type === 'credit_card' && creditLimit ? parseFloat(creditLimit) : null,
      maturityDate: type === 'cdt' ? maturity : null,
      expectedYield: type === 'cdt' && yieldAmount ? parseFloat(yieldAmount.replace(/[^\d.]/g, '')) : null,
      linkedAccountId: type === 'cdt' ? linkedAccount : null,
      excludeFromTotals: excludeTotals,
      isPrimary: isPrimary && (type === 'bank' || type === 'savings'),
    });
    const init = parseFloat(initial);
    if (init && Number.isFinite(init)) {
      balanceCorrection({ accountId: a.id, accountUuid: a.uuid, amount: init, title: 'Saldo inicial' });
    }
    refresh();
    router.back();
  };

  return (
    <ModalScreen title="Nueva cuenta" footer={<Button title="Crear cuenta" onPress={save} />}>
      <Card style={{ marginBottom: 12, alignItems: 'center' }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{name || 'Vista previa'}</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Davivienda Ahorros 9680" autoFocus />
        <Field label="Saldo inicial (opcional)" value={initial} onChangeText={setInitial} keyboardType="numeric" prefix="$" />
        {type === 'credit_card' ? (
          <Field label="Cupo" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" prefix="$" />
        ) : null}
        {type === 'cdt' ? (
          <>
            <Field label="Rendimiento esperado (cuánto genera)" value={yieldAmount} onChangeText={setYieldAmount} keyboardType="numeric" prefix="$" />
            <DateField label="Bloqueado hasta" value={maturity} onChange={setMaturity} allowFuture />
          </>
        ) : null}
        {type === 'bank' || type === 'savings' ? (
          <Toggle label="Cuenta principal" hint="A esta cuenta llegan los cierres de CDT" icon="star" value={isPrimary} onChange={setIsPrimary} />
        ) : null}
        <Toggle
          label="Afecta el patrimonio total"
          hint="Si lo desactivas, no suma ni resta en los totales del inicio"
          icon="stats-chart"
          value={!excludeTotals}
          onChange={(v) => setExcludeTotals(!v)}
        />
      </Card>

      <Label>Tipo</Label>
      <Card style={{ padding: 8, marginBottom: 12 }}>
        {TYPES.map((t) => (
          <PickRow key={t.value} label={t.label} selected={type === t.value} onPress={() => pickType(t.value)} />
        ))}
      </Card>

      <Label>Color</Label>
      <Card style={{ marginBottom: 12 }}>
        <ColorPicker value={color} onChange={setColor} />
      </Card>

      <Label>Ícono</Label>
      <Card style={{ marginBottom: type === 'cdt' ? 12 : 0 }}>
        <IconPicker value={icon} onChange={(i) => { setIcon(i); setIconTouched(true); }} icons={ACCOUNT_ICONS} color={color} />
      </Card>

      {type === 'cdt' ? (
        <>
          <Label>Cuenta destino al cerrar el CDT</Label>
          <Card style={{ padding: 8 }}>
            <PickRow label="Cuenta principal (por defecto)" icon="star" iconColor={colors.accent} selected={linkedAccount === null} onPress={() => setLinkedAccount(null)} />
            {fundAccounts.map((a) => (
              <PickRow key={a.id} label={a.name} icon={safeIcon(a.icon)} iconColor={a.color} selected={linkedAccount === a.id} onPress={() => setLinkedAccount(a.id)} />
            ))}
          </Card>
        </>
      ) : null}
    </ModalScreen>
  );
}
