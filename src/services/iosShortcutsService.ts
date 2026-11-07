import React from "react";
import { AppState, Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";
import { router } from "expo-router";
import { useApp } from "../store/appStore";
import { getAccounts } from "./accountService";
import { getCategories } from "./categoryService";
import {
  createTransaction,
  createTransfer,
  payCreditCard,
} from "./transactionService";

interface CajitaShortcutsNative {
  consumePendingShortcutRoute?: () => string | null;
  syncShortcutCatalog?: (jsonString: string) => void;
  consumePendingShortcutTransactions?: () => string | null;
  addListener?: (
    eventName: string,
    listener: (event: { route?: string }) => void
  ) => { remove: () => void };
}

interface PendingShortcutTransaction {
  mode: "expense" | "income" | "transfer" | "paycard";
  amount: number;
  title: string;
  accountId: number;
  toAccountId?: number | null;
  categoryId?: number | null;
  timestamp?: number;
}

let nativeModule: CajitaShortcutsNative | null | undefined;

function getNative(): CajitaShortcutsNative | null {
  if (nativeModule !== undefined) return nativeModule;
  nativeModule = null;
  if (Platform.OS === "ios") {
    try {
      nativeModule = requireNativeModule(
        "CajitaCloudSync"
      ) as CajitaShortcutsNative;
    } catch {
      nativeModule = null;
    }
  }
  return nativeModule;
}

function navigateToShortcutRoute(route: string | null | undefined) {
  if (!route) return;
  setTimeout(() => {
    try {
      router.push(route as never);
    } catch {
      /* noop */
    }
  }, 60);
}

/**
 * Procesa cualquier movimiento registrado en segundo plano desde el Atajo de iOS
 * (Botón de Acción / Doble Toque Atrás) sin haber abierto la app.
 */
export function flushPendingShortcutTransactions(): boolean {
  const mod = getNative();
  if (!mod || typeof mod.consumePendingShortcutTransactions !== "function") {
    return false;
  }

  let raw: string | null = null;
  try {
    raw = mod.consumePendingShortcutTransactions();
  } catch {
    return false;
  }
  if (!raw) return false;

  let items: PendingShortcutTransaction[] = [];
  try {
    items = JSON.parse(raw) as PendingShortcutTransaction[];
  } catch {
    return false;
  }
  if (!Array.isArray(items) || items.length === 0) return false;

  const accounts = getAccounts();
  const categories = getCategories();
  let insertedAny = false;

  for (const item of items) {
    const amt = Number(item.amount);
    if (!amt || amt <= 0) continue;

    const origin =
      accounts.find((a) => a.id === item.accountId) ?? accounts[0];
    if (!origin) continue;

    const txDate = item.timestamp && item.timestamp > 0 ? item.timestamp : Date.now();

    try {
      if (item.mode === "paycard") {
        const dest = accounts.find((a) => a.id === item.toAccountId);
        if (!dest) continue;
        payCreditCard({
          amount: amt,
          fromAccountId: origin.id,
          fromAccountUuid: origin.uuid,
          toAccountId: dest.id,
          toAccountUuid: dest.uuid,
          date: txDate,
        });
        insertedAny = true;
      } else if (item.mode === "transfer") {
        const dest = accounts.find((a) => a.id === item.toAccountId);
        if (!dest) continue;
        createTransfer({
          title: item.title?.trim() || "Transferencia",
          amount: amt,
          fromAccountId: origin.id,
          fromAccountUuid: origin.uuid,
          toAccountId: dest.id,
          toAccountUuid: dest.uuid,
          date: txDate,
        });
        insertedAny = true;
      } else {
        const isIncome = item.mode === "income";
        const signed = isIncome ? Math.abs(amt) : -Math.abs(amt);
        const cat =
          item.categoryId && item.categoryId > 0
            ? categories.find((c) => c.id === item.categoryId)
            : undefined;
        createTransaction({
          title:
            item.title?.trim() || (isIncome ? "Ingreso rápido" : "Gasto rápido"),
          notes: "Registrado desde Atajo de iOS",
          amount: signed,
          type: isIncome ? "income" : "expense",
          accountId: origin.id,
          accountUuid: origin.uuid,
          categoryId: cat?.id ?? null,
          categoryUuid: cat?.uuid ?? null,
          date: txDate,
        });
        insertedAny = true;
      }
    } catch {
      /* continúa con el siguiente movimiento */
    }
  }

  return insertedAny;
}

/**
 * Sincroniza el catálogo de cuentas y categorías con `UserDefaults` para que
 * `AppIntents` pueda mostrarlas en el menú flotante sin abrir la app, y procesa
 * los movimientos registrados en segundo plano.
 */
export function useIosShortcutsListener() {
  const { accounts, categories, refresh } = useApp();

  // Sincroniza cuentas y categorías cada vez que cambian
  React.useEffect(() => {
    const mod = getNative();
    if (!mod || typeof mod.syncShortcutCatalog !== "function") return;
    try {
      const payload = JSON.stringify({
        accounts: accounts.map((a) => ({
          id: a.id,
          uuid: a.uuid,
          name: a.name,
          type: a.type,
        })),
        categories: categories.map((c) => ({
          id: c.id,
          uuid: c.uuid,
          name: c.name,
          type: c.type,
        })),
      });
      mod.syncShortcutCatalog(payload);
    } catch {
      /* noop */
    }
  }, [accounts, categories]);

  const setupListeners = React.useCallback(() => {
    const checkAll = () => {
      if (flushPendingShortcutTransactions()) {
        refresh();
      }
      const mod = getNative();
      if (mod && typeof mod.consumePendingShortcutRoute === "function") {
        try {
          const pendingRoute = mod.consumePendingShortcutRoute();
          if (pendingRoute) {
            navigateToShortcutRoute(pendingRoute);
          }
        } catch {
          /* noop */
        }
      }
    };

    checkAll();

    const mod = getNative();
    const routeSub =
      mod && typeof mod.addListener === "function"
        ? mod.addListener("onShortcutRoute", (ev) => {
            if (ev?.route) {
              navigateToShortcutRoute(ev.route);
            }
          })
        : null;

    const bgTxSub =
      mod && typeof mod.addListener === "function"
        ? mod.addListener("onBackgroundTransactions", () => {
            if (flushPendingShortcutTransactions()) {
              refresh();
            }
          })
        : null;

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAll();
        setTimeout(checkAll, 350);
      }
    });

    return () => {
      routeSub?.remove();
      bgTxSub?.remove();
      appStateSub.remove();
    };
  }, [refresh]);

  return { setupListeners };
}
