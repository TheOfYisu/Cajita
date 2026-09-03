import React from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Field, Button, Label, ColorPicker, IconPicker, PickRow } from '@/src/components/ui';
import { CATEGORY_ICONS, IconName } from '@/src/theme';
import { getCategory, updateCategory, deleteCategory } from '@/src/services/categoryService';

export default function CategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cat = getCategory(parseInt(id ?? '0', 10));
  const { refresh } = useApp();
  const { colors } = useTheme();

  const [name, setName] = React.useState(cat?.name ?? '');
  const [color, setColor] = React.useState(cat?.color ?? '#6B7280');
  const [icon, setIcon] = React.useState<IconName>((cat?.icon as IconName) ?? 'pricetag');
  const [type, setType] = React.useState<'expense' | 'income'>(cat?.type === 'income' ? 'income' : 'expense');

  if (!cat) {
    return (
      <ModalScreen title="Categoría">
        <Text style={{ color: colors.text }}>No encontrada</Text>
      </ModalScreen>
    );
  }

  const save = () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    updateCategory(cat.id, { name: name.trim(), color, icon, type: cat.type === 'system' ? 'system' : type });
    refresh();
    router.back();
  };

  const remove = () => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteCategory(cat.id); refresh(); router.back(); } },
    ]);
  };

  return (
    <ModalScreen
      title="Editar categoría"
      footer={
        <View style={{ gap: 10 }}>
          <Button title="Guardar" onPress={save} />
          <Button title="Eliminar" variant="ghost" color={colors.negative} onPress={remove} />
        </View>
      }
    >
      <Card style={{ marginBottom: 12 }}>
        <Field label="Nombre" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>Vista previa del ícono y color</Text>
        </View>
      </Card>

      {cat.type !== 'system' ? (
        <Card style={{ padding: 8, marginBottom: 12 }}>
          <PickRow label="Gasto" selected={type === 'expense'} onPress={() => setType('expense')} />
          <PickRow label="Ingreso" selected={type === 'income'} onPress={() => setType('income')} />
        </Card>
      ) : null}

      <Label>Color</Label>
      <Card style={{ marginBottom: 12 }}>
        <ColorPicker value={color} onChange={setColor} />
      </Card>

      <Label>Ícono</Label>
      <Card>
        <IconPicker value={icon} onChange={setIcon} icons={CATEGORY_ICONS} color={color} />
      </Card>
    </ModalScreen>
  );
}
