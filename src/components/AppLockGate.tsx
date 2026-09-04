import React from 'react';
import { View, Text, AppState, AppStateStatus, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { authenticate, getBiometricCapability, biometricLabel, BiometricCapability } from '../services/authService';

/** Tras volver de segundo plano, se re-bloquea si pasó más de este tiempo. */
const GRACE_MS = 15_000;

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { colors, prefs } = useTheme();
  const enabled = prefs.appLockEnabled && Platform.OS !== 'web';

  const [locked, setLocked] = React.useState(enabled);
  const [busy, setBusy] = React.useState(false);
  const [cap, setCap] = React.useState<BiometricCapability | null>(null);
  const backgroundedAt = React.useRef<number | null>(null);
  const promptingRef = React.useRef(false);

  React.useEffect(() => {
    getBiometricCapability().then(setCap);
  }, []);

  // Si el usuario activa/desactiva el bloqueo en Ajustes.
  React.useEffect(() => {
    if (!enabled) setLocked(false);
  }, [enabled]);

  const tryUnlock = React.useCallback(async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    setBusy(true);
    const ok = await authenticate('Desbloquea Cajita');
    setBusy(false);
    promptingRef.current = false;
    if (ok) setLocked(false);
  }, []);

  // Re-bloqueo al volver de segundo plano.
  React.useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since != null && Date.now() - since > GRACE_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // Auto-prompt al entrar en estado bloqueado.
  React.useEffect(() => {
    if (locked && enabled) tryUnlock();
  }, [locked, enabled, tryUnlock]);

  if (!locked) return <>{children}</>;

  const method = cap ? biometricLabel(cap) : 'biometría';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <View
        style={{
          width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.accent + '22',
        }}
      >
        <Ionicons name={cap?.faceId ? 'scan' : 'finger-print'} size={38} color={colors.accent} />
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Cajita está bloqueada</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
        {cap && !cap.available
          ? 'No hay biometría configurada en este dispositivo. Añade una huella o Face ID en los ajustes del sistema.'
          : `Usa ${method} para ver tus finanzas.`}
      </Text>
      <Pressable
        onPress={tryUnlock}
        disabled={busy}
        style={({ pressed }) => [
          {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14,
            opacity: busy ? 0.5 : pressed ? 0.85 : 1, marginTop: 8,
          },
        ]}
      >
        <Ionicons name="lock-open" size={18} color={colors.onAccent} />
        <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 15 }}>Desbloquear</Text>
      </Pressable>
    </View>
  );
}
