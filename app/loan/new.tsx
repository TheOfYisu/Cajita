import React from "react";
import { Alert, View, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "@/src/store/appStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import {
  ModalScreen,
  Card,
  Field,
  Button,
  Label,
  PickRow,
  Select,
  SelectOption,
  parseCurrencyInput,
  calculateLoanTotals,
  formatMoney,
} from "@/src/components/ui";
import { DateField } from "@/src/components/DateField";
import { createLoan } from "@/src/services/loanService";
import { createPerson } from "@/src/services/personService";

const LOAN_TYPE_OPTS: SelectOption<string>[] = [
  { value: "libre_inversion", label: "Libre inversión / Consumo", icon: "cash", color: "#3B82F6" },
  { value: "tarjeta", label: "Tarjeta de crédito", icon: "card", color: "#EF4444" },
  { value: "hipotecario", label: "Hipotecario / Vivienda", icon: "home", color: "#10B981" },
  { value: "vehiculo", label: "Vehicular", icon: "car", color: "#F59E0B" },
  { value: "personal", label: "Préstamo personal", icon: "person", color: "#8B5CF6" },
  { value: "educativo", label: "Educativo", icon: "school", color: "#06B6D4" },
  { value: "comercial", label: "Comercial / Negocio", icon: "briefcase", color: "#6366F1" },
  { value: "otro", label: "Otro tipo", icon: "ellipsis-horizontal", color: "#6B7280" },
];

