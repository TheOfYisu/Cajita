import React from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { getDb, setDbKey } from "../db/database";
import { ensureDbKey, ensureFreshEncryptedDb } from "../db/encryption";
import { bootstrap } from "../store/appStore";
import {
  initCloudBackup,
  restoreCloudBackupIfNeeded,
  backupNow,
} from "../services/cloudBackupService";
import { flushPendingShortcutTransactions } from "../services/iosShortcutsService";
import { LoadingScreen } from "./LoadingScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_LOADING_MS = 850;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Carga la clave de SQLCipher en memoria ANTES de montar los providers (que tocan la BD
 * de forma síncrona en su primer render). Muestra una pantalla de carga animada con el
 * estado de inicialización y hace un fade-out suave cuando la app está lista.
 *
 * En iOS intenta además restaurar el backup de iCloud si la BD local está vacía
 * (celular nuevo / reinstalación) y conecta el backup automático tras cada escritura.
 */
export function DbGate({ children }: { children: React.ReactNode }) {
  const [dbReady, setDbReady] = React.useState(false);
  const [overlayVisible, setOverlayVisible] = React.useState(true);
  const [progress, setProgress] = React.useState(0.15);
  const [statusText, setStatusText] = React.useState(
    "Descifrando bóveda local…"
  );
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const [overlayOpacity] = React.useState(() => new Animated.Value(1));
  const [overlayScale] = React.useState(() => new Animated.Value(1));
  const splashHiddenRef = React.useRef(false);

  const handleLayoutReady = React.useCallback(() => {
    if (!splashHiddenRef.current) {
      splashHiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const startedAt = Date.now();
      setError(null);
      setProgress(0.2);
      setStatusText("Descifrando bóveda local…");

      try {
        await ensureFreshEncryptedDb();
        const key = await ensureDbKey();
        setDbKey(key);

        if (cancelled) return;
        setProgress(0.55);
        setStatusText("Verificando respaldo en iCloud…");

        try {
          await restoreCloudBackupIfNeeded();
        } catch {
          /* restaurar no debe bloquear el arranque */
        }

        if (cancelled) return;
        setProgress(0.82);
        setStatusText("Preparando tus cuentas y movimientos…");

        try {
          bootstrap();
          flushPendingShortcutTransactions();
        } catch {
          /* bootstrap no debe bloquear el arranque */
        }

        // Conecta el backup automático después del bootstrap.
        try {
          initCloudBackup();
        } catch {
          /* noop */
        }

        // Backup inicial: sube el estado actual la primera vez que se abre la app.
        try {
          void backupNow(getDb());
        } catch {
          /* noop */
        }

        if (cancelled) return;
        setProgress(1);
        setStatusText("¡Todo listo!");

        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_LOADING_MS) {
          await delay(MIN_LOADING_MS - elapsed);
        }
        if (cancelled) return;

        // Monta los providers debajo del overlay y ejecuta el fade-out suave
        setDbReady(true);
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(overlayScale, {
            toValue: 1.03,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && !cancelled) {
            setOverlayVisible(false);
          }
        });
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
        }
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, overlayOpacity, overlayScale]);

  const handleRetry = React.useCallback(() => {
    overlayOpacity.setValue(1);
    overlayScale.setValue(1);
    setOverlayVisible(true);
    setAttempt((n) => n + 1);
  }, [overlayOpacity, overlayScale]);

  return (
    <View style={styles.root}>
      {dbReady ? children : null}
      {overlayVisible ? (
        <Animated.View
          pointerEvents={dbReady ? "none" : "auto"}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: overlayOpacity,
              transform: [{ scale: overlayScale }],
            },
          ]}
        >
          <LoadingScreen
            progress={progress}
            statusText={statusText}
            error={error}
            onRetry={handleRetry}
            onLayoutReady={handleLayoutReady}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#123F36",
  },
});
