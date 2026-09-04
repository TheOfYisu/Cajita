import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button } from '@/src/components/ui';
import { createPerson } from '@/src/services/personService';

export default function NewPersonScreen() {
  const { refresh, isPremium } = useApp();

  React.useEffect(() => {
    if (!isPremium) {
      Alert.alert('Función Premium', 'Las personas están disponibles con Cajita Premium.');
      router.back();
    }
  }, [isPremium]);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [identification, setIdentification] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const save = () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert('Correo inválido'); return; }
    createPerson({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      identification: identification.trim(),
      notes: notes.trim(),
    });
    refresh();
    router.back();
  };

  return (
    <ModalScreen title="Nueva persona" footer={<Button title="Guardar" onPress={save} />}>
      <Card style={{ marginBottom: 12 }}>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Carlos Gómez" autoFocus />
        <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="300 000 0000" />
        <Field label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="persona@correo.com" />
        <Field label="Identificación" value={identification} onChangeText={setIdentification} placeholder="CC / NIT" />
        <Field label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Referencia, dirección, relación, etc." />
      </Card>
    </ModalScreen>
  );
}