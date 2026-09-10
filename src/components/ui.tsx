import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  Switch,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeProvider";
import { IconName, SWATCHES, safeIcon } from "../theme";

export function formatMoney(v: number, currency = "COP", hide = false): string {
  if (hide) return "••••••";
  const abs = Math.abs(v);
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return v < 0 ? `-${formatted}` : formatted;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ["top"],
  fab,
  onFabPress,
  fabIcon = "add",
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom")[];
  fab?: React.ReactNode;
  onFabPress?: () => void;
  fabIcon?: IconName;
}) {
  const { colors } = useTheme();
  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { padding: 16, paddingBottom: onFabPress || fab ? 96 : 48 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 16 }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {inner}
      {onFabPress ? (
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            onFabPress();
          }}
          style={({ pressed }) => [
            {
              position: "absolute",
              right: 20,
              bottom: 24,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name={fabIcon} size={26} color={colors.onAccent} />
        </Pressable>
      ) : null}
      {fab}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  onClose,
  right,
}: {
  title: string;
  onClose?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable onPress={onClose ?? (() => router.back())} hitSlop={10}>
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
        {title}
      </Text>
      <View style={{ minWidth: 24, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, () => setVisible(true));
    const h = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  return visible;
}

export function ModalScreen({
  title,
  children,
  footer,
  onClose,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  headerRight?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <ScreenHeader
          title={title}
          onClose={onClose}
          right={
            keyboardVisible ? (
              <Pressable
                onPress={() => Keyboard.dismiss()}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Ionicons name="chevron-down" size={16} color={colors.accent} />
                <Text
                  style={{
                    color: colors.accent,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  Listo
                </Text>
              </Pressable>
            ) : (
              headerRight
            )
          }
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: keyboardVisible ? 12 : insets.bottom + 12,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors, radius } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, style, pressed && { opacity: 0.7 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        {
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 10,
          marginTop: 6,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: colors.textMuted,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoFocus,
  big,
  prefix,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "decimal-pad"
    | "numeric"
    | "email-address"
    | "phone-pad";
  multiline?: boolean;
  autoFocus?: boolean;
  big?: boolean;
  prefix?: string;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: 12,
        }}
      >
        {prefix ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: big ? 22 : 15,
              fontWeight: "700",
            }}
          >
            {prefix}{" "}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: big ? 24 : 15,
            fontWeight: big ? "800" : "500",
            paddingVertical: multiline ? 12 : big ? 14 : 12,
            minHeight: multiline ? 120 : undefined,
            textAlignVertical: multiline ? "top" : "center",
            ...(Platform.OS === "web"
              ? ({ outlineStyle: "none" } as object)
              : null),
          }}
        />
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  color,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius } = useTheme();
  const accent = color ?? colors.accent;
  const bg =
    variant === "primary"
      ? accent
      : variant === "danger"
        ? colors.negative
        : variant === "secondary"
          ? colors.surfaceAlt
          : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : variant === "secondary"
        ? colors.text
        : accent;
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          backgroundColor: bg,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: accent,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
  icon?: IconName;
}) {
  const { colors, radius } = useTheme();
  const c = color ?? colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: active ? c : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? c : colors.border,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? "#FFF" : colors.textMuted}
        />
      ) : null}
      <Text
        style={{
          color: active ? "#FFF" : colors.text,
          fontWeight: "600",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PickRow({
  label,
  selected,
  onPress,
  icon,
  iconColor,
  right,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  iconColor?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: (iconColor ?? colors.accent) + "22",
          }}
        >
          <Ionicons
            name={safeIcon(String(icon))}
            size={17}
            color={iconColor ?? colors.accent}
          />
        </View>
      ) : null}
      <Text
        style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "500" }}
      >
        {label}
      </Text>
      {right ??
        (selected !== undefined ? (
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={selected ? colors.accent : colors.border}
          />
        ) : null)}
    </Pressable>
  );
}

export interface SelectOption<T> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: IconName;
  color?: string;
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar…",
  sheetTitle,
}: {
  label?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  sheetTitle?: string;
}) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value) ?? null;

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 13,
        }}
      >
        {current?.icon || current?.color ? (
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: (current.color ?? colors.accent) + "22",
            }}
          >
            <Ionicons
              name={safeIcon(String(current.icon ?? "ellipse"))}
              size={14}
              color={current.color ?? colors.accent}
            />
          </View>
        ) : null}
        <Text
          style={{
            flex: 1,
            color: current ? colors.text : colors.textMuted,
            fontSize: 15,
            fontWeight: current ? "600" : "400",
          }}
          numberOfLines={1}
        >
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: "flex-end",
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 8,
              paddingBottom: 28,
              maxHeight: "75%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.border,
                }}
              />
            </View>
            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                fontSize: 16,
                paddingHorizontal: 20,
                paddingBottom: 8,
              }}
            >
              {sheetTitle ?? label ?? "Seleccionar"}
            </Text>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 8,
              }}
            >
              {options.map((o) => {
                const sel = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderRadius: radius.md,
                        backgroundColor: sel
                          ? colors.accent + "18"
                          : "transparent",
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    {o.icon || o.color ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: (o.color ?? colors.accent) + "22",
                        }}
                      >
                        <Ionicons
                          name={safeIcon(String(o.icon ?? "ellipse"))}
                          size={16}
                          color={o.color ?? colors.accent}
                        />
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: sel ? "700" : "500",
                        }}
                      >
                        {o.label}
                      </Text>
                      {o.sublabel ? (
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                            marginTop: 1,
                          }}
                        >
                          {o.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {sel ? (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              {options.length === 0 ? (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 14,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  Sin opciones
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Toggle({
  label,
  hint,
  value,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "500" }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginVertical: 4,
      }}
    />
  );
}

export function ColorPicker({
  value,
  onChange,
  colors: swatches = SWATCHES,
}: {
  value: string;
  onChange: (c: string) => void;
  colors?: string[];
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {swatches.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c,
            borderWidth: value.toLowerCase() === c.toLowerCase() ? 3 : 0,
            borderColor: "#FFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value.toLowerCase() === c.toLowerCase() ? (
            <Ionicons name="checkmark" size={16} color="#FFF" />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function IconPicker({
  value,
  onChange,
  icons,
  color,
}: {
  value: string;
  onChange: (i: IconName) => void;
  icons: IconName[];
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {icons.map((ic) => {
        const active = ic === value;
        return (
          <Pressable
            key={ic}
            onPress={() => onChange(ic)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? color : colors.surfaceAlt,
              borderWidth: 1,
              borderColor: active ? color : colors.border,
            }}
          >
            <Ionicons
              name={ic}
              size={19}
              color={active ? "#FFF" : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, pct));
  const over = pct > 1;
  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surfaceAlt,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${clamped * 100}%`,
          borderRadius: 4,
          backgroundColor: over ? colors.negative : (color ?? colors.accent),
        }}
      />
    </View>
  );
}

export function StatusBadge({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: IconName;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: color + "22",
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceAlt,
        }}
      >
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Money({
  value,
  currency = "COP",
  hide = false,
  style,
  colored = false,
}: {
  value: number;
  currency?: string;
  hide?: boolean;
  style?: StyleProp<TextStyle>;
  colored?: boolean;
}) {
  const { colors } = useTheme();
  const color = colored
    ? value < 0
      ? colors.negative
      : colors.positive
    : colors.text;
  return (
    <Text style={[{ color, fontWeight: "700" }, style]}>
      {formatMoney(value, currency, hide)}
    </Text>
  );
}
