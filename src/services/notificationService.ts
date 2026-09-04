import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSubscriptions, nextOccurrences, frequencyLabel, getFixedForMonth } from './recurringService';
import { getPerson } from './personService';
import { getPrefs } from './prefsService';
import { getDb } from '../db/database';

let configured = false;

function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configure();
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('subscriptions', {
        name: 'Suscripciones y pagos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${Math.round(amount)}`;
  }
}

function at9am(ts: number): Date {
  const d = new Date(ts);
  d.setHours(9, 0, 0, 0);
  return d;
}

const TAG = 'cajita-sub';

/**
 * Cancela y reprograma todas las notificaciones locales de suscripciones/recurrentes.
 * Para cada cobro futuro programa: aviso con `leadDays` de antelación, aviso el día
 * anterior y aviso el mismo día.
 */
export async function syncSubscriptionNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!getPrefs().notificationsEnabled) {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        all
          .filter((s) => (s.content.data as { tag?: string } | undefined)?.tag === TAG)
          .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
      );
    } catch {
      /* noop */
    }
    return;
  }
  // No pedir permiso si aún no hay ninguna suscripción con aviso.
  const items = getSubscriptions().filter((r) => r.notify && r.type === 'expense');
  const fixedDue = getFixedForMonth().filter(
    (it) => it.recurring.notify && (it.status === 'pending' || it.status === 'overdue'),
  );
  if (items.length === 0 && fixedDue.length === 0) {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        all
          .filter((s) => (s.content.data as { tag?: string } | undefined)?.tag === TAG)
          .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
      );
    } catch {
      /* noop */
    }
    return;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  try {
    const prefs = getPrefs();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((s) => (s.content.data as { tag?: string } | undefined)?.tag === TAG)
        .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
    );

    const nowTs = Date.now();

    for (const r of items) {
      const person = r.personId ? getPerson(r.personId) : null;
      const shared = person ? `\nCompartida con ${person.name}${person.email ? ` · ${person.email}` : ''}` : '';
      const occ = nextOccurrences(r, 2);

      for (const due of occ) {
        const lead = Math.max(1, r.leadDays);
        const points: { when: Date; title: string; body: string }[] = [];

        const leadDate = at9am(due - lead * 86400000);
        if (leadDate.getTime() > nowTs && lead > 1) {
          points.push({
            when: leadDate,
            title: `${r.title} se cobra pronto`,
            body: `En ${lead} días se cobra ${fmt(r.amount, prefs.currency)} (${frequencyLabel(r.frequency)}).${shared}`,
          });
        }

        const dayBefore = at9am(due - 86400000);
        if (dayBefore.getTime() > nowTs) {
          points.push({
            when: dayBefore,
            title: `Mañana: ${r.title}`,
            body: `Mañana se cobra ${fmt(r.amount, prefs.currency)}.${shared}`,
          });
        }

        const sameDay = at9am(due);
        if (sameDay.getTime() > nowTs) {
          points.push({
            when: sameDay,
            title: `Hoy: ${r.title}`,
            body: `Hoy se cobra ${fmt(r.amount, prefs.currency)}.${shared}`,
          });
        }

        for (const p of points) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: p.title,
              body: p.body,
              data: { tag: TAG, recurringId: r.id },
              ...(Platform.OS === 'android' ? { channelId: 'subscriptions' } : null),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: p.when,
            },
          });
        }
      }
    }

    // Recordatorios de gastos fijos / servicios pendientes del mes.
    for (const it of fixedDue) {
      const r = it.recurring;
      const due = it.payment.dueDate;
      const lead = Math.max(1, r.leadDays);
      const points: { when: Date; title: string; body: string }[] = [];
      const est = r.variableAmount ? `~${fmt(r.amount, prefs.currency)}` : fmt(r.amount, prefs.currency);

      const leadDate = at9am(due - lead * 86400000);
      if (leadDate.getTime() > nowTs && lead > 1) {
        points.push({
          when: leadDate,
          title: `${r.title}: vence pronto`,
          body: `En ${lead} días toca pagar ${r.title} (${est}). Márcalo como pagado cuando lo hagas.`,
        });
      }
      const sameDay = at9am(due);
      if (sameDay.getTime() > nowTs) {
        points.push({
          when: sameDay,
          title: `Hoy vence: ${r.title}`,
          body: `Hoy toca pagar ${r.title} (${est}).`,
        });
      }
      for (const p of points) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: p.title,
            body: p.body,
            data: { tag: TAG, recurringId: r.id, paymentId: it.payment.id },
            ...(Platform.OS === 'android' ? { channelId: 'subscriptions' } : null),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when },
        });
      }
    }

    getDb().runSync(
      `INSERT INTO sync_metadata (key, value) VALUES ('notif_synced_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(Date.now())],
    );
  } catch {
    /* noop */
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const granted = await ensureNotificationPermissions();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Cajita', body: 'Las notificaciones están activas ✅', data: { tag: TAG } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
  return true;
}