export default function NewLoanScreen() {
  const params = useLocalSearchParams<{ type?: string; kind?: string }>();
  const { refresh, people } = useApp();
  const { colors } = useTheme();

  const [type, setType] = React.useState<"borrowed" | "lent">(
    params.type === "lent" ? "lent" : "borrowed",
  );
  const [kind, setKind] = React.useState<"entity" | "person">(
    params.kind === "entity"
      ? "entity"
      : params.kind === "person"
        ? "person"
        : type === "lent"
          ? "person"
          : "entity",
  );

  const [loanType, setLoanType] = React.useState<string>("libre_inversion");
  const [entityName, setEntityName] = React.useState("");
  const [personId, setPersonId] = React.useState<number | null>(null);
  const [newPersonName, setNewPersonName] = React.useState("");
  const [total, setTotal] = React.useState("");
  const [offset, setOffset] = React.useState("");
  const [interestRate, setInterestRate] = React.useState("");
  const [installments, setInstallments] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState<number>(() => Date.now());

  const setTypeAndKind = (t: "borrowed" | "lent") => {
    setType(t);
    if (t === "lent") setKind("person");
  };

  const principalNum = parseCurrencyInput(total);
  const instNum = installments.trim() ? parseInt(installments.replace(/\D/g, ""), 10) : 1;
  const rateNum = interestRate.trim() ? parseFloat(interestRate.replace(",", ".")) : 0;

  const calc = React.useMemo(() => {
    return calculateLoanTotals(principalNum, instNum, rateNum);
  }, [principalNum, instNum, rateNum]);

  const save = () => {
    const t = parseCurrencyInput(total);
    if (!t || t <= 0) {
      Alert.alert("Monto inválido");
      return;
    }

    let pid: number | null = null;
    let name = "";
    if (kind === "entity") {
      if (!entityName.trim()) {
        Alert.alert("Escribe el nombre de la entidad");
        return;
      }
      name = entityName.trim();
    } else {
      if (personId === -1) {
        if (!newPersonName.trim()) {
          Alert.alert("Escribe el nombre de la persona");
          return;
        }
        const p = createPerson({ name: newPersonName.trim() });
        pid = p.id;
        name = p.name;
      } else if (personId) {
        pid = personId;
        name = people.find((p) => p.id === personId)?.name ?? "Persona";
      } else {
        Alert.alert("Selecciona una persona");
        return;
      }
    }

    const rNum = interestRate.trim() ? parseFloat(interestRate.replace(',', '.')) : null;
    const iNum = installments.trim() ? parseInt(installments.replace(/\D/g, ''), 10) : null;
    const finalOffset = offset.trim()
      ? parseCurrencyInput(offset)
      : calc.totalInterest > 0
        ? calc.totalInterest
        : 0;

    createLoan({
      name,
      type,
      counterpartyKind: kind,
      loanType,
      total: t,
      totalOffset: finalOffset,
      interestRate: rNum && !isNaN(rNum) ? rNum : null,
      installments: iNum && !isNaN(iNum) ? iNum : null,
      personId: pid,
      notes: description.trim(),
      startDate: date,
    });
    refresh();
    router.back();
  };

  return (
    <ModalScreen
      title="Nueva deuda / préstamo"
      footer={<Button title="Crear" onPress={save} />}
    >
      <Label>Tipo</Label>
      <Card style={{ padding: 8, marginBottom: 12 }}>
        <PickRow
          label="Debo (yo le debo)"
          icon="trending-down"
          iconColor={colors.negative}
          selected={type === "borrowed"}
          onPress={() => setTypeAndKind("borrowed")}
        />
        <PickRow
          label="Presté (me deben)"
          icon="trending-up"
          iconColor={colors.positive}
          selected={type === "lent"}
          onPress={() => setTypeAndKind("lent")}
        />
      </Card>

      <Label>
        {type === "lent" ? "¿A quién le prestaste?" : "¿A quién le debes?"}
      </Label>
      <Card style={{ padding: 8, marginBottom: 12 }}>
        {type === "borrowed" ? (
          <PickRow
            label="Una entidad / empresa (banco, financiera…)"
            icon="business"
            iconColor={colors.accent}
            selected={kind === "entity"}
            onPress={() => setKind("entity")}
          />
        ) : null}
        <PickRow
          label="Una persona"
          icon="person"
          iconColor={colors.accent}
          selected={kind === "person"}
          onPress={() => setKind("person")}
        />
      </Card>

      {kind === "entity" ? (
        <Card style={{ marginBottom: 12 }}>
          <Field
            label="Nombre de la entidad"
            value={entityName}
            onChangeText={setEntityName}
            placeholder="Ej: Banco Davivienda"
            autoFocus
          />
        </Card>
      ) : (
        <>
          <Card style={{ padding: 8, marginBottom: personId === -1 ? 0 : 12 }}>
            {people.map((p) => (
              <PickRow
                key={p.id}
                label={p.email ? `${p.name} · ${p.email}` : p.name}
                icon="person"
                iconColor={colors.accent}
                selected={personId === p.id}
                onPress={() => setPersonId(p.id)}
              />
            ))}
            <PickRow
              label="Nueva persona…"
              icon="person-add"
              iconColor={colors.accent}
              selected={personId === -1}
              onPress={() => setPersonId(-1)}
            />
          </Card>
          {personId === -1 ? (
            <Card style={{ marginTop: 10, marginBottom: 12 }}>
              <Field
                label="Nombre de la persona"
                value={newPersonName}
                onChangeText={setNewPersonName}
                placeholder="Ej: Carlos Gómez"
              />
            </Card>
          ) : null}
        </>
      )}

      <Card style={{ marginBottom: 12 }}>
        <Select
          label="Tipo de deuda o crédito"
          value={loanType}
          options={LOAN_TYPE_OPTS}
          onChange={setLoanType}
        />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Field
          label="Monto total"
          value={total}
          onChangeText={setTotal}
          keyboardType="numeric"
          prefix="$"
          big
        />
        <Field
          label="Número de cuotas (opcional)"
          value={installments}
          onChangeText={setInstallments}
          placeholder="Ej: 12, 24, 36..."
          keyboardType="numeric"
        />
        <Field
          label="Tasa de interés % (opcional)"
          value={interestRate}
          onChangeText={setInterestRate}
          placeholder="Ej: 1.8"
          keyboardType="decimal-pad"
          prefix="%"
        />
        <Field
          label="Intereses / ajuste en dinero (opcional)"
          value={offset}
          onChangeText={setOffset}
          placeholder={calc.totalInterest > 0 ? `Calculado: +$ ${formatMoney(calc.totalInterest, 'COP')}` : undefined}
          keyboardType="numeric"
          prefix="$"
        />
        <Field
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="¿Por qué debes / te deben?"
          multiline
        />
        <DateField label="Fecha" value={date} onChange={setDate} />
      </Card>

      {principalNum > 0 && (instNum > 1 || rateNum > 0) ? (
        <Card style={{ marginBottom: 12, backgroundColor: colors.accent + '18', borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13, marginBottom: 8 }}>
            PROYECCIÓN TOTAL A PAGAR
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Total a pagar:</Text>
            <Text style={{ color: colors.negative, fontSize: 24, fontWeight: '900' }}>
              {formatMoney(calc.totalPayment, 'COP')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cuota mensual ({instNum} cuota{instNum > 1 ? 's' : ''}):</Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
              {formatMoney(calc.installmentAmount, 'COP')} / mes
            </Text>
          </View>
          {calc.totalInterest > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Intereses estimados:</Text>
              <Text style={{ color: colors.negative, fontWeight: '700', fontSize: 13 }}>
                +{formatMoney(calc.totalInterest, 'COP')}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}
    </ModalScreen>
  );
}
