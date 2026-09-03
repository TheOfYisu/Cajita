import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, SectionTitle } from '@/src/components/ui';
import { safeIcon } from '@/src/theme';
import { createCategory } from '@/src/services/categoryService';

export default function CategoriesScreen() {
  const { categories, refresh } = useApp();
  const { colors } = useTheme();

  const add = () => {
    const c = createCategory({ name: 'Nueva categoría', type: 'expense' });
    refresh();
    router.push(`/category/${c.id}`);
  };

  const groups: { label: string; type: string }[] = [
    { label: 'Gastos', type: 'expense' },
    { label: 'Ingresos', type: 'income' },
    { label: 'Sistema', type: 'system' },
  ];

  return (
    <ModalScreen title="Categorías" footer={<Button title="Nueva categoría" icon="add" onPress={add} />}>
      {groups.map((g) => {
        const items = categories.filter((c) => c.type === g.type);
        if (items.length === 0) return null;
        return (
          <View key={g.type}>
            <SectionTitle>{g.label}</SectionTitle>
            <Card style={{ padding: 8, marginBottom: 12 }}>
              {items.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/category/${c.id}`)}
                  style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, pressed && { opacity: 0.6 }]}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={safeIcon(c.icon)} size={16} color={c.color} />
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' }}>{c.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
    </ModalScreen>
  );
}
