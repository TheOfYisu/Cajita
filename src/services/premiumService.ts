import { Platform } from 'react-native';
import { getPrefs, setPrefs } from './prefsService';
import type { Purchase } from 'react-native-iap';

/**
 * Sistema de Premium (compra única de por vida).
 *
 * IMPORTANTE: `react-native-iap` v16 usa NitroModules (módulo nativo). Se carga de
 * forma perezosa y protegida: si el módulo nativo no está compilado en el build
 * (Expo Go, dev build viejo, web), la app sigue funcionando y Premium queda
 * simplemente inactivo (no rompe el arranque).
 *
 * Para que las compras funcionen en iOS hay que recompilar el dev build con
 * `react-native-iap` + `react-native-nitro-modules` (autolink + pod install).
 */

/** ID del producto no consumible en App Store Connect. */
export const PREMIUM_PRODUCT_ID = 'com.cajita.app.premium';

type IapModule = typeof import('react-native-iap');

let _iap: IapModule | null | undefined;

/** Devuelve el módulo nativo solo si está disponible en este build. */
function iap(): IapModule | null {
  if (_iap !== undefined) return _iap;
  if (Platform.OS === 'web') {
    _iap = null;
    return null;
  }
  try {
    // require() dentro de la función para que no se ejecute al importar el módulo.
    _iap = require('react-native-iap') as IapModule;
  } catch {
    _iap = null;
  }
  return _iap;
}

interface Listener {
  remove(): void;
}

let updateListener: Listener | null = null;
let errorListener: Listener | null = null;

export function isPremium(): boolean {
  return getPrefs().premium;
}

/** Funciones de pago de la app: clave → descripción corta. */
export const PREMIUM_FEATURES: { key: string; label: string; icon: string }[] = [
  { key: 'backup', label: 'Copia de seguridad automática en iCloud', icon: 'cloud-upload' },
  { key: 'fixed', label: 'Gastos fijos y suscripciones', icon: 'repeat' },
  { key: 'loans', label: 'Préstamos y personas', icon: 'people' },
  { key: 'stats', label: 'Estadísticas avanzadas', icon: 'stats-chart' },
];

/**
 * Conecta los listeners de compra (eventos del StoreKit).
 * Llamar una vez al arranque. Devuelve una función de limpieza.
 */
export function initPremium(): () => void {
  const RNIap = iap();
  if (!RNIap) return () => {};
  try {
    updateListener = RNIap.purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId === PREMIUM_PRODUCT_ID) {
        try {
          await RNIap.finishTransaction({ purchase, isConsumable: false });
          grantPremium();
        } catch {
          /* noop */
        }
      }
    });
    errorListener = RNIap.purchaseErrorListener((err) => {
      console.warn('purchase error', err?.code, err?.message);
    });
  } catch {
    /* noop */
  }
  return () => {
    try {
      updateListener?.remove();
      errorListener?.remove();
    } catch {
      /* noop */
    }
    updateListener = null;
    errorListener = null;
  };
}

/** Activa Premium de forma local (persistente). */
export function grantPremium(): void {
  setPrefs({ premium: true });
}

/** Devuelve el precio localizado del producto (si está disponible). */
export async function getPremiumPrice(): Promise<string | null> {
  const RNIap = iap();
  if (!RNIap) return null;
  try {
    await RNIap.initConnection();
    const products = await RNIap.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'in-app' });
    if (!products) return null;
    const p = products.find((x) => 'id' in x && x.id === PREMIUM_PRODUCT_ID) as
      | { displayPrice?: string | null; price?: number | null; currency?: string }
      | undefined;
    return p?.displayPrice ?? (p?.price != null && p.currency ? `${p.currency} ${p.price}` : null);
  } catch {
    return null;
  }
}

/** Inicia el flujo de compra de Premium. */
export async function purchasePremium(): Promise<boolean> {
  const RNIap = iap();
  if (!RNIap) return false;
  if (isPremium()) return true;
  try {
    await RNIap.initConnection();
    await RNIap.requestPurchase({
      request: { apple: { sku: PREMIUM_PRODUCT_ID } },
      type: 'in-app',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Restaura compras previas (por si se reinstaló la app o se cambió de dispositivo).
 * Devuelve true si Premium se restauró correctamente.
 */
export async function restorePremium(): Promise<boolean> {
  const RNIap = iap();
  if (!RNIap) return getPrefs().premium;
  try {
    await RNIap.initConnection();
    await RNIap.restorePurchases();
    const purchases = await RNIap.getAvailablePurchases();
    const owned = purchases.some((p) => p.productId === PREMIUM_PRODUCT_ID);
    if (owned) grantPremium();
    return owned || getPrefs().premium;
  } catch {
    return getPrefs().premium;
  }
}

/** Muestra los productos de pago disponibles (debug / pantalla). */
export async function getPremiumProducts() {
  const RNIap = iap();
  if (!RNIap) return [];
  try {
    await RNIap.initConnection();
    return await RNIap.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'in-app' });
  } catch {
    return [];
  }
}