import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider as NavThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/src/store/appStore";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";
import { navTheme } from "@/src/theme";
import { AppLockGate } from "@/src/components/AppLockGate";
import { DbGate } from "@/src/components/DbGate";

function Navigator() {
  const { colors, dark } = useTheme();
  return (
    <NavThemeProvider value={navTheme(colors.accent, dark)}>
      <StatusBar style={dark ? "light" : "dark"} />
      <AppLockGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="account/new"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="account/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="transaction/new"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="transaction/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="transfer/new"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="loan/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="loan/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="person/new" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="person/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="category/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="subscription/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="fixed/pay/[paymentId]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="cash/index" options={{ presentation: "modal" }} />
          <Stack.Screen name="cash/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="cash/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="insight/[metric]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="import" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="settings/profile"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/appearance"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/categories"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/people"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/budgets"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/recurring"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="settings/security"
            options={{ presentation: "modal" }}
          />
        </Stack>
      </AppLockGate>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DbGate>
          <ThemeProvider>
            <AppProvider>
              <Navigator />
            </AppProvider>
          </ThemeProvider>
        </DbGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
