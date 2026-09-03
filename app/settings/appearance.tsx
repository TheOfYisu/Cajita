import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Label, PickRow } from '@/src/components/ui';
import { ACCENT_COLORS } from '@/src/theme';

export default function AppearanceScreen() {
  const { prefs, updatePrefs, colors } = useTheme();

  const modes: { key: 'system' | 'light' | 'dark'; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'system', label: 'Automático', icon: 'phone-portrait' },
    { key: 'light', label: 'Claro', icon: 'sunny' },
    { key: 'dark', label: 'Oscuro', icon: 'moon' },
  ];

  return (
    <ModalScreen title="Apariencia">
      <Label>Color de acento</Label>
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {ACCENT_COLORS.map((c) => {
            const active = prefs.accentKey === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => updatePrefs({ accentKey: c.key })}
                style={{ alignItems: 'center', gap: 4, width: 56 }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: c.value,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: active ? 3 : 0,
                    borderColor: colors.text,
                  }}
                >
                  {active ? <Ionicons name="checkmark" size={18} color="#FFF" /> : null}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Label>Tema</Label>
      <Card style={{ padding: 8 }}>
        {modes.map((m) => (
          <PickRow key={m.key} label={m.label} icon={m.icon} selected={prefs.themeMode === m.key} onPress={() => updatePrefs({ themeMode: m.key })} />
        ))}
      </Card>
    </ModalScreen>
  );
}
