import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "../components/Toast";
import { loadPrefs, usePrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.lime, text: C.t1, border: "transparent" },
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // из хранилища настроек, а не из локального состояния: завершение
  // приветствия должно двигать эту же калитку
  const { onboarded } = usePrefs();

  useEffect(() => {
    loadPrefs()
      .catch(() => {})
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="index" />
            <Stack.Screen name="item/[id]" />
            <Stack.Screen name="settings" />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
