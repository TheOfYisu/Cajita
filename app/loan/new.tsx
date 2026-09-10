import React from "react";
import { Alert } from "react-native";
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
} from "@/src/components/ui";
import { DateField } from "@/src/components/DateField";
import { createLoan } from "@/src/services/loanService";
import { createPerson } from "@/src/services/personService";

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

  const [entityName, setEntityName] = React.useState("");
  const [personId, setPersonId] = React.useState<number | null>(null);
  const [newPersonName, setNewPersonName] = React.useState("");
  const [total, setTotal] = React.useState("");
  const [offset, setOffset] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState<number>(Date.now());

  const setTypeAndKind = (t: "borrowed" | "lent") => {
    setType(t);
    if (t === "lent") setKind("person");
  };

  const save = () => {
    const t = parseFloat(total.replace(/[^\d.]/g, ""));
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

    createLoan({
      name,
      type,
      counterpartyKind: kind,
      total: t,
      totalOffset: offset ? parseFloat(offset.replace(/[^\d.]/g, "")) : 0,
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
        <Field
          label="Monto total"
          value={total}
          onChangeText={setTotal}
          keyboardType="numeric"
          prefix="$"
          big
        />
        <Field
          label="Intereses / ajuste (opcional)"
          value={offset}
          onChangeText={setOffset}
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
    </ModalScreen>
  );
}
