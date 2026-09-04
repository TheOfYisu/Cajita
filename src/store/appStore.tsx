import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { getAccounts } from '@/src/services/accountService';
import { getCategories, seedDefaultCategories } from '@/src/services/categoryService';
import { getLoans } from '@/src/services/loanService';
import { getPeople } from '@/src/services/personService';
import { getTransactions } from '@/src/services/transactionService';
import { getBudgets } from '@/src/services/budgetService';
import {
  runDueRecurring, getSubscriptions, getFixedForMonth,
  fixedMonthlySummary, FixedMonthlySummary,
} from '@/src/services/recurringService';
import { activeWithdrawals, lastMonthLeftover, WithdrawalView } from '@/src/services/cashService';
import { loanBalance as loanBalanceOf } from '@/src/services/loanService';
import { syncSubscriptionNotifications } from '@/src/services/notificationService';
import {
  accountBalance,
  getDb,
  monthRange,
  Account,
  Category,
  Loan,
  Transaction,
  Budget,
  Person,
} from '@/src/db/database';
import { getPrefs } from '@/src/services/prefsService';
import { initPremium, restorePremium } from '@/src/services/premiumService';
import { safeIcon } from '@/src/theme';

interface AppState {
  accounts: Account[];
  categories: Category[];
  loans: Loan[];
  people: Person[];
  transactions: Transaction[];
  budgets: Budget[];
  balances: Record<number, number>;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  primaryAccountId: number | null;
  month: { income: number; expense: number; net: number; transfers: number };
  summary: {
    debtEntities: number;
    debtPeople: number;
    owedToMe: number;
    subscriptionsMonthly: number;
    fixedMonthly: number;
    debtPaidThisMonth: number;
  };
  fixed: FixedMonthlySummary;
  cash: { active: WithdrawalView[]; totalRemaining: number; lastMonthLeftover: number };
  isPremium: boolean;
  refresh: () => void;
}

