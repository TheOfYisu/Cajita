import React from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

export interface LoadingScreenProps {
  /** Progreso entre 0 y 1 */
  progress: number;
  /** Mensaje de estado actual */
  statusText: string;
  /** Mensaje de error si falló la inicialización */
  error?: string | null;
  /** Callback para reintentar en caso de error */
  onRetry?: () => void;
  /** Se invoca cuando el contenedor principal ya se pintó en pantalla */
  onLayoutReady?: () => void;
}

export function LoadingScreen({
  progress,
  statusText,
  error,
  onRetry,
  onLayoutReady,
}: LoadingScreenProps) {
  const [pulseAnim] = React.useState(() => new Animated.Value(0));
  const [entranceAnim] = React.useState(() => new Animated.Value(0));
  const [progressAnim] = React.useState(() => new Animated.Value(progress));

  React.useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [entranceAnim, pulseAnim]);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.max(0.08, Math.min(1, progress)),
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const logoScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.16],
  });

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.06],
  });

  const contentTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container} onLayout={onLayoutReady}>
      <StatusBar style="light" />

      {/* Círculos decorativos de fondo */}
      <View style={styles.ambientTopRight} pointerEvents="none" />
      <View style={styles.ambientBottomLeft} pointerEvents="none" />

      <View style={styles.centerBlock}>
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.brandTextContainer,
            {
              opacity: entranceAnim,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>CAJITA</Text>
          <View style={styles.goldDivider} />
          <Text style={styles.subtitle}>FINANZAS PERSONALES · LOCAL-FIRST</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.bottomBlock,
          {
            opacity: entranceAnim,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="alert-circle" size={20} color="#F87171" />
              <Text style={styles.errorTitle}>
                No se pudo abrir la base de datos
              </Text>
            </View>
            <Text style={styles.errorMessage} numberOfLines={3}>
              {error}
            </Text>
            {onRetry ? (
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="refresh" size={16} color="#123F36" />
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: barWidth }]}
              />
            </View>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}

        <View style={styles.securityBadge}>
          <Ionicons
            name="lock-closed"
            size={12}
            color="#D4A84B"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.securityText}>
            Bóveda cifrada SQLCipher AES-256 en tu dispositivo
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#123F36",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 46,
    overflow: "hidden",
  },
  ambientTopRight: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#1E6655",
    opacity: 0.35,
  },
  ambientBottomLeft: {
    position: "absolute",
    bottom: -140,
    left: -110,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#1B5849",
    opacity: 0.3,
  },
  centerBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  glowRing: {
    position: "absolute",
    width: 124,
    height: 124,
    borderRadius: 34,
    backgroundColor: "#37C98A",
  },
  logoImage: {
    width: 310,
    height: 310,
  },
  brandTextContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 7,
    color: "#F6F1E7",
    marginLeft: 7, // compensa el letterSpacing al centrar
  },
  goldDivider: {
    width: 68,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#D4A84B",
    marginVertical: 10,
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.2,
    color: "rgba(246, 241, 231, 0.72)",
    textAlign: "center",
  },
  bottomBlock: {
    width: "100%",
    alignItems: "center",
    gap: 22,
  },
  progressSection: {
    width: "100%",
    maxWidth: 240,
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(246, 241, 231, 0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#37C98A",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(246, 241, 231, 0.85)",
    textAlign: "center",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 75, 0.3)",
  },
  securityText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(246, 241, 231, 0.75)",
  },
  errorCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    alignItems: "center",
    gap: 8,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FCA5A5",
  },
  errorMessage: {
    fontSize: 12,
    color: "rgba(246, 241, 231, 0.8)",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F6F1E7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#123F36",
  },
});
