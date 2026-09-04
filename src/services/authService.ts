import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapability {
  available: boolean;      // hardware presente y con algo enrolado
  enrolled: boolean;
  hasHardware: boolean;
  faceId: boolean;         // el dispositivo soporta reconocimiento facial
  fingerprint: boolean;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return { available: false, enrolled: false, hasHardware: false, faceId: false, fingerprint: false };
  }
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      hasHardware,
      enrolled,
      available: hasHardware && enrolled,
      faceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      fingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
    };
  } catch {
    return { available: false, enrolled: false, hasHardware: false, faceId: false, fingerprint: false };
  }
}

/** Nombre legible del método disponible: "Face ID", "huella", "biometría"… */
export function biometricLabel(cap: BiometricCapability): string {
  if (cap.faceId && Platform.OS === 'ios') return 'Face ID';
  if (cap.fingerprint && Platform.OS === 'ios') return 'Touch ID';
  if (cap.faceId && cap.fingerprint) return 'huella o rostro';
  if (cap.fingerprint) return 'huella';
  if (cap.faceId) return 'rostro';
  return 'biometría';
}

export async function authenticate(reason = 'Desbloquea Cajita'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false, // permite PIN/patrón del dispositivo como respaldo
    });
    return res.success;
  } catch {
    return false;
  }
}
