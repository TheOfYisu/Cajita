import React from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Label, PickRow } from '@/src/components/ui';

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL'];

export default function ProfileScreen() {
  const { prefs, updatePrefs } = useTheme();
  const [name, setName] = React.useState(prefs.userName);
  const [currency, setCurrency] = React.useState(prefs.currency);
  const [monthStart, setMonthStart] = React.useState(String(prefs.monthStartDay));

  const save = () => {
    const day = Math.min(28, Math.max(1, parseInt(monthStart, 10) || 1));
    updatePrefs({ userName: name.trim(), currency, monthStartDay: day, onboarded: true });
    router.back();
  };

  return (
    <ModalScreen title="Perfil" footer={<Button title="Guardar" onPress={save} />}>
      <Card style={{ marginBottom: 12 }}>
        <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="¿Cómo te llamas?" autoFocus />
        <Field label="Inicio del mes (día)" value={monthStart} onChangeText={setMonthStart} keyboardType="numeric" placeholder="1" />
      </Card>
      <Label>Moneda</Label>
      <Card style={{ padding: 8 }}>
        {CURRENCIES.map((c) => (
          <PickRow key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </Card>
    </ModalScreen>
  );
}
