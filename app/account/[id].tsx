import React from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import {
  ModalScreen, Card, Field, Button, Label, PickRow, ColorPicker, IconPicker, EmptyState, ProgressBar, Toggle, Select, SelectOption, formatMoney,
} from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { ACCOUNT_ICONS, IconName, safeIcon } from '@/src/theme';
import { Account } from '@/src/db/database';

const TYPE_OPTS: SelectOption<Account['type']>[] = [
  { value: 'bank', label: 'Banco / Cuenta corriente', icon: 'business' },
  { value: 'savings', label: 'Cuenta de ahorro', icon: 'wallet' },
  { value: 'cash', label: 'Efectivo', icon: 'cash' },
  { value: 'cajita', label: 'Bolsillo (inversión líquida)', icon: 'flower' },
  { value: 'cdt', label: 'CDT (inversión a plazo)', icon: 'lock-closed' },
  { value: 'credit_card', label: 'Tarjeta de crédito', icon: 'card' },
  { value: 'debt', label: 'Deuda', icon: 'trending-down' },
];
import { getAccount, updateAccount, deleteAccount, accountTypeLabel, setPrimaryAccount, closeCdt } from '@/src/services/accountService';
import { getTransactions, deleteTransaction } from '@/src/services/transactionService';
import { accountBalance } from '@/src/db/database';
import { defaultAccountIcon } from '@/src/components/AccountCard';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = parseInt(id ?? '0', 10);
  const account = getAccount(accountId);
  const { accounts, primaryAccountId, refresh } = useApp();
  const { colors, prefs } = useTheme();
  const [editing, setEditing] = React.useState(false);

  const [name, setName] = React.useState(account?.name ?? '');
  const [creditLimit, setCreditLimit] = React.useState(account?.creditLimit ? String(account.creditLimit) : '');
  const [color, setColor] = React.useState(account?.color ?? colors.accent);
  const [icon, setIcon] = React.useState<IconName>((account?.icon as IconName) ?? 'wallet');
  const [yieldAmount, setYieldAmount] = React.useState(account?.expectedYield ? String(account.expectedYield) : '');
  const [maturity, setMaturity] = React.useState<number>(account?.maturityDate ?? Date.now() + 180 * 86400000);
  const [isPrimary, setIsPrimary] = React.useState(!!account?.isPrimary);
  const [linkedAccount, setLinkedAccount] = React.useState<number | null>(account?.linkedAccountId ?? null);
  const [closeTarget, setCloseTarget] = React.useState<number | null>(null);
  const [type, setType] = React.useState<Account['type']>(account?.type ?? 'bank');
  const [excludeTotals, setExcludeTotals] = React.useState(!!account?.excludeFromTotals);

  if (!account) {
    return <ModalScreen title="Cuenta"><Text style={{ color: colors.text }}>Cuenta no encontrada</Text></ModalScreen>;
  }

  const balance = accountBalance(account.id);
  // En modo edición los campos dependen del tipo seleccionado; en vista, del guardado.
  const refType = editing ? type : account.type;
  const isCredit = refType === 'credit_card';
  const isCdt = refType === 'cdt';
  const canBePrimary = refType === 'bank' || refType === 'savings';
  const used = isCredit && account.creditLimit ? Math.max(0, account.creditLimit - balance) : 0;
  const txns = getTransactions({ accountId: account.id, limit: 100 });
  const hide = prefs.hideBalances;
  const fundAccounts = accounts.filter((a) => a.id !== account.id && ['bank', 'savings', 'cash', 'cajita'].includes(a.type));
  const effectiveCloseTarget = closeTarget ?? account.linkedAccountId ?? primaryAccountId ?? fundAccounts[0]?.id ?? null;

  const save = () => {
    updateAccount(account.id, {
      name: name.trim() || account.name,
      type,
      color,
      icon,
      excludeFromTotals: excludeTotals,
      creditLimit: type === 'credit_card' && creditLimit ? parseFloat(creditLimit) : null,
      expectedYield: type === 'cdt' && yieldAmount ? parseFloat(yieldAmount.replace(/[^\d.]/g, '')) : null,
      maturityDate: type === 'cdt' ? maturity : null,
      linkedAccountId: type === 'cdt' ? linkedAccount : null,
    });
    if (canBePrimary) {
      if (isPrimary && !account.isPrimary) setPrimaryAccount(account.id);
      else if (!isPrimary && account.isPrimary) updateAccount(account.id, { isPrimary: false });
    }
    refresh();
    setEditing(false);
  };

  const onCloseCdt = () => {
    if (!effectiveCloseTarget) { Alert.alert('Elige una cuenta', 'Selecciona a dónde va el dinero.'); return; }
    const target = accounts.find((a) => a.id === effectiveCloseTarget);
    Alert.alert(
      'Cerrar CDT',
      `El capital${account.expectedYield ? ' y el rendimiento' : ''} se moverán a "${target?.name ?? 'la cuenta'}" y el CDT quedará archivado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar CDT',
          onPress: () => {
            const res = closeCdt(account.id, effectiveCloseTarget);
            refresh();
            if (!res) Alert.alert('No se pudo', 'Selecciona una cuenta de destino válida.');
            else { Alert.alert('CDT cerrado', `Se movieron los fondos a ${target?.name ?? 'tu cuenta'}.`); router.back(); }
          },
        },
      ],
    );
  };

  const archive = () => {
    updateAccount(account.id, { isArchived: !account.isArchived });
    refresh();
    router.back();
  };

  const remove = () => {
    Alert.alert('Eliminar cuenta', `¿Eliminar "${account.name}"? Sus movimientos permanecerán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteAccount(account.id); refresh(); router.back(); } },
    ]);
  };

  return (
    <ModalScreen
      title={account.name}
      headerRight={
        <Pressable onPress={() => setEditing((e) => !e)}>
          <Ionicons name={editing ? 'close' : 'create-outline'} size={22} color={colors.accent} />
        </Pressable>
      }
    >
      <Card style={{ marginBottom: 12, alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Ionicons name={(icon as IconName) || defaultAccountIcon(account.type)} size={26} color={color} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {accountTypeLabel(account.type)}{account.isPrimary ? ' · ★ principal' : ''}{account.excludeFromTotals ? ' · fuera del total' : ''}
        </Text>
        <Text style={{ color: isCredit ? colors.negative : colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 }}>
          {formatMoney(balance, account.currency, hide)}
        </Text>
        {isCdt ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            {account.maturityDate
              ? (account.maturityDate <= Date.now() ? 'Vencido' : `Bloqueado hasta ${new Date(account.maturityDate).toLocaleDateString('es-CO')}`)
              : 'Sin fecha de vencimiento'}
            {account.expectedYield ? ` · rinde ${formatMoney(account.expectedYield, account.currency, hide)}` : ''}
          </Text>
        ) : null}
        {isCredit && account.creditLimit ? (
          <View style={{ width: '100%', marginTop: 12 }}>
            <ProgressBar pct={used / account.creditLimit} color={colors.negative} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              Usado {formatMoney(used, account.currency, hide)} de {formatMoney(account.creditLimit, account.currency, hide)}
            </Text>
          </View>
        ) : null}
      </Card>

      {editing ? (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Field label="Nombre" value={name} onChangeText={setName} />
            <Select label="Tipo de cuenta" value={type} options={TYPE_OPTS} onChange={setType} />
            {isCredit ? <Field label="Cupo" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" prefix="$" /> : null}
            {isCdt ? (
              <>
                <Field label="Rendimiento esperado" value={yieldAmount} onChangeText={setYieldAmount} keyboardType="numeric" prefix="$" />
                <DateField label="Bloqueado hasta" value={maturity} onChange={setMaturity} allowFuture />
                <Select
                  label="Cuenta destino al cerrar"
                  value={linkedAccount ?? -1}
                  options={[
                    { value: -1, label: 'Cuenta principal (por defecto)', icon: 'star', color: colors.accent },
                    ...fundAccounts.map((a) => ({ value: a.id, label: a.name, icon: safeIcon(a.icon), color: a.color })),
                  ]}
                  onChange={(v) => setLinkedAccount(v === -1 ? null : v)}
                />
              </>
            ) : null}
            {canBePrimary ? (
              <Toggle label="Cuenta principal" hint="Recibe los cierres de CDT" icon="star" value={isPrimary} onChange={setIsPrimary} />
            ) : null}
            <Toggle
              label="Afecta el patrimonio total"
              hint="Si lo desactivas, esta cuenta no suma ni resta en los totales del inicio"
              icon="stats-chart"
              value={!excludeTotals}
              onChange={(v) => setExcludeTotals(!v)}
            />
          </Card>
          <Label>Color</Label>
          <Card style={{ marginBottom: 12 }}><ColorPicker value={color} onChange={setColor} /></Card>
          <Label>Ícono</Label>
          <Card style={{ marginBottom: 12 }}><IconPicker value={icon} onChange={setIcon} icons={ACCOUNT_ICONS} color={color} /></Card>
          <Button title="Guardar cambios" onPress={save} />
          <Card style={{ padding: 8, marginTop: 12 }}>
            <PickRow label={account.isArchived ? 'Desarchivar cuenta' : 'Archivar cuenta'} icon="archive" onPress={archive} />
            <PickRow label="Eliminar cuenta" icon="trash" iconColor={colors.negative} onPress={remove} />
          </Card>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <Button title="Transferir" icon="swap-horizontal" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/transfer/new')} />
            {isCredit ? (
              <Button title="Pagar" icon="card" style={{ flex: 1 }} onPress={() => router.push('/transaction/new?mode=paycard')} />
            ) : (
              <Button title="Movimiento" icon="add" style={{ flex: 1 }} onPress={() => router.push('/transaction/new')} />
            )}
          </View>

          {isCdt ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Cerrar CDT</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                Al cerrarlo se registra el rendimiento como ingreso y el total pasa a la cuenta que elijas.
              </Text>
              <Label>¿A dónde va el dinero?</Label>
              {fundAccounts.length === 0 ? (
                <Text style={{ color: colors.negative, fontSize: 13 }}>Crea primero una cuenta de banco o ahorro.</Text>
              ) : (
                fundAccounts.map((a) => (
                  <PickRow
                    key={a.id}
                    label={a.name + (a.id === primaryAccountId ? '  ★' : '')}
                    icon={(a.icon as IconName) || 'wallet'}
                    iconColor={a.color}
                    selected={effectiveCloseTarget === a.id}
                    onPress={() => setCloseTarget(a.id)}
                  />
                ))
              )}
              <Button
                title="Cerrar CDT"
                icon="lock-open"
                onPress={onCloseCdt}
                disabled={fundAccounts.length === 0}
                style={{ marginTop: 12 }}
              />
            </Card>
          ) : null}

          <Label>Movimientos</Label>
          {txns.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Sin movimientos" />
          ) : (
            txns.map((t) => {
              const own = t.accountId === account.id;
              const delta =
                t.type === 'transfer' ? (own ? -Math.abs(t.amount) : Math.abs(t.amount)) : t.amount;
              return (
                <Card key={t.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{t.title || 'Sin título'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{new Date(t.date).toLocaleDateString('es-CO')}</Text>
                  </View>
                  <Text style={{ color: delta < 0 ? colors.negative : colors.positive, fontWeight: '700' }}>
                    {delta < 0 ? '-' : '+'}{formatMoney(Math.abs(delta), account.currency, hide)}
                  </Text>
                  <Pressable onPress={() => { deleteTransaction(t.id); refresh(); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </Card>
              );
            })
          )}
        </>
      )}
    </ModalScreen>
  );
}
