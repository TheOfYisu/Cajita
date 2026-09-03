import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import {
  ModalScreen, Card, Field, Button, Label, PickRow, Chip, Toggle, formatMoney,
} from '@/src/components/ui';
import { DateField } from '@/src/components/DateField';
import { safeIcon } from '@/src/theme';
import {
  getRecurringById, createRecurring, updateRecurring, deleteRecurring,
  FREQUENCIES, nextOccurrences, daysUntil,
} from '@/src/services/recurringService';
import { syncSubscriptionNotifications } from '@/src/services/notificationService';
import { Recurring } from '@/src/db/database';

const LEAD_OPTIONS = [1, 2, 3, 5, 7, 10];

export default function SubscriptionEditor() {
  const params = useLocalSearchParams<{ id: string; type?: string }>();
  const isNew = !params.id || params.id === 'new';
  const existing = isNew ? null : getRecurringById(parseInt(params.id, 10));

  const { accounts, categories, people, refresh } = useApp();
  const { colors, prefs } = useTheme();

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [amount, setAmount] = React.useState(existing ? String(existing.amount) : '');
  const [type, setType] = React.useState<'expense' | 'income'>(
    existing?.type ?? (params.type === 'income' ? 'income' : 'expense'),
  );
  const [frequency, setFrequency] = React.useState<Recurring['frequency']>(existing?.frequency ?? 'monthly');
  const [firstDate, setFirstDate] = React.useState<number>(existing?.nextRun ?? nextMonthGuess());
  const [accountId, setAccountId] = React.useState<number | null>(existing?.accountId ?? accounts[0]?.id ?? null);
  const [categoryId, setCategoryId] = React.useState<number | null>(existing?.categoryId ?? null);
  const [personId, setPersonId] = React.useState<number | null>(existing?.personId ?? null);
  const [leadDays, setLeadDays] = React.useState<number>(existing?.leadDays ?? prefs.defaultLeadDays);
  const [notify, setNotify] = React.useState<boolean>(existing ? existing.notify : true);

  if (!isNew && !existing) {
    return <ModalScreen title="Suscripción"><Text style={{ color: colors.text }}>No encontrada</Text></ModalScreen>;
  }

  const selCats = categories.filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'));
  const person = people.find((p) => p.id === personId);

  const save = async () => {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!title.trim()) { Alert.alert('Ponle un nombre a la suscripción'); return; }
    if (!amt || amt <= 0) { Alert.alert('Monto inválido'); return; }
    if (!accountId) { Alert.alert('Selecciona la cuenta de cobro'); return; }
    const acc = accounts.find((a) => a.id === accountId)!;
    const cat = categories.find((c) => c.id === categoryId);
    const payload = {
      title: title.trim(),
      amount: amt,
      type,
      accountId: acc.id,
      accountUuid: acc.uuid,
      categoryId: cat?.id ?? null,
      categoryUuid: cat?.uuid ?? null,
      personId: personId ?? null,
      frequency,
      nextRun: firstDate,
      leadDays,
      notify,
    };
    if (existing) updateRecurring(existing.id, payload);
    else createRecurring(payload);
    refresh();
    await syncSubscriptionNotifications();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Eliminar', `¿Eliminar "${existing.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => { deleteRecurring(existing.id); refresh(); await syncSubscriptionNotifications(); router.back(); },
      },
    ]);
  };

  const preview = notify
    ? nextOccurrences({ ...(existing ?? ({} as Recurring)), frequency, nextRun: firstDate, leadDays } as Recurring, 1)[0]
    : null;

  return (
    <ModalScreen
      title={isNew ? 'Nueva suscripción' : 'Editar suscripción'}
      footer={
        <View style={{ gap: 10 }}>
          <Button title={isNew ? 'Crear' : 'Guardar'} onPress={save} />
          {existing ? <Button title="Eliminar" variant="ghost" color={colors.negative} onPress={remove} /> : null}
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Chip label="Gasto / cobro" color={colors.negative} active={type === 'expense'} onPress={() => setType('expense')} />
        <Chip label="Ingreso" color={colors.positive} active={type === 'income'} onPress={() => setType('income')} />
      </View>

      <Card style={{ marginBottom: 12 }}>
        <Field label="Nombre" value={title} onChangeText={setTitle} placeholder="Ej: Netflix, Gimnasio Smart Fit" autoFocus />
        <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" prefix="$" big />
        <DateField label="Primer / próximo cobro" value={firstDate} onChange={setFirstDate} allowFuture />
      </Card>

      <Label>Frecuencia</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {FREQUENCIES.map((f) => (
          <Chip key={f.key} label={f.label} active={frequency === f.key} onPress={() => setFrequency(f.key)} />
        ))}
      </View>

      <Card style={{ marginBottom: 12, padding: 8 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <Toggle
            label="Recordarme el pago"
            hint="Aviso anticipado y el día anterior"
            icon="notifications"
            value={notify}
            onChange={setNotify}
          />
        </View>
        {notify ? (
          <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
            <Label>Avisarme con antelación</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LEAD_OPTIONS.map((d) => (
                <Chip key={d} label={`${d} día${d > 1 ? 's' : ''}`} active={leadDays === d} onPress={() => setLeadDays(d)} />
              ))}
            </View>
            {preview ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                Recibirás avisos {leadDays} día{leadDays > 1 ? 's' : ''} antes, el día anterior y el mismo día
                {' '}({new Date(preview).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}).
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Label>Cuenta de cobro</Label>
      <Card style={{ padding: 8, marginBottom: 12 }}>
        {accounts.map((a) => (
          <PickRow key={a.id} label={a.name} icon={safeIcon(a.icon)} iconColor={a.color} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
        ))}
      </Card>

      <Label>Categoría (opcional)</Label>
      <Card style={{ padding: 8, marginBottom: 12 }}>
        {selCats.map((c) => (
          <PickRow key={c.id} label={c.name} icon={safeIcon(c.icon)} iconColor={c.color} selected={categoryId === c.id} onPress={() => setCategoryId((v) => (v === c.id ? null : c.id))} />
        ))}
      </Card>

      <Label>Compartida con alguien (opcional)</Label>
      <Card style={{ padding: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 8, paddingTop: 4 }}>
          Si divides esta suscripción con otra persona, asóciala aquí. Se mostrará su correo en los recordatorios.
        </Text>
        <PickRow label="Solo yo" icon="person-outline" selected={personId === null} onPress={() => setPersonId(null)} />
        {people.map((p) => (
          <PickRow
            key={p.id}
            label={p.email ? `${p.name} · ${p.email}` : p.name}
            icon="person"
            iconColor={colors.accent}
            selected={personId === p.id}
            onPress={() => setPersonId(p.id)}
          />
        ))}
        <PickRow label="Nueva persona…" icon="person-add" iconColor={colors.accent} onPress={() => router.push('/person/new')} />
      </Card>

      {person ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
          {formatMoney(parseFloat(amount.replace(/[^\d.]/g, '')) / 2 || 0, prefs.currency)} por persona si se divide en partes iguales.
        </Text>
      ) : null}
      <View style={{ height: 8 }} />
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        {existing && existing.nextRun ? `Próximo cobro en ${daysUntil(existing.nextRun)} días` : ''}
      </Text>
    </ModalScreen>
  );
}

function nextMonthGuess(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}