const MONTHLY_FACTOR: Record<string, number> = {
  weekly: 4.333,
  biweekly: 2.166,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const AppContext = createContext<AppState | null>(null);

const DEBT_TYPES = ['credit_card', 'debt', 'loan'];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo<AppState>(() => {
    void tick;
    const accounts = getAccounts();
    const categories = getCategories();
    const loans = getLoans();
    const people = getPeople();
    const transactions = getTransactions({ limit: 400 });
    const budgets = getBudgets();
    const balances: Record<number, number> = {};
    let totalAssets = 0;
    for (const a of accounts) {
      const b = accountBalance(a.id);
      balances[a.id] = b;
      if (!a.excludeFromTotals && !DEBT_TYPES.includes(a.type)) totalAssets += b;
    }

    const prefs = getPrefs();
    const { from, to } = monthRange(prefs.monthStartDay);
    const row = getDb().getFirstSync<{ inc: number; exp: number; tr: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS inc,
         COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END),0) AS exp,
         COALESCE(SUM(CASE WHEN type='transfer' AND amount < 0 THEN ABS(amount) ELSE 0 END),0) AS tr
       FROM transactions WHERE deletedAt IS NULL AND date BETWEEN ? AND ?`,
      [from, to],
    );
    const income = row?.inc ?? 0;
    const expense = row?.exp ?? 0;
    const transfers = row?.tr ?? 0;

    const primaryAccountId = accounts.find((a) => a.isPrimary)?.id ?? null;

    let debtEntities = 0;
    let debtPeople = 0;
    let owedToMe = 0;
    for (const l of loans) {
      const bal = Math.abs(loanBalanceOf(l.id));
      if (l.type === 'lent') owedToMe += bal;
      else if (l.counterpartyKind === 'person') debtPeople += bal;
      else debtEntities += bal;
    }
    // Tarjetas de crédito y cuentas de deuda cuentan como deuda con entidades.
    for (const a of accounts) {
      if (!a.excludeFromTotals && ['credit_card', 'debt', 'loan'].includes(a.type)) {
        debtEntities += Math.abs(balances[a.id] ?? 0);
      }
    }

    // Pagado a créditos / deudas este mes: cuotas de préstamos (gasto con loanId) +
    // pagos/abonos que entran a cuentas de deuda o tarjetas (transferencia positiva).
    const debtAccountIds = accounts.filter((a) => ['credit_card', 'debt', 'loan'].includes(a.type)).map((a) => a.id);
    let debtPaidThisMonth = 0;
    {
      const loanPay = getDb().getFirstSync<{ s: number }>(
        `SELECT COALESCE(SUM(ABS(amount)),0) AS s FROM transactions
         WHERE deletedAt IS NULL AND type='expense' AND loanId IS NOT NULL AND date BETWEEN ? AND ?`,
        [from, to],
      )?.s ?? 0;
      let cardPay = 0;
      if (debtAccountIds.length) {
        const ph = debtAccountIds.map(() => '?').join(',');
        cardPay = getDb().getFirstSync<{ s: number }>(
          `SELECT COALESCE(SUM(amount),0) AS s FROM transactions
           WHERE deletedAt IS NULL AND type='transfer' AND amount > 0
             AND accountId IN (${ph}) AND date BETWEEN ? AND ?`,
          [...debtAccountIds, from, to],
        )?.s ?? 0;
      }
      debtPaidThisMonth = loanPay + cardPay;
    }

    let subscriptionsMonthly = 0;
    try {
      for (const r of getSubscriptions()) {
        if (r.type !== 'expense') continue;
        subscriptionsMonthly += r.amount * (MONTHLY_FACTOR[r.frequency] ?? 1);
      }
    } catch {
      /* noop */
    }

    let fixed: FixedMonthlySummary;
    try {
      fixed = fixedMonthlySummary();
    } catch {
      fixed = { periodKey: '', items: [], total: 0, paidTotal: 0, pendingTotal: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 };
    }

    let cash: AppState['cash'];
    try {
      const active = activeWithdrawals();
      cash = {
        active,
        totalRemaining: active.reduce((s, w) => s + w.remaining, 0),
        lastMonthLeftover: lastMonthLeftover(),
      };
    } catch {
      cash = { active: [], totalRemaining: 0, lastMonthLeftover: 0 };
    }

    const totalDebt = debtEntities + debtPeople;

    return {
      accounts,
      categories,
      loans,
      people,
      transactions,
      budgets,
      balances,
      totalAssets,
      totalDebt,
      netWorth: totalAssets + owedToMe - totalDebt,
      primaryAccountId,
      month: { income, expense, net: income - expense, transfers },
      summary: { debtEntities, debtPeople, owedToMe, subscriptionsMonthly, fixedMonthly: fixed.total, debtPaidThisMonth },
      fixed,
      cash,
      isPremium: getPrefs().premium,
      refresh,
    };
  }, [tick, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function bootstrap(): void {
  const db = getDb();
  seedDefaultCategories();
  // Migración de iconos: sanitiza los iconos viejos/inválidos guardados en la BD
  try {
    const cats = db.getAllSync<{ id: number; icon: string }>('SELECT id, icon FROM categories WHERE deletedAt IS NULL');
    for (const c of cats) {
      const safe = safeIcon(c.icon);
      if (safe !== c.icon) {
        db.runSync(`UPDATE categories SET icon = ?, syncState = 'pending' WHERE id = ?`, [safe, c.id]);
      }
    }
    const accts = db.getAllSync<{ id: number; icon: string }>('SELECT id, icon FROM accounts WHERE deletedAt IS NULL');
    for (const a of accts) {
      const safe = safeIcon(a.icon);
      if (safe !== a.icon) {
        db.runSync(`UPDATE accounts SET icon = ?, syncState = 'pending' WHERE id = ?`, [safe, a.id]);
      }
    }
  } catch {
    /* noop */
  }
  try {
    runDueRecurring();
  } catch {
    /* noop */
  }
  // Materializa el checklist de gastos fijos del mes en curso.
  try {
    getFixedForMonth();
  } catch {
    /* noop */
  }
  // Reprograma las notificaciones locales de suscripciones (async, sin bloquear el arranque).
  void syncSubscriptionNotifications();
  // Conecta los listeners de compra de Premium y restaura compras previas.
  initPremium();
  void restorePremium();
}
