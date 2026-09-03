import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: 'Cartera', tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Movimientos', tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Análisis', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }}
      />
      {/* Rutas accesibles pero fuera de la barra de pestañas */}
      <Tabs.Screen name="loans" options={{ href: null, title: 'Deudas' }} />
      <Tabs.Screen name="people" options={{ href: null, title: 'Personas' }} />
    </Tabs>
  );
}
