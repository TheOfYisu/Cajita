import React from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Toggle } from '@/src/components/ui';
import {
  getBiometricCapability, authenticate, biometricLabel, BiometricCapability,
} from '@/src/services/authService';

export default function SecurityScreen() {
  const { colors, prefs, updatePrefs } = useTheme();
  const [cap, setCap] = React.useState<BiometricCapability | null>(null);

  React.useEffect(() => {
    getBiometricCapability().then(setCap);
  }, []);

  const method = cap ? biometricLabel(cap) : 'biometría';
  const canUse = !!cap?.available;

  const onToggle = async (next: boolean) => {
    if (!next) {
      updatePrefs({ appLockEnabled: false });
      return;
    }
    if (!canUse) {
      Alert.alert(
        'Sin biometría',
        'Este dispositivo no tiene huella ni reconocimiento facial configurado. Añádelo en los ajustes del sistema y vuelve a intentarlo.',
      );
      return;
    }
    const ok = await authenticate('Confirma para activar el bloqueo');
    if (ok) updatePrefs({ appLockEnabled: true });
    else Alert.alert('No se pudo verificar', 'Inténtalo de nuevo.');
  };

  return (
    <ModalScreen title="Seguridad">
      <Card style={{ padding: 8, marginBottom: 12 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <Toggle
            label="Bloquear la app"
            hint={canUse ? `Pide ${method} al abrir Cajita` : 'Requiere huella o Face ID en el sistema'}
            icon="finger-print"
            value={prefs.appLockEnabled}
            onChange={onToggle}
          />
        </View>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Ionicons name={canUse ? 'shield-checkmark' : 'shield-outline'} size={20} color={canUse ? colors.positive : colors.textMuted} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {canUse ? `${method[0].toUpperCase()}${method.slice(1)} disponible` : 'Biometría no disponible'}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          {cap == null
            ? 'Comprobando el dispositivo…'
            : !cap.hasHardware
              ? 'El dispositivo no tiene sensor biométrico. Puedes usar el PIN/patrón del sistema como respaldo cuando esté disponible.'
              : !cap.enrolled
                ? 'Hay sensor biométrico pero no tienes ninguna huella ni rostro registrado. Configúralo en los ajustes del sistema.'
                : 'Al activar el bloqueo, Cajita pedirá autenticación al abrirse y al volver de segundo plano.'}
        </Text>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Ionicons name="lock-closed" size={20} color={colors.positive} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>Datos cifrados en el dispositivo</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          La base de datos local está cifrada con SQLCipher (AES-256). La clave vive en el
          llavero seguro del teléfono, así que el archivo es ilegible fuera de la app aunque
          extraigan el dispositivo.{'\n\n'}
          El <Text style={{ fontWeight: '700', color: colors.text }}>backup JSON</Text> que exportas
          en Ajustes → Datos <Text style={{ fontWeight: '700', color: colors.text }}>no está cifrado</Text>:
          guárdalo en un sitio seguro. Es también lo que necesitas para pasar tus datos a otro
          teléfono (la clave de cifrado no se transfiere).
        </Text>
      </Card>
    </ModalScreen>
  );
}
