import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/src/store/appStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import {
  ModalScreen,
  Card,
  Button,
  Chip,
  EmptyState,
  StatusBadge,
  ProgressBar,
  formatMoney,
} from "@/src/components/ui";
import { safeIcon } from "@/src/theme";
import {
  getSubscriptions,
  frequencyLabel,
  daysUntil,
  getFixedForMonth,
  FixedStatus,
} from "@/src/services/recurringService";

const STATUS_META: Record<
  FixedStatus,
  {
    label: string;
    icon: string;
    key: "positive" | "warning" | "negative" | "textMuted";
  }
> = {
  paid: { label: "Pagado", icon: "checkmark-circle", key: "positive" },
  pending: { label: "Pendiente", icon: "ellipse-outline", key: "warning" },
  overdue: { label: "Vencido", icon: "alert-circle", key: "negative" },
  skipped: { label: "Omitido", icon: "remove-circle", key: "textMuted" },
};

export default function RecurringScreen() {
  const { categories, people } = useApp();
  const { colors, prefs } = useTheme();
  const [tab, setTab] = React.useState<"subs" | "fixed">("subs");

  const subs = getSubscriptions(true).filter((r) => !r.isArchived);
  const fixed = getFixedForMonth();

  const subsMonthly = subs
    .filter((r) => r.type === "expense")
    .reduce((s, r) => {
      const perMonth =
        r.frequency === "weekly"
          ? r.amount * 4.33
          : r.frequency === "biweekly"
            ? r.amount * 2.17
            : r.frequency === "quarterly"
              ? r.amount / 3
              : r.frequency === "yearly"
                ? r.amount / 12
                : r.amount;
      return s + perMonth;
    }, 0);

  const fixedTotal = fixed.reduce(
    (s, it) => s + Math.abs(it.recurring.amount),
    0,
  );
  const fixedPaid = fixed
    .filter((it) => it.status === "paid")
    .reduce((s, it) => s + (it.payment.amount ?? 0), 0);
  const fixedPaidCount = fixed.filter((it) => it.status === "paid").length;
  const fixedDoneCount = fixed.filter(
    (it) => it.status === "paid" || it.status === "skipped",
  ).length;

  return (
    <ModalScreen
      title="Suscripciones y gastos fijos"
      footer={
        tab === "subs" ? (
          <Button
            title="Nueva suscripción"
            icon="add"
            onPress={() => router.push("/subscription/new?kind=subscription")}
          />
        ) : (
          <Button
            title="Nuevo gasto fijo"
            icon="add"
            onPress={() => router.push("/subscription/new?kind=service")}
          />
        )
      }
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <Chip
          label="Suscripciones"
          active={tab === "subs"}
          onPress={() => setTab("subs")}
        />
        <Chip
          label="Gastos fijos"
          active={tab === "fixed"}
          onPress={() => setTab("fixed")}
        />
      </View>

      {tab === "subs" ? (
        subs.length === 0 ? (
          <EmptyState
            icon="repeat"
            title="Sin suscripciones"
            subtitle="Agrega Netflix, el gimnasio, Spotify… y te avisamos antes de cada cobro."
          />
        ) : (
          <>
            <Card
              style={{
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Gasto mensual estimado
              </Text>
              <Text style={{ color: colors.negative, fontWeight: "800" }}>
                {formatMoney(subsMonthly, prefs.currency, prefs.hideBalances)}
              </Text>
            </Card>

            {subs.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              const personName = people.find((p) => p.id === r.personId)?.name;
              const d = daysUntil(r.nextRun);
              const soon = d <= r.leadDays;
              return (
                <Card
                  key={r.id}
                  onPress={() => router.push(`/subscription/${r.id}`)}
                  style={{ marginBottom: 8 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: (cat?.color ?? colors.accent) + "22",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={safeIcon(
                          cat?.icon,
                          r.type === "income" ? "arrow-up" : "repeat",
                        )}
                        size={17}
                        color={cat?.color ?? colors.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: colors.text, fontWeight: "700" }}
                        numberOfLines={1}
                      >
                        {r.title}
                      </Text>
                      <Text
                        style={{
                          color: soon ? colors.warning : colors.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {frequencyLabel(r.frequency)} ·{" "}
                        {d <= 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`}
                        {r.notify ? "" : " · sin aviso"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color:
                          r.type === "income" ? colors.positive : colors.text,
                        fontWeight: "800",
                      }}
                    >
                      {formatMoney(
                        r.amount,
                        prefs.currency,
                        prefs.hideBalances,
                      )}
                    </Text>
                  </View>
                  {personName ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <Ionicons name="people" size={13} color={colors.accent} />
                      <Text
                        style={{ color: colors.textMuted, fontSize: 12 }}
                        numberOfLines={1}
                      >
                        Compartida con {personName}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </>
        )
      ) : fixed.length === 0 ? (
        <EmptyState
          icon="home"
          title="Sin gastos fijos"
          subtitle="Agrega el arriendo, la administración, agua, luz, gas, internet… Cada mes te aparecen para marcarlos como pagados."
        />
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Este mes
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {fixedPaidCount} de {fixed.length} pagados
              </Text>
            </View>
            <ProgressBar
              pct={fixed.length ? fixedDoneCount / fixed.length : 0}
              color={colors.positive}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Pagado{" "}
                {formatMoney(fixedPaid, prefs.currency, prefs.hideBalances)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Estimado total{" "}
                {formatMoney(fixedTotal, prefs.currency, prefs.hideBalances)}
              </Text>
            </View>
          </Card>

          {fixed.map((it) => {
            const r = it.recurring;
            const cat = categories.find((c) => c.id === r.categoryId);
            const meta = STATUS_META[it.status];
            const dueTxt = new Date(it.payment.dueDate).toLocaleDateString(
              "es-CO",
              { day: "2-digit", month: "short" },
            );
            return (
              <Card key={r.id} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: (cat?.color ?? colors.accent) + "22",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={safeIcon(cat?.icon, "home")}
                      size={17}
                      color={cat?.color ?? colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: colors.text, fontWeight: "700" }}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    <Text
                      style={{
                        color:
                          it.status === "overdue"
                            ? colors.negative
                            : colors.textMuted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      Vence {dueTxt}
                      {r.variableAmount ? " · monto variable" : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      {formatMoney(
                        it.displayAmount,
                        prefs.currency,
                        prefs.hideBalances,
                      )}
                    </Text>
                    <StatusBadge
                      label={meta.label}
                      color={colors[meta.key]}
                      icon={safeIcon(meta.icon)}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {it.status === "paid" || it.status === "skipped" ? (
                    <Button
                      title="Editar pago"
                      variant="secondary"
                      style={{ flex: 1, paddingVertical: 10 }}
                      onPress={() =>
                        router.push(`/fixed/pay/${it.payment.id}` as never)
                      }
                    />
                  ) : (
                    <Button
                      title="Marcar pagado"
                      style={{ flex: 1, paddingVertical: 10 }}
                      onPress={() =>
                        router.push(`/fixed/pay/${it.payment.id}` as never)
                      }
                    />
                  )}
                  <Button
                    title="Editar"
                    variant="ghost"
                    style={{ paddingVertical: 10 }}
                    onPress={() => router.push(`/subscription/${r.id}`)}
                  />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ModalScreen>
  );
}
